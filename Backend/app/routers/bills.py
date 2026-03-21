"""
app/routers/bills.py
====================
Bill data endpoints consumed by ExploreScreen and BillDetailsScreen.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.config.database import SessionLocal
from app.models.bill import Bill, BillSection

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Response schemas  (match what the Expo screens expect)
# ---------------------------------------------------------------------------

class SectionOut(BaseModel):
    section_name: str
    content:      str

    class Config:
        from_attributes = True


class BillOut(BaseModel):
    id:                int
    bill_number:       str
    title:             str
    year:              Optional[str]
    status:            Optional[str]
    pdf_url:           Optional[str]
    compressed:        bool
    original_tokens:   int
    compressed_tokens: int
    compression_ratio: float

    class Config:
        from_attributes = True


class BillDetailOut(BillOut):
    sections: list[SectionOut] = []


# ---------------------------------------------------------------------------
# GET /bills  — ExploreScreen bill list + search
# ---------------------------------------------------------------------------

@router.get("", response_model=list[BillOut])
def list_bills(
    search: Optional[str] = Query(None, description="Search by title or bill number"),
    limit:  int           = Query(50, le=200),
    offset: int           = Query(0),
    db:     Session       = Depends(get_db),
):
    """
    Returns all compressed bills from PostgreSQL.
    Supports optional full-text search on title and bill_number.

    ExploreScreen usage:
        GET /bills
        GET /bills?search=finance
        GET /bills?search=72
    """
    query = db.query(Bill).filter(Bill.compressed == True)

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            Bill.title.ilike(term) | Bill.bill_number.ilike(term)
        )

    bills = query.order_by(Bill.id.desc()).offset(offset).limit(limit).all()
    return bills


# ---------------------------------------------------------------------------
# GET /bills/{bill_number}  — BillDetailsScreen full detail
# ---------------------------------------------------------------------------

@router.get("/{bill_number}", response_model=BillDetailOut)
def get_bill(bill_number: str, db: Session = Depends(get_db)):
    """
    Returns a single bill with all its compressed sections.

    BillDetailsScreen usage:
        GET /bills/72
        GET /bills/3
    """
    bill = db.query(Bill).filter(Bill.bill_number == bill_number).first()
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill {bill_number} not found")

    sections = (
        db.query(BillSection)
        .filter(BillSection.bill_id == bill.id)
        .all()
    )

    return BillDetailOut(
        id                = bill.id,
        bill_number       = bill.bill_number,
        title             = bill.title,
        year              = bill.year,
        status            = bill.status,
        pdf_url           = bill.pdf_url,
        compressed        = bill.compressed,
        original_tokens   = bill.original_tokens,
        compressed_tokens = bill.compressed_tokens,
        compression_ratio = bill.compression_ratio,
        sections          = [
            SectionOut(section_name=s.section_name, content=s.content)
            for s in sections
        ],
    )