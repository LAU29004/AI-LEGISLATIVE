# AI Legislative Analyzer — Backend

Production-ready FastAPI backend for AI-powered analysis of government legislation.

## Quick Start

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env .env.local  # edit secrets if needed
uvicorn app.main:app --reload
```

Open **http://localhost:8000/docs** for the interactive API explorer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Application                    │
│  POST /chat   GET /bills   GET /bills/{id}   GET /search │
└──────────┬───────────────────────────┬───────────────────┘
           │                           │
   ┌───────▼────────┐        ┌────────▼────────┐
   │  Query Pipeline │        │ Ingestion Pipeline│
   │  (online)       │        │ (offline/scheduled│
   └───────┬────────┘        └────────┬─────────┘
           │                           │
    embed query               fetch PDF → extract text
           │                  chunk sections → LLM extract JSON
    vector search             store PostgreSQL + VectorDB
           │
    retrieve chunks
           │
    LLM → answer
```

### Component Map

| Layer | Files | Responsibility |
|---|---|---|
| **Routes** | `api/routes/{chat,bills,search}.py` | HTTP endpoints, request validation |
| **Services** | `services/{chat,bill,embedding,vector,llm}_service.py` | Business logic |
| **Ingestion** | `ingestion/{pipeline,fetch_bills,parser,chunker,extractor,scheduler}.py` | PDF → structured JSON → vector store |
| **Core clients** | `core/{llm,vectordb,redis}_client.py` | External service adapters with mock fallbacks |
| **Repositories** | `repositories/bill_repo.py` | Database queries |
| **Models/Schemas** | `models/`, `schemas/` | SQLAlchemy ORM + Pydantic validation |

---

## API Endpoints

### `POST /chat`
Query legislation in natural language.

```json
// Request
{
  "query": "What are the penalties for non-compliance?",
  "top_k": 5,
  "conversation_history": [],
  "bill_filter": null
}

// Response
{
  "answer": "Based on the legislative context...",
  "sources": [
    {
      "bill_id": "abc-123",
      "bill_number": "HB-2024-001",
      "bill_title": "Public Safety Act",
      "section": "Section 4. Compliance Requirements",
      "relevance_score": 0.9127
    }
  ],
  "query": "...",
  "model_used": "gpt-4o",
  "tokens_used": 842,
  "cached": false
}
```

### `GET /bills`
List all ingested bills with pagination (`?skip=0&limit=50`).

### `GET /bills/{id}`
Full bill detail including `structured_json`.

### `POST /bills/ingest`
Trigger ingestion of a bill by URL (runs in background).

```json
{ "url": "https://gov.example.com/bill.pdf", "bill_number": "HB-2024-999" }
```

### `GET /search?q=your+query`
Semantic vector search across all bill sections.

### `GET /chat/health`
Check LLM and VectorDB connectivity status.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL async connection string |
| `OPENAI_API_KEY` | `sk-mock-key` | OpenAI API key |
| `OPENAI_CHAT_MODEL` | `gpt-4o` | Model for answer generation |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant vector database URL |
| `QDRANT_COLLECTION` | `bills_embeddings` | Qdrant collection name |
| `REDIS_URL` | `redis://localhost:6379` | Redis URL for caching |
| `MOCK_MODE` | `true` | Use in-memory mocks for all external services |
| `SCHEDULER_INTERVAL_HOURS` | `3` | Hours between ingestion runs |
| `BILLS_FETCH_URLS` | _(empty)_ | Comma-separated bill PDF URLs for scheduler |

---

## Mock Mode (default)

With `MOCK_MODE=true`, the app runs **completely standalone** with no external dependencies:

- **PostgreSQL** → in-memory dict store (via pipeline state)
- **Qdrant** → in-memory Python dict
- **Redis** → in-memory dict with TTL
- **OpenAI embeddings** → deterministic MD5-seeded unit vectors (same text = same vector)
- **OpenAI chat** → structured mock responses with real-looking format
- **PDF download** → returns synthetic 6-section bill text

This makes local development, CI, and demos work with zero infrastructure.

---

## Production Setup (Docker Compose)

```yaml
version: "3.9"
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [postgres, qdrant, redis]

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: legislative_db
      POSTGRES_PASSWORD: password

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

Then set `MOCK_MODE=false` in `.env` and add your `OPENAI_API_KEY`.

---

## Ingestion Pipeline Detail

```
URL → download PDF
    → pdfplumber text extraction
    → regex section splitter (SECTION N / ARTICLE / CHAPTER patterns)
    → fallback paragraph chunker if no sections detected
    → asyncio.Semaphore(3) concurrent LLM calls per section
    → structured JSON: { rules[], key_provisions[], affected_parties[] }
    → PostgreSQL: bill metadata + structured_json column
    → VectorDB: one point per section with full payload
    → APScheduler: reruns every N hours, skips already-ingested bills
```

---

## Running Tests

```bash
# Quick smoke test (no pytest needed)
PYTHONPATH=. python -c "
import asyncio
from app.services.chat_service import ChatService
async def main():
    r = await ChatService().answer_query('What is this bill about?')
    print('Chat OK:', r.answer[:80])
asyncio.run(main())
"
```
