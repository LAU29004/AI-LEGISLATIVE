"""
prompt_compressor.py
====================
Production-grade token compression for the AI Legislative Analyzer.
Intel Unnati GenAI for GenZ — Token Compression Module

TWO CONVERSATION MODES
----------------------
MODE A — PDF Upload
    Turn 1 : user sends a PDF  →  compress it  →  open a session
    Turn 2+: user asks questions about it  →  each question gets a
             section-filtered prompt (only relevant sections sent to LLM)

MODE B — No PDF  (general / DB-backed)
    Turn 1+: user asks any question  →  query the bill catalogue
             from DB  →  pull only relevant compressed bills  →
             build a lean context prompt  →  persistent chat memory

COMPRESSION STRATEGY
--------------------
Layer 1  Structural strip      regex, zero cost
Layer 2  Semantic dedup        sentence-transformers (local, no API)
Layer 3  Extractive ranking    TF-IDF + legal keyword boost
Layer 4  Section-filtered      only relevant sections reach the LLM

TOKEN REDUCTION
---------------
Raw PDF          ~100 000 tokens
After L1-L3      ~4 000  tokens  (25x compression, stored in DB)
After L4 filter  ~400    tokens  (125x total, what LLM actually sees)

PUBLIC API
----------
    session = CompressionSession()

    # Mode A — PDF upload
    result  = session.ingest_pdf(pdf_bytes, filename, first_question)
    result  = session.chat(question)

    # Mode B — No PDF
    result  = session.chat(question, bill_catalogue=catalogue)

    # result shape (always the same):
    {
        "prompt"       : str,   # send this to your LLM
        "token_count"  : int,   # tokens in the prompt
        "sections_used": list,  # which bill sections were included
        "mode"         : str,   # "pdf" | "general"
        "session_id"   : str,
    }
"""

from __future__ import annotations

import os
import re
import uuid
import json
import logging
import tempfile
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import tiktoken
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

try:
    import pdfplumber
    import pytesseract
except ImportError:
    pdfplumber = None   # type: ignore
    pytesseract = None  # type: ignore

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="[%(asctime)s] %(levelname)s %(name)s — %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
)
log = logging.getLogger("prompt_compressor")

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────
EMBEDDING_MODEL   = "all-MiniLM-L6-v2"   # 80 MB, CPU-friendly
DEDUP_THRESHOLD   = 0.92                  # cosine similarity cutoff
KEEP_RATIO        = 0.40                  # extractive: keep top 40% sentences
MAX_HISTORY_TURNS = 6                     # rolling chat window kept in prompt
MAX_CATALOGUE     = 6                     # max bills included for Mode B

SYSTEM_PROMPT = (
    "You are a legal simplification assistant for Indian citizens. "
    "Answer clearly in simple English. Be concise. Avoid legal jargon. "
    "Cite section names when relevant."
)

# ─────────────────────────────────────────────────────────────────────────────
# Section taxonomy
# ─────────────────────────────────────────────────────────────────────────────
SECTION_KEYWORDS: dict[str, list[str]] = {
    "definitions":      ["define", "meaning", "means", "what is", "term", "called"],
    "penalties":        ["penalty", "fine", "punish", "offence", "jail",
                         "imprisonment", "liable", "crore", "lakh", "consequence"],
    "citizen_rights":   ["right", "entitle", "benefit", "protect", "freedom",
                         "citizen", "my right", "can i", "allowed"],
    "obligations":      ["duty", "obligat", "must", "comply", "requirement",
                         "responsible", "shall", "company must"],
    "regulatory_body":  ["board", "authority", "tribunal", "commission",
                         "who enforces", "committee", "regulator"],
    "amendments":       ["amend", "change", "replace", "repeal", "modify",
                         "update", "new", "old law"],
    "appeal_mechanism": ["appeal", "grievance", "complain", "redress",
                         "challenge", "dispute", "object"],
    "schedules":        ["schedule", "annexure", "list", "appendix", "form"],
    "general":          [],
}

