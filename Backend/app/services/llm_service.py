from typing import Dict, List, Optional, Tuple

from app.core.llm_client import get_llm_client


class LLMService:
    def __init__(self):
        self._client = get_llm_client()

    async def generate_answer(
        self,
        query: str,
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[str, int]:
        return await self._client.generate_answer(query, context, conversation_history)

    async def generate_summary(self, text: str, title: str) -> str:
        return await self._client.generate_summary(text, title)

    async def extract_structure(self, text: str, section_id: str) -> dict:
        return await self._client.extract_bill_structure(text, section_id)
