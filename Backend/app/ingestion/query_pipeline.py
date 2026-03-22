"""
query_pipeline.py
=================
End-to-end query pipeline — run from VS Code terminal.

Flow:
  1. Take user prompt from terminal input
  2. Send prompt + empty JSON schema to a CHEAP HF LLM (fills known fields, leaves rest blank)
  3. Compare filled schema against every row in PostgreSQL → find matching bills
  4. Retrieve compressed sections for those bills from ChromaDB
  5. Send sections to a STRONG HF LLM with Chain-of-Density instruction
     (iteratively densify: same token length, more facts per sentence)
  6. Print final answer + full token compression report in terminal

Requirements:
    pip install huggingface_hub chromadb sentence-transformers tiktoken psycopg2-binary sqlalchemy python-dotenv

Set your tokens in .env:
    HF_TOKEN=hf_your_token_here
    GEMINI_API_KEY=...         (not used here, kept for other modules)
    DATABASE_URL=postgresql://user:password@localhost:5432/yourdb

Both scheduler.py and prompt_compressor.py must have run at least once
so that PostgreSQL and chroma_db/ are populated.
"""

import os
import re
import json
import tiktoken
import chromadb

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from huggingface_hub import InferenceClient
from sqlalchemy import create_engine, text

load_dotenv()


# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

CHROMA_DIR = os.getenv("CHROMA_DIR", "chroma_db")
COLLECTION = os.getenv("CHROMA_COLLECTION", "bill_sections")

# HuggingFace models (both free on HF Inference API)
CHEAP_MODEL  = "meta-llama/Llama-3.1-8B-Instruct"
STRONG_MODEL = "meta-llama/Llama-3.3-70B-Instruct"

MAX_BILLS_TO_USE      = 3   # how many matched bills to send to strong LLM
MAX_SECTIONS_PER_BILL = 3   # top-N sections per bill from Chroma
COD_ROUNDS            = 3   # chain-of-density iteration rounds

# ─────────────────────────────────────────────────────────────────────────────
# SINGLETONS
# ─────────────────────────────────────────────────────────────────────────────

HF_TOKEN = os.getenv("HF_TOKEN")


cheap_client  = InferenceClient(model=CHEAP_MODEL,  token=HF_TOKEN, provider="auto")
strong_client = InferenceClient(model=STRONG_MODEL, token=HF_TOKEN, provider="novita")

embed_model = SentenceTransformer("all-MiniLM-L6-v2")
tokenizer   = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(tokenizer.encode(text))


# ─────────────────────────────────────────────────────────────────────────────
# PostgreSQL connection  (replaces SQLite)
# ─────────────────────────────────────────────────────────────────────────────

