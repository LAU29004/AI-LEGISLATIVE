import json
import logging
import time
from typing import Any, Optional

from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class RedisClient:
    """
    Redis client with in-memory dict fallback.
    Supports get/set/delete with TTL.
    """

    def __init__(self):
        self._client = None
        self._memory_cache: dict = {}
        self._ttl_map: dict = {}
        self._use_mock = True

        if not settings.mock_mode:
            try:
                import redis.asyncio as aioredis

                self._client = aioredis.from_url(settings.redis_url, decode_responses=True)
                self._use_mock = False
                logger.info("Redis client connected")
            except Exception as e:
                logger.warning(f"Redis unavailable ({e}), using in-memory cache")
        else:
            logger.info("Redis running in mock/in-memory mode")

    async def get(self, key: str) -> Optional[Any]:
        if self._use_mock:
            entry = self._memory_cache.get(key)
            if entry is None:
                return None
            ttl = self._ttl_map.get(key)
            if ttl and time.time() > ttl:
                del self._memory_cache[key]
                del self._ttl_map[key]
                return None
            return entry

        try:
            value = await self._client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
        return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        if self._use_mock:
            self._memory_cache[key] = value
            if ttl_seconds:
                self._ttl_map[key] = time.time() + ttl_seconds
            return True

        try:
            await self._client.setex(key, ttl_seconds, json.dumps(value))
            return True
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        if self._use_mock:
            self._memory_cache.pop(key, None)
            self._ttl_map.pop(key, None)
            return True

        try:
            await self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return False

    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern."""
        if self._use_mock:
            keys_to_delete = [k for k in self._memory_cache if pattern.replace("*", "") in k]
            for k in keys_to_delete:
                del self._memory_cache[k]
            return len(keys_to_delete)

        try:
            keys = await self._client.keys(pattern)
            if keys:
                await self._client.delete(*keys)
            return len(keys)
        except Exception as e:
            logger.error(f"Redis pattern delete error: {e}")
            return 0

    @property
    def is_mock(self) -> bool:
        return self._use_mock


# Singleton
_redis_client: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
    return _redis_client
