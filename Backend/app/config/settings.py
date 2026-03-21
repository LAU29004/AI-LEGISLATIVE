from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "AI Legislative Analyzer"
    app_version: str = "1.0.0"
    debug: bool = True

    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/legislative_db"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "bills_embeddings"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # OpenAI
    openai_api_key: str = "sk-mock-key"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o"
    embedding_dimensions: int = 1536

    # Ingestion
    bills_fetch_urls: str = ""
    scheduler_interval_hours: int = 3
    mock_mode: bool = True

    @property
    def bill_urls(self) -> List[str]:
        if not self.bills_fetch_urls:
            return []
        return [u.strip() for u in self.bills_fetch_urls.split(",") if u.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
