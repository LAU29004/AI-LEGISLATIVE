"""
app/ingestion/scheduler.py
==========================
Standalone background ingestion process.

Run from the backend root:
    python -m app.ingestion.scheduler

Pipeline per bill:
    Sansad API -> Download PDF -> Compress (L1-L4)
               -> PostgreSQL (metadata + sections)
               -> ChromaDB (embeddings via all-MiniLM-L6-v2)
"""

import os
import time
import logging
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

import requests
import chromadb
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.ingestion.prompt_compressor import compress_pdf_to_json, _get_embed_model
from app.config.database import SessionLocal
from app.models.bill import Bill, BillSection

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

POLL_INTERVAL_HOURS: int = int(os.getenv("SCHEDULER_POLL_INTERVAL_HOURS", 6))
BILLS_PER_PAGE:      int = int(os.getenv("SCHEDULER_BILLS_PER_PAGE", 5))
PAGES_TO_CHECK:      int = int(os.getenv("SCHEDULER_PAGES_TO_CHECK", 10))
PDF_DIR:             str = os.getenv("SCHEDULER_PDF_DIR", "pdfs")
CHROMA_DIR:          str = os.getenv("CHROMA_DIR", "chroma_db")
CHROMA_COLLECTION:   str = os.getenv("CHROMA_COLLECTION", "bill_sections")

SANSAD_API_URL = "https://sansad.in/api_rs/legislation/getBills"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    format="[%(asctime)s] %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
log = logging.getLogger("scheduler")

# ---------------------------------------------------------------------------
# ChromaDB singleton
# ---------------------------------------------------------------------------

_chroma_collection: Optional[chromadb.Collection] = None


