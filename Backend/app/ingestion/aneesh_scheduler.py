"""
scheduler.py
============
Standalone background process — completely independent from app.py.

Run it separately:
    python scheduler.py

It will:
  1. Hit the Sansad API every POLL_INTERVAL_HOURS hours
  2. Compare returned bills against what's already in SQLite
  3. For any new bill: download PDF → compress (L1-L4) → store in DB + Chroma
  4. Reset the countdown and wait again

This process never talks to the user.
The user-facing app only ever reads from the DB this fills.
"""

import os
import time
import logging
import sqlite3
import requests
import tempfile
from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler

# Import your compression function from prompt_compressor.py
# Both files must be in the same directory
from prompt_compressor import compress_pdf_to_json

import chromadb
from sentence_transformers import SentenceTransformer

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG — change these freely
# ─────────────────────────────────────────────────────────────────────────────

POLL_INTERVAL_HOURS = 6          # how often to check Sansad (every 6 hours)
BILLS_PER_PAGE      = 10         # how many bills to fetch per API call
PAGES_TO_CHECK      = 5          # check first N pages (newest 50 bills)

API_URL   = "https://sansad.in/api_rs/legislation/getBills"
DB_PATH   = "bills.db"
PDF_DIR   = "pdfs"
CHROMA_DIR = "chroma_db"
COLLECTION = "compressed_bill_sections"

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    format="[%(asctime)s] %(levelname)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
log = logging.getLogger("scheduler")

# ─────────────────────────────────────────────────────────────────────────────
# Lazy singletons (loaded once, reused across poll cycles)
# ─────────────────────────────────────────────────────────────────────────────

_embed_model = None
_chroma_collection = None


def get_embed_model():
    global _embed_model
    if _embed_model is None:
        log.info("Loading embedding model...")
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def get_collection():
    global _chroma_collection
    if _chroma_collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _chroma_collection = client.get_or_create_collection(name=COLLECTION)
    return _chroma_collection


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bills (
            bill_id           TEXT PRIMARY KEY,
            title             TEXT,
            year              TEXT,
            status            TEXT,
            pdf_url           TEXT,
            local_pdf_path    TEXT,
            compressed        INTEGER DEFAULT 0,
            original_tokens   INTEGER DEFAULT 0,
            compressed_tokens INTEGER DEFAULT 0,
            compression_ratio REAL    DEFAULT 0.0,
            first_seen_at     TEXT,
            last_seen_at      TEXT
        )
    """)
    conn.commit()
    conn.close()
    log.info("DB initialised at %s", DB_PATH)


def get_known_bill_ids() -> set:
    """Returns all bill_ids already in the DB (already processed)."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute("SELECT bill_id FROM bills WHERE compressed = 1")
    ids = {row[0] for row in cur.fetchall()}
    conn.close()
    return ids


