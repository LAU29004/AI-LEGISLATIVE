from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.config.database import Base


class Bill(Base):
    __tablename__ = "bills"

    id                = Column(Integer, primary_key=True, index=True)
    bill_number       = Column(String, unique=True, nullable=False, index=True)
    title             = Column(Text)
    year              = Column(String)
    status            = Column(String)
    pdf_url           = Column(Text)
    local_pdf_path    = Column(Text)
    compressed        = Column(Boolean, default=False)
    original_tokens   = Column(Integer, default=0)
    compressed_tokens = Column(Integer, default=0)
    compression_ratio = Column(Float,   default=0.0)
    first_seen_at     = Column(DateTime(timezone=True))
    last_seen_at      = Column(DateTime(timezone=True))

    sections = relationship("BillSection", back_populates="bill",
                            cascade="all, delete-orphan")


class BillSection(Base):
    __tablename__ = "bill_sections"

    id           = Column(Integer, primary_key=True, index=True)
    bill_id      = Column(Integer, ForeignKey("bills.id"), nullable=False, index=True)
    section_name = Column(String)   # "penalties", "citizen_rights", etc.
    content      = Column(Text)

    bill = relationship("Bill", back_populates="sections")