def _get_engine():
    """
    Returns a SQLAlchemy engine using DATABASE_URL from .env.
    Falls back to individual PG env vars if DATABASE_URL is not set.
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        # Build from individual vars (common pattern)
        user     = os.getenv("POSTGRES_USER",     "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "postgres")
        host     = os.getenv("POSTGRES_HOST",     "localhost")
        port     = os.getenv("POSTGRES_PORT",     "5432")
        db       = os.getenv("POSTGRES_DB",       "legislative_db")
        url      = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    return create_engine(url)


# ─────────────────────────────────────────────────────────────────────────────
# HF chat helper
# ─────────────────────────────────────────────────────────────────────────────

def _hf_chat(client: InferenceClient, system: str, user: str, max_tokens: int = 512) -> str:
    messages = [
        {"role": "system", "content": system},
        {"role": "user",   "content": user},
    ]
    resp = client.chat_completion(messages=messages, max_tokens=max_tokens)
    text = resp.choices[0].message.content or ""
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — CHEAP LLM: fill JSON schema from user prompt
# ─────────────────────────────────────────────────────────────────────────────

BILL_SCHEMA = {
    "bill_number": "",   # exact bill number e.g. "72"
    "title":       "",   # keyword(s) from bill subject e.g. "data protection"
    "year":        "",   # 4-digit year e.g. "2026"
    "status":      "",   # "Introduced" | "Passed" | "Pending" — if mentioned
    "ministry":    "",   # ministry name if mentioned
    "topic":       "",   # broad topic e.g. "taxation" "environment" "defence"
}

SCHEMA_SYSTEM = """
You are a structured data extractor.
Given a user's question about Indian parliamentary bills, fill in the JSON schema below.
Rules:
- Only fill a field if the user clearly mentioned it.
- Leave fields as "" if not mentioned. Never guess or invent values.
- "title" should be 1-3 keywords from the bill subject, not a full sentence.
- "year" must be a 4-digit number or "".
- Return ONLY valid JSON. No explanation, no markdown fences.
""".strip()


def fill_schema_cheap_llm(user_prompt: str) -> tuple[dict, int]:
    """Step 1: cheap HF LLM fills the JSON schema from the user prompt."""
    print("\n[Step 1] Cheap LLM (HF) filling JSON schema ...")

    user_content = (
        f"User question: {user_prompt}\n\n"
        f"Fill this schema:\n{json.dumps(BILL_SCHEMA, indent=2)}"
    )

    raw = _hf_chat(cheap_client, SCHEMA_SYSTEM, user_content, max_tokens=300)

    try:
        filled = json.loads(raw)
    except json.JSONDecodeError:
        print("  [WARN] Cheap LLM returned invalid JSON — using empty schema")
        filled = dict(BILL_SCHEMA)

    tokens_used = count_tokens(SCHEMA_SYSTEM + user_content + raw)
    print(f"  Schema filled: {filled}")
    print(f"  Tokens used (schema step): {tokens_used}")
    return filled, tokens_used


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — PostgreSQL: match bills against filled schema
# ─────────────────────────────────────────────────────────────────────────────

def match_bills_in_db(schema: dict, limit: int = MAX_BILLS_TO_USE) -> list[dict]:
    """
    Step 2: query PostgreSQL bills table using non-empty schema fields.
    Matches the app.models.bill.Bill table used by scheduler.py.
    """
    print("\n[Step 2] Matching bills in PostgreSQL ...")

    clauses = ["compressed = true"]
    params  = {}

    if schema.get("bill_number"):
        clauses.append("bill_number = :bill_number")
        params["bill_number"] = schema["bill_number"]

    if schema.get("title"):
        clauses.append("title ILIKE :title")
        params["title"] = f"%{schema['title']}%"

    if schema.get("year"):
        clauses.append("year = :year")
        params["year"] = schema["year"]

    if schema.get("status"):
        clauses.append("status ILIKE :status")
        params["status"] = f"%{schema['status']}%"

    where = " AND ".join(clauses)

    sql = text(f"""
        SELECT bill_number, title, year, status,
               original_tokens, compressed_tokens, compression_ratio
        FROM bills
        WHERE {where}
        ORDER BY last_seen_at DESC
        LIMIT :limit
    """)
    params["limit"] = limit

    engine = _get_engine()
    with engine.connect() as conn:
        rows = conn.execute(sql, params).fetchall()

    bills = []
    for row in rows:
        bills.append({
            "bill_id":           row[0],   # bill_number used as bill_id throughout
            "title":             row[1],
            "year":              row[2],
            "status":            row[3],
            "original_tokens":   row[4],
            "compressed_tokens": row[5],
            "compression_ratio": row[6],
        })

    if bills:
        for b in bills:
            print(f"  Matched: [{b['bill_id']}] {b['title']} ({b['year']})")
    else:
        print("  No bills matched. Try a broader question.")

    return bills


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — CHROMA: retrieve compressed sections for matched bills
# ─────────────────────────────────────────────────────────────────────────────

def retrieve_sections_from_chroma(
    user_prompt: str,
    bills: list[dict],
    n_per_bill: int = MAX_SECTIONS_PER_BILL,
) -> dict[str, list[str]]:
    print("\n[Step 3] Retrieving compressed sections from ChromaDB ...")

    chroma = chromadb.PersistentClient(path=CHROMA_DIR)
    col    = chroma.get_or_create_collection(name=COLLECTION)
    q_emb  = embed_model.encode([user_prompt]).tolist()

    bill_sections: dict[str, list[str]] = {}

    for bill in bills:
        bid = bill["bill_id"]
        try:
            results = col.query(
                query_embeddings = q_emb,
                n_results        = n_per_bill,
                where            = {"bill_number": bid},   # scheduler stores as bill_number
                include          = ["documents", "metadatas"],
            )
            docs  = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]

            labeled = []
            for doc, meta in zip(docs, metas):
                sec_name = meta.get("section", f"chunk_{meta.get('chunk_index', 0)}")
                labeled.append(f"[{sec_name.upper()}]\n{doc}")

            bill_sections[bid] = labeled
            print(f"  Bill {bid}: retrieved {len(labeled)} sections from Chroma")

        except Exception as e:
            print(f"  [WARN] Chroma query failed for bill {bid}: {e}")
            bill_sections[bid] = []

    return bill_sections


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — CHAIN-OF-DENSITY: densify context before sending to strong LLM
# ─────────────────────────────────────────────────────────────────────────────

COD_SYSTEM = """
You are a token-density optimizer for legal documents.
You will receive a passage from an Indian parliamentary bill.
Your job: rewrite it so that:
  - The output is the SAME length (±10%) as the input.
  - Every sentence contains MORE named entities: amounts, dates, section numbers,
    ministry names, article references, legal obligations, penalties.
  - No filler words, no repetition, no "as mentioned above".
  - Plain English. A citizen must still understand it.
