import logging
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.schemas.bill_schema import SearchResult
from app.services.embedding_service import EmbeddingService
from app.services.vector_service import VectorService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.get(
    "",
    response_model=List[SearchResult],
    summary="Semantic search across all bills",
)
async def search_bills(
    q: str = Query(..., min_length=2, description="Natural language search query"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    Perform semantic (embedding-based) search across all ingested legislation.
    Returns the most relevant bill sections ranked by similarity.
    """
    embedding_svc = EmbeddingService()
    vector_svc = VectorService()

    query_embedding = await embedding_svc.embed_text(q)
    results = await vector_svc.search(query_embedding, top_k=top_k)

    return [
        SearchResult(
            bill_id=payload.get("bill_id", "unknown"),
            bill_number=payload.get("bill_number", "UNKNOWN"),
            title=payload.get("bill_title", "Untitled"),
            relevance_score=round(score, 4),
            matched_section=payload.get("section_title"),
            summary=(payload.get("text_chunk") or "")[:250],
        )
        for score, payload in results
    ]
