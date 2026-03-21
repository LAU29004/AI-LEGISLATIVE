from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, HttpUrl, field_validator


class BillSection(BaseModel):
    section_number: str
    title: Optional[str] = None
    raw_text: str
    rules: List[Dict[str, Any]] = []


class ExtractedRule(BaseModel):
    rule: str
    actor: Optional[str] = None
    condition: Optional[str] = None
    penalty: Optional[str] = None
    section_reference: Optional[str] = None


class StructuredBillJSON(BaseModel):
    bill_number: str
    title: str
    summary: str
    jurisdiction: Optional[str] = None
    category: Optional[str] = None
    sections: List[BillSection] = []
    rules: List[ExtractedRule] = []
    key_provisions: List[str] = []
    affected_parties: List[str] = []
    effective_date: Optional[str] = None


class BillIngestRequest(BaseModel):
    url: str
    bill_number: str
    title: Optional[str] = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class BillResponse(BaseModel):
    id: str
    title: str
    bill_number: str
    source_url: Optional[str] = None
    summary: Optional[str] = None
    status: str
    jurisdiction: Optional[str] = None
    category: Optional[str] = None
    section_count: int
    is_indexed: bool
    introduced_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BillDetailResponse(BillResponse):
    structured_json: Optional[Dict[str, Any]] = None


class BillListResponse(BaseModel):
    total: int
    bills: List[BillResponse]


class SearchResult(BaseModel):
    bill_id: str
    bill_number: str
    title: str
    relevance_score: float
    matched_section: Optional[str] = None
    summary: Optional[str] = None
