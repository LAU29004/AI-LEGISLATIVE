from fastapi import APIRouter
from app.services.chat_service import generate_answer

router = APIRouter()


@router.post("/")
def chat(query: str):
    return generate_answer(query)