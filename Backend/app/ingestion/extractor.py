import asyncio
import logging
from typing import Any, Dict, List, Tuple

from app.core.llm_client import get_llm_client
from app.utils.text_cleaner import truncate_text

logger = logging.getLogger(__name__)


async def extract_section_json(
    section_id: str,
    section_title: str,
    section_text: str,
) -> Dict[str, Any]:
    """Send a single section to LLM for structured extraction."""
    llm = get_llm_client()
    truncated = truncate_text(section_text, max_chars=3000)

    try:
        result = await llm.extract_bill_structure(truncated, section_id)
        return {
            "section_id": section_id,
            "section_title": section_title,
            "raw_text": section_text,
            "rules": result.get("rules", []),
            "key_provisions": result.get("key_provisions", []),
            "affected_parties": result.get("affected_parties", []),
        }
    except Exception as e:
        logger.error(f"Extraction failed for {section_id}: {e}")
        return {
            "section_id": section_id,
            "section_title": section_title,
            "raw_text": section_text,
            "rules": [],
            "key_provisions": [],
            "affected_parties": [],
            "extraction_error": str(e),
        }


async def extract_all_sections(
    sections: List[Tuple[str, str, str]],
    concurrency: int = 3,
) -> List[Dict[str, Any]]:
    """
    Extract structured JSON for all sections with controlled concurrency.
    sections: list of (section_id, section_title, section_text)
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def extract_with_semaphore(section: Tuple[str, str, str]) -> Dict[str, Any]:
        async with semaphore:
            return await extract_section_json(*section)

    tasks = [extract_with_semaphore(s) for s in sections]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    extracted = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Section {i} extraction error: {result}")
            section_id, section_title, section_text = sections[i]
            extracted.append({
                "section_id": section_id,
                "section_title": section_title,
                "raw_text": section_text,
                "rules": [],
                "key_provisions": [],
                "affected_parties": [],
            })
        else:
            extracted.append(result)

    return extracted
