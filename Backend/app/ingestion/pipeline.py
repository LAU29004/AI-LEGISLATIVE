from app.config.database import SessionLocal
from app.repositories.bill_repo import create_bill, add_section

from app.ingestion.fetch_bills import fetch_lok_sabha_bills, download_pdf
from app.ingestion.parser import extract_full_text
from app.ingestion.chunker import split_by_section

from app.services.vector_service import embed_and_store_sections


def run_ingestion():
    print("🚀 Starting ingestion...")

    db = SessionLocal()

    bills = fetch_lok_sabha_bills(page=1, size=1)

    if not bills:
        print("No bills found")
        return

    bill = bills[0]

    print("Processing:", bill["title"])

    db_bill = create_bill(db, bill)

    pdf_path = download_pdf(bill["pdf_url"], bill["bill_id"])

    text = extract_full_text(pdf_path)

    sections = split_by_section(text)

    print(f"Total Sections: {len(sections)}")

    for sec in sections:
        add_section(db, db_bill.id, sec["section"], sec["content"])

    embed_and_store_sections(bill["bill_id"], sections)

    print("✅ Ingestion complete")

    db.close()