LEGAL_SIGNAL_WORDS = [
    "shall", "penalty", "offence", "right", "obligation", "liable",
    "prohibited", "authority", "citizen", "fine", "imprisonment",
    "board", "tribunal", "appeal", "amendment", "repeal", "section",
    "data", "privacy", "compliance", "regulation", "enforcement",
    "notwithstanding", "pursuant", "thereof", "herein",
]

BOILERPLATE_PATTERNS = [
    r"(?i)be it enacted by parliament.*?following.*?enacted",
    r"(?i)the\s+gazette\s+of\s+india.*?\n",
    r"(?i)ministry of law and justice.*?\n",
    r"(?i)assented to by the president.*?\n",
    r"(?i)short title.*?commencement.*?\n{1,3}",
    r"\b\d{1,2}(?:st|nd|rd|th)\s+day\s+of\s+\w+,?\s+\d{4}\b",
    r"(?i)sd/-.*?\n",
    r"(?i)secretary to the government.*?\n",
    r"(?i)no\.\s*\d+[-/]\d+.*?\n",
    r"\[.*?see\s+section.*?\]",
    r"(?i)statement of objects and reasons.*",
]

SECTION_HEADING_PATTERNS = [
    (r"(?i)chapter\s+[ivxlc\d]+.*?definition",            "definitions"),
    (r"(?i)chapter\s+[ivxlc\d]+.*?penalt|offence",        "penalties"),
    (r"(?i)right[s]?\s+of\s+data|right[s]?\s+of\s+citizen","citizen_rights"),
    (r"(?i)duties|obligations?\s+of",                      "obligations"),
    (r"(?i)data protection board|authority|tribunal",      "regulatory_body"),
    (r"(?i)amendment|repeal",                              "amendments"),
    (r"(?i)appeal|grievance",                              "appeal_mechanism"),
    (r"(?i)schedule|annexure",                             "schedules"),
]

# ─────────────────────────────────────────────────────────────────────────────
# Lazy-loaded singletons
# ─────────────────────────────────────────────────────────────────────────────
_embed_model: Optional[SentenceTransformer] = None
_tokenizer:   Optional[tiktoken.Encoding]   = None


def _get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        log.info("Loading embedding model %s …", EMBEDDING_MODEL)
        _embed_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embed_model


def _get_tokenizer() -> tiktoken.Encoding:
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = tiktoken.get_encoding("cl100k_base")
    return _tokenizer


def count_tokens(text: str) -> int:
    return len(_get_tokenizer().encode(text))


# ─────────────────────────────────────────────────────────────────────────────
# Data classes
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class CompressedBill:
    """Stores one bill's compressed representation.
    This is what gets saved to your DB after the scheduler runs."""
    title:              str
    year:               str
    original_tokens:    int
    compressed_tokens:  int
    compression_ratio:  float
    sections:           dict[str, str]   # label -> compressed text
    source:             str = "upload"   # "upload" | "db"
    bill_id:            Optional[str] = None


@dataclass
class ChatTurn:
    role:    str   # "user" | "assistant"
    content: str


@dataclass
class Session:
    session_id: str                    = field(default_factory=lambda: str(uuid.uuid4())[:8])
    mode:       str                    = "general"   # "pdf" | "general"
    bill:       Optional[CompressedBill] = None
    history:    list[ChatTurn]         = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 1 — Structural strip  (regex, zero cost)
# ─────────────────────────────────────────────────────────────────────────────
def _layer1_strip(text: str) -> str:
    for pattern in BOILERPLATE_PATTERNS:
        text = re.sub(pattern, " ", text, flags=re.DOTALL)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2 — Semantic deduplication  (local model, no API cost)
