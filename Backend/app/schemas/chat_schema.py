from typing import Any, Dict, List, Optional
from pydantic import BaseModel, field_validator


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    query: str
    conversation_history: List[ChatMessage] = []
    top_k: int = 5
    bill_filter: Optional[str] = None  # filter by bill_number

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Query must be at least 3 characters")
        if len(v) > 2000:
            raise ValueError("Query must be under 2000 characters")
        return v

    @field_validator("top_k")
    @classmethod
    def validate_top_k(cls, v: int) -> int:
        return max(1, min(v, 20))


class SourceDocument(BaseModel):
    bill_id: str
    bill_number: str
    bill_title: str
    section: Optional[str] = None
    relevance_score: float


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceDocument] = []
    query: str
    model_used: str
    tokens_used: Optional[int] = None
    cached: bool = False


class ChatHealthResponse(BaseModel):
    status: str
    llm_available: bool
    vectordb_available: bool
    message: str
