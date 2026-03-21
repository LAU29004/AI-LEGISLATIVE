# Legislative Analyzer Backend Architecture

## Overview

This repository implements a backend for legislative document ingestion, vector search, and query/chat endpoints.

- `app/main.py`: FastAPI application entrypoint.
- `app/api/routes`: API endpoints for chat/bills/search.
- `app/services`: business workflows for chat, embedding, vector search, and bill processing.
- `app/repositories`: database persistence layer for bills.
- `app/models`: ORM model(s) for bills and related entities.
- `app/schemas`: Pydantic request/response models.
- `app/core`: low-level clients (LLM, Redis, vector DB clients).
- `app/ingestion`: PDF/text extraction pipelines with fetcher/parser/chunker/pipeline/scheduler.
- `app/utils`: utility functions for PDF text extraction and text cleaning.
- `chroma_db/`: vector store files persisted by the vector database.


## Directory Structure

```
backend/
├─ README.md
├─ requirements.txt
├─ run_ingestion.py
├─ webextract.py
├─ chroma_db/
│  ├─ chroma.sqlite3
│  └─ ...
├─ data/
├─ pdfs/
└─ app/
   ├─ __init__.py
   ├─ create_tables.py
   ├─ main.py
   ├─ api/
   │  ├─ __init__.py
   │  ├─ debs.py
   │  └─ routes/
   │     ├─ __init__.py
   │     ├─ bills.py
   │     ├─ chat.py
   │     └─ search.py
   ├─ config/
   │  ├─ __init__.py
   │  ├─ database.py
   │  └─ settings.py
   ├─ core/
   │  ├─ __init__.py
   │  ├─ llm_client.py
   │  ├─ redis_client.py
   │  └─ vectordb_client.py
   ├─ ingestion/
   │  ├─ __init__.py
   │  ├─ chunker.py
   │  ├─ extractor.py
   │  ├─ fetch_bills.py
   │  ├─ parser.py
   │  ├─ pipeline.py
   │  └─ scheduler.py
   ├─ models/
   │  ├─ __init__.py
   │  └─ bill.py
   ├─ repositories/
   │  ├─ __init__.py
   │  └─ bill_repo.py
   ├─ schemas/
   │  ├─ __init__.py
   │  ├─ bill_schema.py
   │  └─ chat_schema.py
   ├─ services/
   │  ├─ __init__.py
   │  ├─ bill_service.py
   │  ├─ chat_service.py
   │  ├─ embedding_service.py
   │  ├─ llm_service.py
   │  └─ vector_service.py
   └─ utils/
      ├─ __init__.py
      ├─ pdf_utils.py
      └─ text_cleaner.py
```

## Component Responsibilities

- `run_ingestion.py`: starts ingestion workflow (fetch bill list, download PDFs, extract text, create embeddings, store in DB + vector store).
- `webextract.py`: likely a one-off scraper or extractor for web sources.
- `app/config`: configuration via environment and database settings.
- `app/core`: foundational external system clients.
- `app/ingestion`: full ETL pipeline from raw bills to searchable chunks.
- `app/services/chat_service`: delegates similarity search and builds returned context.
- `app/services/vector_service`: encapsulates vector DB search + retrieving top chunks.
- `app/services/embedding_service`: creates embeddings for text chunks.
- `app/api/routes`: REST API surface – `/chat`, `/bills`, `/search`.

## Request/Response Flow

1. Client calls `/chat` or `/bills` POST with `query`.
2. route calls `chat_service.generate_answer(query)`.
3. `search_similar` in `vector_service` queries vector DB for top chunks.
4. chunks joined into context and returned as JSON.

## Ingestion Flow (high level)

1. `fetch_bills.py`: discover bill documents/URLs.
2. `extractor.py`/`parser.py`: extract raw text from PDFs and parse structure.
3. `chunker.py`: split long text into chunks for embedding.
4. `embedding_service.py`: create embedding vectors.
5. `pipeline.py`: store metadata in SQL DB + vector store.
6. `scheduler.py`: run ingestion regularly.

## Persistence

- relational storage via SQLAlchemy models in `app/models` + `app/repositories`.
- vector search storage in `app/core/vectordb_client.py` and local `chroma_db/`.

## Notes

- currently, chat response is context-return only (no LLM prompt engine in `chat_service`).
- architecture is modular and ready to plug OpenAI/LLM in `app/services/llm_service.py` + `app/core/llm_client.py`.