def _get_chroma_collection() -> chromadb.Collection:
    global _chroma_collection
    if _chroma_collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _chroma_collection = client.get_or_create_collection(
            name=CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        log.info("ChromaDB ready: %s (path=%s)", CHROMA_COLLECTION, CHROMA_DIR)
    return _chroma_collection


# ---------------------------------------------------------------------------
# ChromaDB storage
# ---------------------------------------------------------------------------

def _store_in_chroma(
    bill_number: str,
    title:       str,
    year:        str,
    sections:    list[dict],
) -> None:
    """
    Embed each section via all-MiniLM-L6-v2 and upsert into ChromaDB.
    """
    collection = _get_chroma_collection()
    model      = _get_embed_model()

    docs:  list[str]  = []
    ids:   list[str]  = []
    metas: list[dict] = []

    for section in sections:
        sec_name = section["section"]
        content  = section["content"].strip()
        if not content:
            continue
        doc_id = f"{bill_number}::{sec_name}"
        docs.append(content)
        ids.append(doc_id)
        metas.append({
            "bill_number": bill_number,
            "section":     sec_name,
            "title":       title,
            "year":        year,
        })

    if not docs:
        log.warning("  Chroma: no non-empty sections to embed for bill %s.", bill_number)
        return

    embeddings = model.encode(docs, batch_size=64, show_progress_bar=False).tolist()

    # Upsert: delete old entries first
    try:
        existing_ids = [d for d in ids if d in collection.get(ids=ids)["ids"]]
        if existing_ids:
            collection.delete(ids=existing_ids)
    except Exception:
        pass

    collection.add(
        ids        = ids,
        documents  = docs,
        embeddings = embeddings,
        metadatas  = metas,
    )
    log.info("  Chroma: stored %d section embeddings for bill %s.", len(docs), bill_number)


# ---------------------------------------------------------------------------
# Re-embed a single bill (SQL exists, ChromaDB missing)
# ---------------------------------------------------------------------------

def re_embed_bill(bill_number: str) -> bool:
    db = SessionLocal()
    try:
        bill = db.query(Bill).filter(Bill.bill_number == bill_number).first()
        if not bill:
            log.error("re_embed_bill: bill %s not found in SQL.", bill_number)
            return False

        local_path = bill.local_pdf_path
        if not local_path or not os.path.exists(local_path):
            log.error("re_embed_bill: PDF not found at %s for bill %s.", local_path, bill_number)
            return False

        log.info("Re-embedding bill %s from %s ...", bill_number, local_path)
        result = compress_pdf_to_json(local_path)
        secs   = result.get("sections", {})

        if not secs:
            log.error("re_embed_bill: no sections produced for bill %s.", bill_number)
            return False

        sections_list = _sections_to_list(secs)
        _store_in_chroma(
            bill_number = bill_number,
            title       = bill.title or result.get("title", ""),
            year        = str(bill.year or result.get("year", "")),
            sections    = sections_list,
        )

        db.query(BillSection).filter(BillSection.bill_id == bill.id).delete()
        for section in sections_list:
            db.add(BillSection(
                bill_id      = bill.id,
                section_name = section["section"],
                content      = section["content"],
            ))
        db.commit()

        log.info("re_embed_bill: bill %s re-embedded with %d sections.",
                 bill_number, len(sections_list))
        return True

    except Exception as exc:
        db.rollback()
        log.error("re_embed_bill: failed for bill %s: %s", bill_number, exc)
        return False
    finally:
        db.close()


# ---------------------------------------------------------------------------
# PostgreSQL helpers
# ---------------------------------------------------------------------------

def _get_processed_bill_numbers() -> set[str]:
    db = SessionLocal()
    try:
        rows = db.query(Bill.bill_number).filter(Bill.compressed == True).all()
        return {row.bill_number for row in rows}
    finally:
        db.close()


def _persist_to_postgres(
    bill_number:       str,
    title:             str,
    year:              str,
    status:            str,
    ministry_name:     str,        # ✅ ADDED
    pdf_url:           str,
    local_pdf_path:    str,
    original_tokens:   int,
    compressed_tokens: int,
    compression_ratio: float,
    sections:          list[dict],
) -> None:
    db  = SessionLocal()
    now = datetime.now(timezone.utc)
    try:
        stmt = pg_insert(Bill).values(
            bill_number       = bill_number,
            title             = title,
            year              = year,
            status            = status,
            ministry_name     = ministry_name,     # ✅ ADDED
            pdf_url           = pdf_url,
            local_pdf_path    = local_pdf_path,
            compressed        = True,
            original_tokens   = original_tokens,
            compressed_tokens = compressed_tokens,
            compression_ratio = compression_ratio,
            first_seen_at     = now,
            last_seen_at      = now,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["bill_number"],
            set_={
                "title":             stmt.excluded.title,
                "year":              stmt.excluded.year,
                "status":            stmt.excluded.status,
                "ministry_name":     stmt.excluded.ministry_name,   # ✅ ADDED
                "pdf_url":           stmt.excluded.pdf_url,
                "local_pdf_path":    stmt.excluded.local_pdf_path,
                "compressed":        True,
                "original_tokens":   stmt.excluded.original_tokens,
                "compressed_tokens": stmt.excluded.compressed_tokens,
                "compression_ratio": stmt.excluded.compression_ratio,
                "last_seen_at":      now,
            },
        )
        db.execute(stmt)
        db.flush()

        bill = db.query(Bill).filter(Bill.bill_number == bill_number).one()
        db.query(BillSection).filter(BillSection.bill_id == bill.id).delete()
        for section in sections:
            db.add(BillSection(
                bill_id      = bill.id,
                section_name = section["section"],
                content      = section["content"],
            ))
        db.commit()
        log.info("  PostgreSQL: upserted bill %s with %d sections.", bill_number, len(sections))

    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Sansad API
# ---------------------------------------------------------------------------

def _fetch_bills_page(page: int) -> list[dict]:
    params = {
        "loksabha":             "",
        "sessionNo":            "",
        "billName":             "",
        "house":                "Lok Sabha",
        "ministryName":         "",
        "billType":             "Government",
        "billCategory":         "",
        "billStatus":           "",
        "introductionDateFrom": "",
        "introductionDateTo":   "",
        "passedInLsDateFrom":   "",
        "passedInLsDateTo":     "",
        "passedInRsDateFrom":   "",
        "passedInRsDateTo":     "",
        "page":                 page,
        "size":                 BILLS_PER_PAGE,
        "locale":               "en",
        "sortOn":               "billIntroducedDate",
        "sortBy":               "desc",
    }
    try:
        resp = requests.get(SANSAD_API_URL, params=params, timeout=30)
        resp.raise_for_status()
        records = resp.json().get("records", [])
        bills = []
        for item in records:
            bill_number = str(item.get("billNumber", "")).strip()
            if not bill_number:
                continue
            bills.append({
                "bill_number":   bill_number,
                "title":         item.get("billName", "").strip(),
                "status":        item.get("status", ""),
                "pdf_url":       item.get("billIntroducedFile", ""),
                "ministry_name": item.get("ministryName", "").strip(),  # ✅ ADDED
            })
        return bills
    except Exception as exc:
        log.error("API fetch failed (page %d): %s", page, exc)
        return []


# ---------------------------------------------------------------------------
# PDF download
# ---------------------------------------------------------------------------

def _download_pdf(url: str, bill_number: str) -> Optional[str]:
    if not url:
        log.warning("Bill %s has no PDF URL -- skipping.", bill_number)
        return None

    os.makedirs(PDF_DIR, exist_ok=True)
    dest = os.path.join(PDF_DIR, f"{bill_number}.pdf")

    if os.path.exists(dest):
        log.info("  PDF already on disk: %s", dest)
        return dest

    try:
        log.info("  Downloading PDF for bill %s ...", bill_number)
        resp = requests.get(url, timeout=180, stream=True)
        resp.raise_for_status()
        with open(dest, "wb") as fh:
            for chunk in resp.iter_content(chunk_size=65536):
                fh.write(chunk)
        size_kb = os.path.getsize(dest) // 1024
        log.info("  Saved: %s (%d KB)", dest, size_kb)
        return dest
    except KeyboardInterrupt:
        raise
    except Exception as exc:
        log.error("  Download failed for bill %s: %s", bill_number, exc)
        return None


# ---------------------------------------------------------------------------
# Section dict -> list
# ---------------------------------------------------------------------------

def _sections_to_list(sections: dict) -> list[dict]:
    return [
        {"section": name, "content": text}
        for name, text in sections.items()
        if text and text.strip()
    ]


# ---------------------------------------------------------------------------
# Core poll cycle
# ---------------------------------------------------------------------------

def poll_and_ingest() -> None:
    log.info("=" * 60)
    log.info("POLL CYCLE STARTED - %s", datetime.now(timezone.utc).isoformat())
    log.info("=" * 60)

    processed = _get_processed_bill_numbers()
    log.info("Bills already in DB: %d", len(processed))

    ingested = 0

    for page in range(1, PAGES_TO_CHECK + 1):
        log.info("Fetching page %d / %d ...", page, PAGES_TO_CHECK)
        bills = _fetch_bills_page(page)

        if not bills:
            log.info("  Empty page -- stopping early.")
            break

        for bill in bills:
            bill_number = bill["bill_number"]
            api_title   = bill["title"]

            if bill_number in processed:
                log.info("  [SKIP] %s -- already processed.", bill_number)
                continue

            log.info("  [NEW]  %s -- %s", bill_number, api_title)

            local_path = _download_pdf(bill["pdf_url"], bill_number)
            if not local_path:
                continue

            try:
                log.info("  Compressing bill %s ...", bill_number)
                result = compress_pdf_to_json(local_path)
            except KeyboardInterrupt:
                raise
            except Exception as exc:
                log.error("  Compression failed for bill %s: %s", bill_number, exc)
                continue

            orig  = result.get("original_tokens", 0)
            comp  = result.get("compressed_tokens", 0)
            ratio = result.get("compression_ratio", 0.0)
            secs  = result.get("sections", {})
            title = result.get("title") or api_title
            year  = result.get("year", "")

            log.info("  Compression: %dx | %d -> %d tokens | title: %s | sections: %s",
                     int(ratio), orig, comp, title, list(secs.keys()))

            sections_list = _sections_to_list(secs)
            if not sections_list:
                log.warning("  No usable sections for bill %s -- skipping.", bill_number)
                continue

            try:
                _store_in_chroma(
                    bill_number = bill_number,
                    title       = title,
                    year        = year,
                    sections    = sections_list,
                )
            except KeyboardInterrupt:
                raise
            except Exception as exc:
                log.error("  ChromaDB storage failed for bill %s: %s", bill_number, exc)
                continue

            try:
                _persist_to_postgres(
                    bill_number       = bill_number,
                    title             = title,
                    year              = year,
                    status            = bill["status"],
                    ministry_name     = bill["ministry_name"],   # ✅ ADDED
                    pdf_url           = bill["pdf_url"],
                    local_pdf_path    = local_path,
                    original_tokens   = orig,
                    compressed_tokens = comp,
                    compression_ratio = ratio,
                    sections          = sections_list,
                )
            except KeyboardInterrupt:
                raise
            except Exception as exc:
                log.error("  PostgreSQL persist failed for bill %s: %s", bill_number, exc)
                continue

            processed.add(bill_number)
            ingested += 1
            log.info("  [DONE] bill %s | %.1fx compression | %d sections | title: %s",
                     bill_number, ratio, len(sections_list), title)

        time.sleep(2)

    log.info("POLL CYCLE DONE -- %d new bills ingested.", ingested)
    log.info("Next poll in %d hour(s).", POLL_INTERVAL_HOURS)
    log.info("=" * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    log.info("Running initial poll on startup ...")
    poll_and_ingest()

    scheduler = BlockingScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        poll_and_ingest,
        trigger="interval",
        hours=POLL_INTERVAL_HOURS,
        id="sansad_poll",
        max_instances=1,
    )

    log.info("Scheduler running -- polling every %d hour(s). Ctrl-C to stop.",
             POLL_INTERVAL_HOURS)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler stopped.")