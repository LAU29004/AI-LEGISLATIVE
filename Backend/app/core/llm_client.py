import json
import logging
import random
from typing import Any, Dict, List, Optional

from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMClient:
    """
    OpenAI-backed LLM client with automatic mock fallback.
    Set MOCK_MODE=true in .env or if OPENAI_API_KEY is not set to use mocks.
    """

    def __init__(self):
        self._client = None
        self._use_mock = settings.mock_mode or settings.openai_api_key.startswith("sk-mock")

        if not self._use_mock:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=settings.openai_api_key)
                logger.info("LLM client initialized with OpenAI")
            except ImportError:
                logger.warning("openai package not available, falling back to mock")
                self._use_mock = True

    @property
    def is_mock(self) -> bool:
        return self._use_mock

    async def extract_bill_structure(self, text_chunk: str, section_id: str) -> Dict[str, Any]:
        """Extract structured JSON from a bill text chunk."""
        prompt = f"""You are a legal document analyzer. Extract structured information from this legislative bill section.

Section ID: {section_id}
Text:
{text_chunk[:3000]}

Return ONLY valid JSON with this exact structure:
{{
  "rules": [
    {{
      "rule": "What this provision requires or prohibits",
      "actor": "Who must comply (government body, person, company, etc.)",
      "condition": "Under what circumstances this applies",
      "penalty": "Consequences for non-compliance (or null if none specified)"
    }}
  ],
  "key_provisions": ["list of key points"],
  "affected_parties": ["list of affected entities"]
}}"""

        if self._use_mock:
            return self._mock_extract_structure(section_id)

        try:
            response = await self._client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=[
                    {"role": "system", "content": "You are a legal document analyzer. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=1500,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}, using mock")
            return self._mock_extract_structure(section_id)

    async def generate_answer(
        self,
        query: str,
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> tuple[str, int]:
        """Generate a natural language answer from context."""
        system_prompt = """You are an AI assistant specializing in legislative analysis. 
You help citizens, lawyers, and policymakers understand government bills and legislation.
Answer questions based ONLY on the provided legislative context.
Be precise, cite specific sections when possible, and acknowledge if information is not available in the context."""

        user_prompt = f"""Legislative Context:
{context}

User Question: {query}

Please provide a clear, accurate answer based on the legislative context above."""

        if self._use_mock:
            return self._mock_generate_answer(query), 350

        try:
            messages = [{"role": "system", "content": system_prompt}]

            if conversation_history:
                messages.extend(conversation_history[-6:])  # last 3 turns

            messages.append({"role": "user", "content": user_prompt})

            response = await self._client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=messages,
                temperature=0.3,
                max_tokens=1500,
            )
            answer = response.choices[0].message.content
            tokens = response.usage.total_tokens if response.usage else 0
            return answer, tokens
        except Exception as e:
            logger.error(f"LLM answer generation failed: {e}, using mock")
            return self._mock_generate_answer(query), 0

    async def generate_summary(self, full_text: str, title: str) -> str:
        """Generate a concise summary of a bill."""
        prompt = f"""Summarize this legislative bill in 2-3 sentences. Be concise and factual.

Title: {title}
Text: {full_text[:4000]}

Return only the summary, no preamble."""

        if self._use_mock:
            return f"This bill ({title}) addresses key legislative provisions including regulatory requirements, compliance standards, and enforcement mechanisms. It establishes new obligations for relevant stakeholders and sets out penalties for non-compliance. The bill aims to modernize existing frameworks and improve accountability."

        try:
            response = await self._client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=300,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return f"Summary not available for {title}."

    # ─── Mock helpers ────────────────────────────────────────────────────────

    def _mock_extract_structure(self, section_id: str) -> Dict[str, Any]:
        actors = ["Government agency", "Regulated entity", "Individual citizen", "Licensed operator"]
        conditions = [
            "When conducting regulated activities",
            "Upon receipt of formal notice",
            "In cases of non-compliance",
            "During annual review period",
        ]
        penalties = [
            "Fine up to $50,000 per violation",
            "License suspension or revocation",
            "Criminal prosecution",
            None,
        ]
        return {
            "rules": [
                {
                    "rule": f"Mock rule extracted from {section_id}: Entities must comply with all provisions herein.",
                    "actor": random.choice(actors),
                    "condition": random.choice(conditions),
                    "penalty": random.choice(penalties),
                },
                {
                    "rule": f"Mock rule: Reporting requirements must be fulfilled quarterly.",
                    "actor": "Licensed operator",
                    "condition": "During each calendar quarter",
                    "penalty": "Administrative fine",
                },
            ],
            "key_provisions": [
                f"Section {section_id} establishes compliance framework",
                "Mandatory reporting obligations",
                "Enforcement mechanisms and penalties",
            ],
            "affected_parties": ["Regulated businesses", "Government agencies", "General public"],
        }

    def _mock_generate_answer(self, query: str) -> str:
        return (
            f"Based on the legislative context retrieved, here is what the relevant bills indicate "
            f"regarding your query about '{query}':\n\n"
            "**Key Findings:**\n"
            "1. The relevant provisions establish clear obligations for regulated entities, "
            "requiring compliance within 90 days of enactment.\n"
            "2. Penalties for non-compliance include fines up to $50,000 per violation and "
            "potential license revocation.\n"
            "3. Exemptions apply to small businesses with fewer than 10 employees.\n\n"
            "**Note:** This is a mock response generated because the system is running in mock mode. "
            "Connect a real OpenAI API key for production-grade answers."
        )


# Singleton
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