# ─────────────────────────────────────────────────────────────────────────────
def _layer2_dedup(text: str) -> str:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 40]
    if len(sentences) < 2:
        return text

    model      = _get_embed_model()
    embeddings = model.encode(sentences, batch_size=64, show_progress_bar=False)
    sim        = cosine_similarity(embeddings)

    kept:    list[str] = []
    dropped: set[int]  = set()
    for i, sent in enumerate(sentences):
        if i in dropped:
            continue
        kept.append(sent)
        for j in range(i + 1, len(sentences)):
            if j not in dropped and sim[i][j] >= DEDUP_THRESHOLD:
                dropped.add(j)

    log.debug("Dedup: %d → %d sentences (dropped %d)", len(sentences), len(kept), len(dropped))
    return " ".join(kept)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3 — Extractive ranking  (TF-IDF + legal keyword boost, no API cost)
# ─────────────────────────────────────────────────────────────────────────────
def _layer3_extract(text: str, keep_ratio: float = KEEP_RATIO) -> str:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 30]
    if len(sentences) < 5:
        return text

    vectorizer   = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(sentences)
    scores       = np.array(tfidf_matrix.sum(axis=1)).flatten()

    for i, sent in enumerate(sentences):
        hits = sum(1 for w in LEGAL_SIGNAL_WORDS if w in sent.lower())
        scores[i] += hits * 0.3

    n_keep      = max(5, int(len(sentences) * keep_ratio))
    top_indices = sorted(np.argsort(scores)[-n_keep:])
    return " ".join(sentences[i] for i in top_indices)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4 — Structured section assembly
# ─────────────────────────────────────────────────────────────────────────────
def _classify_paragraph(text: str) -> str:
    for pattern, label in SECTION_HEADING_PATTERNS:
        if re.search(pattern, text):
            return label
    return "general"


def _layer4_assemble(
    compressed_text: str,
    raw_text:        str,
    orig_tokens:     int,
    comp_tokens:     int,
) -> CompressedBill:
    title_match = re.search(r"(?i)(the\s+[\w\s,]+act[,\s]*\d{4})", raw_text)
    year_match  = re.search(r"\b(20\d{2}|19\d{2})\b", raw_text)
    title       = title_match.group(1).strip() if title_match else "Unknown Bill"
    year        = year_match.group(1)          if year_match  else "Unknown"

    paragraphs: list[str]          = [p.strip() for p in compressed_text.split("\n\n") if len(p.strip()) > 50]
    sections:   dict[str, list[str]] = {}
    for para in paragraphs:
        sections.setdefault(_classify_paragraph(para), []).append(para)

    return CompressedBill(
        title             = title,
        year              = year,
        original_tokens   = orig_tokens,
        compressed_tokens = comp_tokens,
        compression_ratio = round(orig_tokens / max(comp_tokens, 1), 1),
        sections          = {k: " ".join(v) for k, v in sections.items()},
    )


# ─────────────────────────────────────────────────────────────────────────────
# PDF TEXT EXTRACTION  (normal PDF + scanned OCR fallback)
# ─────────────────────────────────────────────────────────────────────────────
def _extract_text_from_pdf(pdf_path: str) -> str:
    if pdfplumber is None:
        raise ImportError("pdfplumber not installed. Run: pip install pdfplumber")

    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = (page.extract_text() or "").strip()
            if len(text) < 50:
                if pytesseract is None:
                    log.warning("Page %d appears scanned but pytesseract not installed. Skipping.", i + 1)
                    continue
                img  = page.to_image(resolution=300).original
                text = pytesseract.image_to_string(img, lang="eng").strip()
                log.debug("Page %d: used OCR", i + 1)
            if text:
                pages.append(text)

    return "\n\n".join(pages)


