"""
app/main.py
===========
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import bills, chat

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Legislative AI API",
    description="AI-powered Indian legislative bill analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bills.router, prefix="/bills", tags=["bills"])
app.include_router(chat.router, tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok"}