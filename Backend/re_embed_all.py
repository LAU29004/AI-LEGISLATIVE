"""
re_embed_all.py
===============
Re-embeds all bills from PostgreSQL into ChromaDB.
Run from backend root:
    python re_embed_all.py
"""

from dotenv import load_dotenv
load_dotenv()

from app.ingestion.scheduler import re_embed_bill
from sqlalchemy import create_engine, text
import os

engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    rows = conn.execute(
        text("SELECT bill_number FROM bills WHERE compressed = true ORDER BY bill_number")
    ).fetchall()
    bill_numbers = [r[0] for r in rows]

print(f"Found {len(bill_numbers)} bills to re-embed: {bill_numbers}")
print("=" * 60)

success_count = 0
failed        = []

for bn in bill_numbers:
    print(f"Re-embedding bill {bn} ...")
    ok = re_embed_bill(bn)
    if ok:
        success_count += 1
        print(f"  -> OK")
    else:
        failed.append(bn)
        print(f"  -> FAILED")

print("=" * 60)
print(f"Done. {success_count}/{len(bill_numbers)} bills re-embedded successfully.")
if failed:
    print(f"Failed bills: {failed}")