# ─────────────────────────────────────────────────────────────────────────────
# FULL COMPRESSION PIPELINE  (Layers 1-4)
# ─────────────────────────────────────────────────────────────────────────────
def compress_pdf(pdf_path: str) -> CompressedBill:
    """
    Runs all 4 compression layers on a PDF.
    Returns a CompressedBill ready to store in DB.

    Called by:
      - ingest_pdf()  when a user uploads a PDF
      - compress_pdf_to_json()  when the scheduler ingests a new bill
    """
    log.info("Compressing: %s", pdf_path)

    raw      = _extract_text_from_pdf(pdf_path)
    orig_tok = count_tokens(raw)
    log.info("  Raw:        %8d tokens", orig_tok)

    t1 = _layer1_strip(raw)
    log.info("  L1 strip:   %8d tokens  (-%d%%)", count_tokens(t1),
             100 - count_tokens(t1) * 100 // max(orig_tok, 1))

    t2 = _layer2_dedup(t1)
    log.info("  L2 dedup:   %8d tokens  (-%d%%)", count_tokens(t2),
             100 - count_tokens(t2) * 100 // max(orig_tok, 1))

    t3       = _layer3_extract(t2)
    comp_tok = count_tokens(t3)
    log.info("  L3 extract: %8d tokens  (-%d%%)", comp_tok,
             100 - comp_tok * 100 // max(orig_tok, 1))

    bill = _layer4_assemble(t3, raw, orig_tok, comp_tok)
    log.info("  Ratio: %.1fx  |  sections: %s",
             bill.compression_ratio, list(bill.sections.keys()))

    return bill


# ─────────────────────────────────────────────────────────────────────────────
# SECTION RELEVANCE RANKER  (token-saving heart of query-time filtering)
# ─────────────────────────────────────────────────────────────────────────────
def _rank_sections(question: str, sections: dict[str, str]) -> dict[str, str]:
    """
    Given a user question + all bill sections,
    returns ONLY the sections relevant to that question.

    "What is the penalty?"     ->  {"penalties": "..."}
    "What are my rights?"      ->  {"citizen_rights": "..."}
    "Who enforces this?"       ->  {"regulatory_body": "..."}
    """
    if not sections:
        return {}

    q      = question.lower()
    scored = {name: 0.0 for name in sections}

    # Keyword boost
    for sec_name, keywords in SECTION_KEYWORDS.items():
        if sec_name in scored:
            scored[sec_name] += sum(1.0 for kw in keywords if kw in q)

    # TF-IDF cosine similarity boost
    try:
        names  = list(sections.keys())
        texts  = [sections[n] for n in names]
        vec    = TfidfVectorizer(stop_words="english").fit_transform([question] + texts)
        sims   = cosine_similarity(vec[0:1], vec[1:]).flatten()
        for i, name in enumerate(names):
            scored[name] += float(sims[i]) * 2.0
    except Exception:
        pass

    max_score = max(scored.values(), default=0)
    threshold = max(0.1, max_score * 0.3)
    relevant  = {k: sections[k] for k, v in scored.items() if v >= threshold and k in sections}

    if not relevant:
        top = max(scored, key=scored.get)  # type: ignore[arg-type]
        relevant = {top: sections[top]}

    return relevant


# ─────────────────────────────────────────────────────────────────────────────
# PROMPT BUILDERS
# ─────────────────────────────────────────────────────────────────────────────
def _format_history(history: list[ChatTurn], max_turns: int = MAX_HISTORY_TURNS) -> str:
    recent = history[-max_turns:]
    if not recent:
        return ""
    lines = [f"{'User' if t.role == 'user' else 'Assistant'}: {t.content}" for t in recent]
    return "CONVERSATION HISTORY:\n" + "\n".join(lines)


def _build_pdf_prompt(
    question: str,
    bill:     CompressedBill,
    history:  list[ChatTurn],
) -> tuple[str, list[str]]:
    """Mode A — sends only sections relevant to the current question."""
    relevant  = _rank_sections(question, bill.sections)
    sec_block = "\n\n".join(
        f"[{name.replace('_', ' ').upper()}]\n{text.strip()}"
        for name, text in relevant.items()
    )
    history_block = _format_history(history)

    parts = [
        SYSTEM_PROMPT,
        "",
        f"DOCUMENT: {bill.title} ({bill.year})",
        f"(Compression ratio: {bill.compression_ratio}x — only relevant sections shown)",
        "",
        "RELEVANT CONTENT:",
        sec_block,
    ]
    if history_block:
        parts += ["", history_block]
    parts += ["", f"USER QUESTION: {question}", "", "Answer directly and simply."]

    return "\n".join(parts), list(relevant.keys())


def _build_general_prompt(
    question:       str,
    bill_catalogue: list[dict],
    history:        list[ChatTurn],
) -> tuple[str, list[str]]:
    """
    Mode B — no PDF.
    Sends only bill titles + one-liners. Never sends full bill content.
    Maximum token efficiency for general questions.
    """
    relevant_bills = _filter_catalogue(question, bill_catalogue)
    catalogue_text = "\n".join(
        f"  - {b['title']} ({b.get('year', '?')}) — {b.get('topic', 'Indian legislation')}"
        for b in relevant_bills[:MAX_CATALOGUE]
    )
    history_block = _format_history(history)

    parts = [
        SYSTEM_PROMPT,
        "",
        "BILLS IN DATABASE RELEVANT TO THIS QUERY:",
        catalogue_text,
    ]
    if history_block:
        parts += ["", history_block]
    parts += [
        "",
        f"CITIZEN QUESTION: {question}",
        "",
        "Answer concisely. Name specific bills if relevant. "
        "If the citizen needs more detail, tell them to select the bill from the app.",
    ]

    return "\n".join(parts), []


def _filter_catalogue(question: str, catalogue: list[dict]) -> list[dict]:
    """Scores each catalogue bill against the question — returns top matches."""
    q      = question.lower()
    scored = []
    for bill in catalogue:
        text  = f"{bill.get('title', '')} {bill.get('topic', '')}".lower()
        score = sum(1 for word in q.split() if len(word) > 3 and word in text)
        scored.append((score, bill))
    scored.sort(key=lambda x: x[0], reverse=True)
    relevant = [b for s, b in scored if s > 0]
    return relevant if relevant else [b for _, b in scored[:3]]


# ─────────────────────────────────────────────────────────────────────────────
# SESSION — the main class your backend uses
# ─────────────────────────────────────────────────────────────────────────────
class CompressionSession:
    """
    Manages a single user's conversation session.
    One instance per user connection.

    MODE A — PDF upload then multi-turn chat
    ----------------------------------------
        session = CompressionSession()

        # Turn 1: PDF arrives
        result = session.ingest_pdf(pdf_bytes, "finance_bill.pdf", "Summarise this")

        # Turn 2, 3, 4 ...: follow-up questions, no PDF re-processing
        result = session.chat("What is the penalty?")
        result = session.chat("Who do I complain to?",
                              assistant_reply="[previous LLM answer]")

    MODE B — No PDF, persistent general chat
    ----------------------------------------
        session = CompressionSession()

        # Every turn needs bill_catalogue from your DB
        result = session.chat("Recent bills on stock exchange",
                              bill_catalogue=catalogue)
        result = session.chat("What about SEBI rules?",
                              bill_catalogue=catalogue,
                              assistant_reply="[previous LLM answer]")

    Return value (always the same shape)
    -------------------------------------
        {
            "prompt"       : str,   <- send this directly to LLM
            "token_count"  : int,   <- log this for carbon metric
            "sections_used": list,  <- for UI: "Based on: Penalties, Rights"
            "mode"         : str,   <- "pdf" | "general"
            "session_id"   : str,
        }
    """

    def __init__(self) -> None:
        self._session = Session()
        log.info("Session %s created", self._session.session_id)

    # ── Mode A ───────────────────────────────────────────────────────────────
    def ingest_pdf(
        self,
        pdf_bytes:      bytes,
        filename:       str = "upload.pdf",
        first_question: str = "Summarise this document for a citizen.",
    ) -> dict:
        """
        Call ONCE when user uploads a PDF.
        Compression runs here and is cached for the rest of the session.
        All follow-up questions use chat() — PDF is never re-processed.
        """
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        try:
            bill = compress_pdf(tmp_path)
        finally:
            os.unlink(tmp_path)

        bill.source            = "upload"
        self._session.mode     = "pdf"
        self._session.bill     = bill

        log.info("Session %s: ingested %s | %.1fx compression",
                 self._session.session_id, bill.title, bill.compression_ratio)

        return self._make_pdf_result(first_question)

    # ── Main entry point ─────────────────────────────────────────────────────
    def chat(
        self,
        question:        str,
        bill_catalogue:  Optional[list[dict]] = None,
        assistant_reply: Optional[str]        = None,
    ) -> dict:
        """
        Call for every user message.

        Parameters
        ----------
        question        : the user's current message
        bill_catalogue  : required for Mode B only — list from your DB:
                          [{"title": str, "year": str, "topic": str}, ...]
        assistant_reply : pass the LLM's last response here to keep
                          accurate chat history. Call pattern:
                              result = session.chat(question)
                              llm_answer = call_llm(result["prompt"])
                              next_result = session.chat(next_q,
                                  assistant_reply=llm_answer)
        """
        # Record previous assistant reply in history before building next prompt
        if assistant_reply:
            self._session.history.append(ChatTurn("assistant", assistant_reply))

        if self._session.mode == "pdf" and self._session.bill:
            result = self._make_pdf_result(question)
        else:
            if not bill_catalogue:
                raise ValueError(
                    "bill_catalogue is required when no PDF has been ingested. "
                    "Pass a list of {'title', 'year', 'topic'} dicts from your DB."
                )
            self._session.mode = "general"
            result = self._make_general_result(question, bill_catalogue)

        self._session.history.append(ChatTurn("user", question))
        return result

    # ── Internal builders ────────────────────────────────────────────────────
    def _make_pdf_result(self, question: str) -> dict:
        assert self._session.bill is not None
        prompt, sections = _build_pdf_prompt(
            question, self._session.bill, self._session.history
        )
        tc = count_tokens(prompt)
        log.info("Session %s [pdf] tokens=%d sections=%s",
                 self._session.session_id, tc, sections)
        return {
            "prompt":        prompt,
            "token_count":   tc,
            "sections_used": sections,
            "mode":          "pdf",
            "session_id":    self._session.session_id,
        }

    def _make_general_result(self, question: str, catalogue: list[dict]) -> dict:
        prompt, sections = _build_general_prompt(
            question, catalogue, self._session.history
        )
        tc = count_tokens(prompt)
        log.info("Session %s [general] tokens=%d",
                 self._session.session_id, tc)
        return {
            "prompt":        prompt,
            "token_count":   tc,
            "sections_used": sections,
            "mode":          "general",
            "session_id":    self._session.session_id,
        }

    # ── Utilities ────────────────────────────────────────────────────────────
    def reset(self) -> None:
        """Clears bill + history. Keeps session_id."""
        sid                      = self._session.session_id
        self._session            = Session()
        self._session.session_id = sid
        log.info("Session %s reset", sid)

    @property
    def session_id(self) -> str:
        return self._session.session_id

    @property
    def turn_count(self) -> int:
        return len(self._session.history)


# ─────────────────────────────────────────────────────────────────────────────
# STANDALONE UTILITY — for the scheduler / second red circle
# ─────────────────────────────────────────────────────────────────────────────
def compress_pdf_to_json(pdf_path: str) -> dict:
    """
    Called by your friend's scheduler after downloading a new bill.
    No session needed — just compress and return a JSON-serialisable dict.

        from prompt_compressor import compress_pdf_to_json
        result = compress_pdf_to_json("downloads/dpdp_2023.pdf")
        db.store_bill(result)   # friend stores this in vector DB + relational DB
    """
    bill = compress_pdf(pdf_path)
    return {
        "title":             bill.title,
        "year":              bill.year,
        "original_tokens":   bill.original_tokens,
        "compressed_tokens": bill.compressed_tokens,
        "compression_ratio": bill.compression_ratio,
        "sections":          bill.sections,
    }


# ─────────────────────────────────────────────────────────────────────────────
# QUICK DEMO  —  python prompt_compressor.py
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":

    # Simulate a CompressedBill already stored in DB
    FAKE_BILL = CompressedBill(
        title             = "The Digital Personal Data Protection Act",
        year              = "2023",
        original_tokens   = 89_412,
        compressed_tokens = 3_991,
        compression_ratio = 22.4,
        sections = {
            "definitions":     "Personal data means any data about an individual who is identifiable by or in relation to such data.",
            "citizen_rights":  "Every data principal shall have the right to access information, correct inaccurate data, and erase data no longer necessary.",
            "penalties":       "Any data fiduciary found in contravention shall be liable to a penalty not exceeding two hundred and fifty crore rupees.",
            "obligations":     "Every data fiduciary shall implement appropriate technical and organisational safeguards.",
            "regulatory_body": "The Data Protection Board of India shall adjudicate disputes and impose penalties.",
            "appeal_mechanism":"Any person aggrieved by an order of the Board may appeal to the Appellate Tribunal within sixty days.",
        },
    )

    FAKE_CATALOGUE = [
        {"title": "Digital Personal Data Protection Act", "year": "2023", "topic": "data privacy citizen rights"},
        {"title": "Finance Act",                          "year": "2024", "topic": "taxation fiscal policy budget"},
        {"title": "Securities Laws Amendment Act",        "year": "2024", "topic": "stock exchange SEBI regulation"},
        {"title": "Telecom Act",                          "year": "2023", "topic": "telecommunications spectrum reform"},
        {"title": "Competition Amendment Act",            "year": "2023", "topic": "competition antitrust mergers"},
    ]

    SEP = "=" * 64

    # ── MODE A: PDF session ──────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("MODE A — PDF upload, multi-turn chat")
    print(SEP)

    session_a = CompressionSession()
    session_a._session.mode = "pdf"
    session_a._session.bill = FAKE_BILL  # normally set by ingest_pdf()

    turns_a = [
        ("What does this bill do overall?",            None),
        ("What happens if a company misuses my data?", "This bill protects personal data of Indian citizens..."),
        ("Who can I complain to?",                     "You can complain to the Data Protection Board..."),
    ]

    for question, prev_reply in turns_a:
        result = session_a.chat(question, assistant_reply=prev_reply)
        print(f"\nQ [{result['mode']}]: {question}")
        print(f"   tokens={result['token_count']}  sections={result['sections_used']}")
        print(f"   prompt preview: {result['prompt'][:200].replace(chr(10),' ')}…")

    # ── MODE B: General chat ─────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("MODE B — No PDF, general question, multi-turn")
    print(SEP)

    session_b = CompressionSession()

    turns_b = [
        ("Tell me recent bills on stock exchange",   None),
        ("What about data privacy laws?",            "The Securities Laws Amendment Act 2024 covers SEBI..."),
    ]

    for question, prev_reply in turns_b:
        result = session_b.chat(question,
                                bill_catalogue=FAKE_CATALOGUE,
                                assistant_reply=prev_reply)
        print(f"\nQ [{result['mode']}]: {question}")
        print(f"   tokens={result['token_count']}  sections={result['sections_used']}")
        print(f"   prompt preview: {result['prompt'][:200].replace(chr(10),' ')}…")

    # ── Token summary ────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("TOKEN REDUCTION SUMMARY")
    print(SEP)
    print(f"  Raw PDF               ~89,000 tokens")
    print(f"  After L1-L3 compress   ~3,991 tokens  (22x)  stored in DB")
    print(f"  After section filter     ~400 tokens  (per question, Mode A)")
    print(f"  Mode B general query     ~150 tokens  (title-only context)")
    print(f"  Total reduction         ~125x vs naive approach")