Return ONLY the rewritten passage. No explanation.
""".strip()


def chain_of_density(text: str, rounds: int = COD_ROUNDS) -> tuple[str, int, int]:
    original_tokens = count_tokens(text)
    current = text
    for i in range(rounds):
        current = _hf_chat(
            cheap_client,
            COD_SYSTEM,
            current,
            max_tokens=max(200, int(original_tokens * 1.1)),
        )
    final_tokens = count_tokens(current)
    return current, original_tokens, final_tokens


def densify_all_sections(
    bill_sections: dict[str, list[str]],
    bills: list[dict],
) -> tuple[str, dict]:
    print(f"\n[Step 4] Chain-of-Density densification ({COD_ROUNDS} rounds) ...")

    context_parts = []
    total_before  = 0
    total_after   = 0
    bill_map      = {b["bill_id"]: b for b in bills}

    for bid, sections in bill_sections.items():
        if not sections:
            continue

        bill_info = bill_map.get(bid, {})
        context_parts.append(
            f"=== Bill {bid}: {bill_info.get('title','')} ({bill_info.get('year','')}) ==="
        )

        for sec_text in sections:
            densified, before, after = chain_of_density(sec_text)
            total_before += before
            total_after  += after
            context_parts.append(densified)
            print(f"  Section ({bid}): {before} → {after} tokens "
                  f"({'↓' if after <= before else '↑'}{abs(after-before)} tok)")

    full_context = "\n\n".join(context_parts)

    density_stats = {
        "sections_tokens_before_cod": total_before,
        "sections_tokens_after_cod":  total_after,
        "cod_ratio": round(total_before / max(total_after, 1), 2),
    }

    print(f"  CoD total: {total_before} → {total_after} tokens "
          f"(density ratio {density_stats['cod_ratio']}x)")

    return full_context, density_stats


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — STRONG LLM: answer using densified context
# ─────────────────────────────────────────────────────────────────────────────

ANSWER_SYSTEM = """
You are a legal simplification assistant for Indian citizens.
Answer the user's question using ONLY the bill content provided.
Rules:
- Be direct. Lead with the answer, not with "according to the bill".
- Use plain English. No legal jargon.
- Cite section names (e.g. [PENALTIES], [CITIZEN_RIGHTS]) when relevant.
- If the bill content does not answer the question, say so clearly.
- Keep your answer under 200 words.
""".strip()


def answer_with_strong_llm(
    user_prompt: str,
    context: str,
) -> tuple[str, int]:
    print("\n[Step 5] Strong LLM (HF) generating answer ...")

    user_content = f"Question: {user_prompt}\n\nBill content:\n{context}"
    tokens_in    = count_tokens(ANSWER_SYSTEM + user_content)

    answer     = _hf_chat(strong_client, ANSWER_SYSTEM, user_content, max_tokens=400)
    tokens_out = count_tokens(answer)

    print(f"  Tokens sent to strong LLM: {tokens_in}")
    print(f"  Tokens in answer: {tokens_out}")

    return answer, tokens_in


# ─────────────────────────────────────────────────────────────────────────────
# TOKEN COMPRESSION REPORT
# ─────────────────────────────────────────────────────────────────────────────

def print_compression_report(
    user_prompt:     str,
    bills:           list[dict],
    schema_tokens:   int,
    density_stats:   dict,
    llm_tokens_sent: int,
    answer:          str,
):
    sep = "=" * 60

    total_raw    = sum(b.get("original_tokens",   0) for b in bills)
    total_stored = sum(b.get("compressed_tokens", 0) for b in bills)
    total_cod_out = density_stats["sections_tokens_after_cod"]
    overall_ratio = round(total_raw / max(llm_tokens_sent, 1), 1)

    print(f"\n{sep}")
    print("  TOKEN COMPRESSION REPORT")
    print(sep)
    print(f"  User prompt             : {user_prompt[:60]}...")
    print(f"  Bills matched           : {len(bills)}")
    for b in bills:
        print(f"    [{b['bill_id']}] {b['title'][:45]} — "
              f"raw {b['original_tokens']} tok → stored {b['compressed_tokens']} tok "
              f"({b['compression_ratio']}x)")
    print()
    print(f"  Raw PDF tokens (total)  : {total_raw:>8}")
    print(f"  After L1-L3 in DB       : {total_stored:>8}  "
          f"({round(total_raw/max(total_stored,1),1)}x smaller)")
    print(f"  After section filter    : {density_stats['sections_tokens_before_cod']:>8}  "
          f"(only relevant sections pulled from Chroma)")
    print(f"  After Chain-of-Density  : {total_cod_out:>8}  "
          f"({density_stats['cod_ratio']}x denser than raw sections)")
    print(f"  Tokens sent to LLM      : {llm_tokens_sent:>8}  "
          f"(includes system prompt + context)")
    print(f"  Schema step tokens      : {schema_tokens:>8}  (cheap LLM)")
    print(f"  TOTAL REDUCTION         : {total_raw:>8} → {llm_tokens_sent} tokens  "
          f"= {overall_ratio}x overall compression")
    print(sep)
    print()
    print("  ANSWER")
    print(sep)
    print(answer)
    print(sep)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("  AI Legislative Analyzer — Query Pipeline")
    print("=" * 60)

    if not HF_TOKEN or not HF_TOKEN.startswith("hf_"):
        print("\n[ERROR] HF_TOKEN not set or invalid.")
        print("  Add HF_TOKEN=hf_your_token to your .env file.")
        print("  Get a free token at: https://huggingface.co/settings/tokens")
        return

    # Quick DB connectivity check
    try:
        engine = _get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("\n[DB] PostgreSQL connected.")
    except Exception as exc:
        print(f"\n[ERROR] Cannot connect to PostgreSQL: {exc}")
        print("  Check DATABASE_URL or POSTGRES_* vars in your .env file.")
        return

    print("\nEnter your question about Indian bills:")
    user_prompt = input("  > ").strip()
    if not user_prompt:
        print("Empty question. Exiting.")
        return

    # Step 1
    filled_schema, schema_tokens = fill_schema_cheap_llm(user_prompt)

    # Step 2
    bills = match_bills_in_db(filled_schema)
    if not bills:
        print("\nNo matching bills found. Try rephrasing your question.")
        return

    # Step 3
    bill_sections = retrieve_sections_from_chroma(user_prompt, bills)
    if not any(bill_sections.values()):
        print("\n[ERROR] No sections found in ChromaDB for matched bills.")
        print("  Make sure scheduler.py has completed at least one full cycle.")
        return

    # Step 4
    dense_context, density_stats = densify_all_sections(bill_sections, bills)

    # Step 5
    answer, llm_tokens_sent = answer_with_strong_llm(user_prompt, dense_context)

    # Report
    print_compression_report(
        user_prompt     = user_prompt,
        bills           = bills,
        schema_tokens   = schema_tokens,
        density_stats   = density_stats,
        llm_tokens_sent = llm_tokens_sent,
        answer          = answer,
    )


if __name__ == "__main__":
    main()