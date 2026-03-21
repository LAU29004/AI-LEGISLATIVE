import hashlib
import logging
import random
from typing import List

from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingService:
    def __init__(self):
        self._client = None
        self._use_mock = settings.mock_mode or settings.openai_api_key.startswith("sk-mock")

        if not self._use_mock:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=settings.openai_api_key)
                logger.info("EmbeddingService initialized with OpenAI")
            except Exception as e:
                logger.warning(f"OpenAI unavailable: {e}, using mock embeddings")
                self._use_mock = True

    async def embed_text(self, text: str) -> List[float]:
        if self._use_mock:
            return self._deterministic_mock_embedding(text)
        try:
            response = await self._client.embeddings.create(
                model=settings.openai_embedding_model,
                input=text[:8000],
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding failed: {e}, using mock")
            return self._deterministic_mock_embedding(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if self._use_mock:
            return [self._deterministic_mock_embedding(t) for t in texts]
        try:
            response = await self._client.embeddings.create(
                model=settings.openai_embedding_model,
                input=[t[:8000] for t in texts],
            )
            return [
                item.embedding
                for item in sorted(response.data, key=lambda x: x.index)
            ]
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            return [self._deterministic_mock_embedding(t) for t in texts]

    def _deterministic_mock_embedding(self, text: str) -> List[float]:
        """Produces a stable unit-norm vector from text for realistic mock search."""
        seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2 ** 32)
        rng = random.Random(seed)
        raw = [rng.gauss(0, 1) for _ in range(settings.embedding_dimensions)]
        norm = sum(x ** 2 for x in raw) ** 0.5
        return [x / norm for x in raw]