def insert_bill(bill_id, title, year, status, pdf_url, local_pdf_path,
                original_tokens, compressed_tokens, compression_ratio):
    now = datetime.utcnow().isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT INTO bills
            (bill_id, title, year, status, pdf_url, local_pdf_path,
             compressed, original_tokens, compressed_tokens, compression_ratio,
             first_seen_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
        ON CONFLICT(bill_id) DO UPDATE SET
            title             = excluded.title,
            year              = excluded.year,
            status            = excluded.status,
            pdf_url           = excluded.pdf_url,
            local_pdf_path    = excluded.local_pdf_path,
            compressed        = 1,
            original_tokens   = excluded.original_tokens,
            compressed_tokens = excluded.compressed_tokens,
            compression_ratio = excluded.compression_ratio,
            last_seen_at      = excluded.last_seen_at
    """, (bill_id, title, year, status, pdf_url, local_pdf_path,
          original_tokens, compressed_tokens, compression_ratio, now, now))
    conn.commit()
    conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Sansad API
# ─────────────────────────────────────────────────────────────────────────────

def fetch_bills_page(page: int, size: int = BILLS_PER_PAGE) -> list[dict]:
    """Hits the Sansad API and returns a list of bill dicts for that page."""
    params = {
        "loksabha":           "",
        "sessionNo":          "",
        "billName":           "",
        "house":              "Lok Sabha",
        "ministryName":       "",
        "billType":           "Government",
        "billCategory":       "",
        "billStatus":         "",
        "introductionDateFrom": "",
        "introductionDateTo":   "",
        "passedInLsDateFrom":   "",
        "passedInLsDateTo":     "",
        "passedInRsDateFrom":   "",
        "passedInRsDateTo":     "",
        "page":               page,
        "size":               size,
        "locale":             "en",
        "sortOn":             "billIntroducedDate",
        "sortBy":             "desc",
    }
    try:
        resp = requests.get(API_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        records = data.get("records", [])
        bills = []
        for item in records:
            bill_id = str(item.get("billNumber", "")).strip()
            if not bill_id:
                continue
            bills.append({
                "bill_id": bill_id,
                "title":   item.get("billName", ""),
                "status":  item.get("status", ""),
                "pdf_url": item.get("billIntroducedFile", ""),
            })
        return bills
    except Exception as e:
        log.error("API fetch failed (page %d): %s", page, e)
        return []


# ─────────────────────────────────────────────────────────────────────────────
# PDF download
# ─────────────────────────────────────────────────────────────────────────────

def download_pdf(url: str, bill_id: str) -> str | None:
    if not url:
        log.warning("Bill %s has no PDF URL, skipping.", bill_id)
        return None

    os.makedirs(PDF_DIR, exist_ok=True)
    filename = os.path.join(PDF_DIR, f"{bill_id}.pdf")

    if os.path.exists(filename):
        log.info("  PDF already on disk: %s", filename)
        return filename

    try:
        log.info("  Downloading PDF for bill %s ...", bill_id)
        resp = requests.get(url, timeout=120)
        resp.raise_for_status()
        with open(filename, "wb") as f:
            f.write(resp.content)
        log.info("  Saved to %s (%d KB)", filename, len(resp.content) // 1024)
        return filename
    except Exception as e:
        log.error("  Download failed for bill %s: %s", bill_id, e)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Chroma storage
# ─────────────────────────────────────────────────────────────────────────────

def store_in_chroma(bill_id: str, title: str, year: str, sections: dict):
    """Embeds each compressed section and stores it in Chroma."""
    collection = get_collection()
    model      = get_embed_model()

    docs, ids, metas = [], [], []
    for sec_name, text in sections.items():
        if not text.strip():
            continue
        doc_id = f"{bill_id}::{sec_name}"
        # Delete old version if it exists (handles re-ingestion)
        try:
            collection.delete(ids=[doc_id])
        except Exception:
            pass
        docs.append(text)
        ids.append(doc_id)
        metas.append({"bill_id": bill_id, "section": sec_name,
                      "title": title, "year": year})

    if not docs:
        return

    embeddings = model.encode(docs).tolist()
    collection.add(ids=ids, documents=docs, embeddings=embeddings, metadatas=metas)
    log.info("  Stored %d sections in Chroma for bill %s", len(docs), bill_id)


# ─────────────────────────────────────────────────────────────────────────────
# Core poll job — this is what runs on the timer
# ─────────────────────────────────────────────────────────────────────────────

def poll_and_ingest():
    """
    The single function APScheduler calls every POLL_INTERVAL_HOURS.

    Flow:
      1. Fetch the newest N pages from Sansad API
      2. For each bill not yet in DB:
         a. Download PDF
         b. Run compress_pdf_to_json() (L1-L4)
         c. Store sections in Chroma
         d. Insert metadata row in SQLite
    """
    log.info("=" * 60)
    log.info("POLL CYCLE STARTED — %s", datetime.utcnow().isoformat())
    log.info("=" * 60)

    known_ids = get_known_bill_ids()
    log.info("Bills already in DB: %d", len(known_ids))

    new_count = 0

    for page in range(1, PAGES_TO_CHECK + 1):
        log.info("Fetching page %d/%d from Sansad ...", page, PAGES_TO_CHECK)
        bills = fetch_bills_page(page)

        if not bills:
            log.info("  Empty page, stopping early.")
            break

        for bill in bills:
            bill_id = bill["bill_id"]

            if bill_id in known_ids:
                log.info("  [SKIP] bill %s already processed", bill_id)
                continue

            log.info("  [NEW]  bill %s — %s", bill_id, bill["title"])

            # Step 1: download PDF
            local_path = download_pdf(bill["pdf_url"], bill_id)
            if not local_path:
                continue

            # Step 2: compress — L1 → L2 → L3 → L4
            # Each layer runs inside compress_pdf_to_json() from prompt_compressor.py
            # We log token counts at each stage so you can see the reduction clearly.
            try:
                log.info("  [L1] Stripping boilerplate (regex) ...")
                log.info("  [L2] Deduplicating similar sentences (embeddings) ...")
                log.info("  [L3] Extractive ranking (TF-IDF + legal keywords) ...")
                log.info("  [L4] Assembling named sections ...")
                result = compress_pdf_to_json(local_path)

                # Log the token reduction at each boundary
                orig = result.get("original_tokens", 0)
                comp = result.get("compressed_tokens", 0)
                ratio = result.get("compression_ratio", 0.0)
                sections = result.get("sections", {})

                log.info("  --- Compression report for bill %s ---", bill_id)
                log.info("  Raw PDF         : %d tokens", orig)
                log.info("  After L1-L3     : ~%d tokens  (%.1fx smaller)",
                         comp, ratio)
                log.info("  After L4 filter : ~%d tokens  (per query, only relevant sections)",
                         comp // max(len(sections), 1))
                log.info("  Sections found  : %s", list(sections.keys()))
                log.info("  Total reduction : %.1fx", ratio)

            except Exception as e:
                log.error("  Compression failed for bill %s: %s", bill_id, e)
                continue

            # Steps 3 + 4 — atomic: Chroma then SQLite together.
            # If SQLite fails after Chroma succeeds, we roll back Chroma
            # so both stores stay in sync and the next cycle can retry cleanly.
            try:
                store_in_chroma(
                    bill_id  = bill_id,
                    title    = result.get("title", bill["title"]),
                    year     = result.get("year", ""),
                    sections = result.get("sections", {}),
                )
                # Only write to SQLite after Chroma confirms success
                insert_bill(
                    bill_id           = bill_id,
                    title             = result.get("title", bill["title"]),
                    year              = result.get("year", ""),
                    status            = bill["status"],
                    pdf_url           = bill["pdf_url"],
                    local_pdf_path    = local_path,
                    original_tokens   = result.get("original_tokens", 0),
                    compressed_tokens = result.get("compressed_tokens", 0),
                    compression_ratio = result.get("compression_ratio", 0.0),
                )
                known_ids.add(bill_id)
                new_count += 1
                log.info("  Done. Compression: %dx | sections: %s",
                         int(result.get("compression_ratio", 0)),
                         list(result.get("sections", {}).keys()))

            except Exception as e:
                log.error("  Storage failed for bill %s: %s", bill_id, e)
                # Roll back any Chroma entries so next cycle can retry cleanly
                try:
                    col = get_collection()
                    orphan_ids = [
                        f"{bill_id}::{sec}"
                        for sec in result.get("sections", {})
                    ]
                    col.delete(ids=orphan_ids)
                    log.info("  Rolled back %d Chroma entries for bill %s",
                             len(orphan_ids), bill_id)
                except Exception as cleanup_err:
                    log.warning("  Chroma rollback also failed: %s", cleanup_err)
                continue

        # Small courtesy pause between pages — don't hammer the server
        time.sleep(2)

    log.info("POLL CYCLE DONE — %d new bills ingested", new_count)
    log.info("Next poll in %d hours", POLL_INTERVAL_HOURS)
    log.info("=" * 60)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()

    # Run once immediately on startup so you don't wait hours for first data
    log.info("Running initial poll on startup ...")
    poll_and_ingest()

    # Then schedule it to repeat every N hours
    scheduler = BlockingScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        poll_and_ingest,
        trigger="interval",
        hours=POLL_INTERVAL_HOURS,
        id="sansad_poll",
    )

    log.info("Scheduler running. Poll interval: every %d hours.", POLL_INTERVAL_HOURS)
    log.info("Press Ctrl+C to stop.")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler stopped.")