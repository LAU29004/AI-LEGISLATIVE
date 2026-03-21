import logging
import random
import uuid
from typing import Any, Dict, List, Optional, Tuple

from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class VectorDBClient:
    """
    Qdrant vector database client with in-memory mock fallback.
    Falls back to an in-memory dict store if Qdrant is unavailable.
    """

    def __init__(self):
        self._client = None
        self._mock_store: Dict[str, Dict[str, Any]] = {}
        self._use_mock = True

        if not settings.mock_mode:
            try:
                from qdrant_client import QdrantClient
                from qdrant_client.models import Distance, VectorParams

                self._client = QdrantClient(url=settings.qdrant_url)
                self._ensure_collection()
                self._use_mock = False
                logger.info(f"VectorDB connected to Qdrant at {settings.qdrant_url}")
            except Exception as e:
                logger.warning(f"Qdrant unavailable ({e}), using in-memory mock store")
        else:
            logger.info("VectorDB running in mock mode (in-memory)")

    def _ensure_collection(self) -> None:
        from qdrant_client.models import Distance, VectorParams

        existing = [c.name for c in self._client.get_collections().collections]
        if settings.qdrant_collection not in existing:
            self._client.create_collection(
                collection_name=settings.qdrant_collection,
                vectors_config=VectorParams(
                    size=settings.embedding_dimensions,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created Qdrant collection: {settings.qdrant_collection}")

    async def insert(
        self,
        vector: List[float],
        payload: Dict[str, Any],
        point_id: Optional[str] = None,
    ) -> str:
        pid = point_id or str(uuid.uuid4())

        if self._use_mock:
            self._mock_store[pid] = {"vector": vector, "payload": payload}
            logger.debug(f"Mock VectorDB insert: {pid}")
            return pid

        from qdrant_client.models import PointStruct

        self._client.upsert(
            collection_name=settings.qdrant_collection,
            points=[PointStruct(id=pid, vector=vector, payload=payload)],
        )
        return pid

    async def search(
        self,
        query_vector: List[float],
        top_k: int = 5,
        filter_bill_number: Optional[str] = None,
    ) -> List[Tuple[float, Dict[str, Any]]]:
        """Returns list of (score, payload) tuples."""
        if self._use_mock:
            return self._mock_search(top_k)

        from qdrant_client.models import Filter, FieldCondition, MatchValue

        query_filter = None
        if filter_bill_number:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="bill_number",
                        match=MatchValue(value=filter_bill_number),
                    )
                ]
            )

        results = self._client.search(
            collection_name=settings.qdrant_collection,
            query_vector=query_vector,
            limit=top_k,
            query_filter=query_filter,
            with_payload=True,
        )
        return [(r.score, r.payload) for r in results]

    async def delete_by_bill_id(self, bill_id: str) -> None:
        if self._use_mock:
            self._mock_store = {
                k: v for k, v in self._mock_store.items()
                if v["payload"].get("bill_id") != bill_id
            }
            return

        from qdrant_client.models import Filter, FieldCondition, MatchValue

        self._client.delete(
            collection_name=settings.qdrant_collection,
            points_selector=Filter(
                must=[FieldCondition(key="bill_id", match=MatchValue(value=bill_id))]
            ),
        )

    def _mock_search(self, top_k: int) -> List[Tuple[float, Dict[str, Any]]]:
        if self._mock_store:
            items = list(self._mock_store.values())[:top_k]
            return [(random.uniform(0.7, 0.99), item["payload"]) for item in items]

        # Return synthetic results
        return [
            (
                round(random.uniform(0.75, 0.97), 4),
                {
                    "bill_id": f"mock-bill-{i}",
                    "bill_number": f"MOCK-{2024 + i}-00{i}",
                    "bill_title": f"Mock Legislative Act No. {i}",
                    "section_id": f"section-{i}",
                    "section_title": f"Section {i}: Regulatory Provisions",
                    "text_chunk": (
                        f"This section establishes provisions for mock bill {i}. "
                        "Regulated entities must comply with all requirements within 90 days. "
                        "Penalties for non-compliance include fines and license suspension."
                    ),
                    "rules": [
                        {
                            "rule": f"Mock rule {i}: Compliance is mandatory",
                            "actor": "Regulated entity",
                            "condition": "At all times",
                            "penalty": "Fine up to $10,000",
                        }
                    ],
                },
            )
            for i in range(1, min(top_k + 1, 6))
        ]

    @property
    def is_mock(self) -> bool:
        return self._use_mock


# Singleton
_vectordb_client: Optional[VectorDBClient] = None


def get_vectordb_client() -> VectorDBClient:
    global _vectordb_client
    if _vectordb_client is None:
        _vectordb_client = VectorDBClient()
    return _vectordb_client
