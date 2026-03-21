from sqlalchemy.orm import Session
from app.models.bill import Bill, BillSection
from datetime import datetime, timezone


def get_bill_by_number(db: Session, bill_number: str) -> Bill | None:
    return db.query(Bill).filter(Bill.bill_number == bill_number).first()


def create_bill(db: Session, **kwargs) -> Bill:
    bill = Bill(**kwargs)
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


def create_bill_sections(db: Session, bill_id: int, sections: list[dict]) -> None:
    for section in sections:
        db.add(BillSection(
            bill_id      = bill_id,
            section_name = section["section"],
            content      = section["content"],
        ))
    db.commit()