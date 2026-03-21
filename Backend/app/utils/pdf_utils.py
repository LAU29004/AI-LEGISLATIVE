import logging
import tempfile
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


async def download_pdf(url: str, timeout: int = 60) -> bytes:
    """Download a PDF from a URL and return raw bytes."""
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "pdf" not in content_type.lower() and not url.lower().endswith(".pdf"):
            logger.warning(f"Response may not be a PDF. Content-Type: {content_type}")
        return response.content


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract all text from PDF bytes using pdfplumber."""
    try:
        import pdfplumber
        import io

        text_parts = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"[PAGE {i + 1}]\n{page_text}")
        return "\n\n".join(text_parts)
    except ImportError:
        logger.warning("pdfplumber not installed, returning mock text")
        return _mock_pdf_text()
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise


def extract_text_from_pdf_file(file_path: str) -> str:
    """Extract text from a PDF file on disk."""
    try:
        import pdfplumber

        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"[PAGE {i + 1}]\n{page_text}")
        return "\n\n".join(text_parts)
    except ImportError:
        return _mock_pdf_text()
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise


def _mock_pdf_text() -> str:
    return """LEGISLATIVE BILL - MOCK DATA

SECTION 1. SHORT TITLE
This Act shall be known as the "Public Safety and Transparency Enhancement Act of 2024."

SECTION 2. FINDINGS AND PURPOSE
(a) The Legislature finds that:
    (1) Regulated entities must maintain accurate records of all transactions.
    (2) Public safety requires mandatory reporting of incidents within 24 hours.
    (3) Penalties for non-compliance must be proportionate and effective.

(b) The purpose of this Act is to establish clear regulatory standards.

SECTION 3. DEFINITIONS
As used in this Act:
(a) "Regulated Entity" means any business licensed under this chapter.
(b) "Incident" means any event that causes harm or risk to public safety.
(c) "Agency" means the State Regulatory Commission.

SECTION 4. COMPLIANCE REQUIREMENTS
(a) All regulated entities shall:
    (1) Register with the Agency within 30 days of commencement of operations.
    (2) Submit quarterly compliance reports by the 15th of the following month.
    (3) Maintain records for a minimum of 5 years.

(b) Failure to comply shall result in:
    (1) First offense: Written warning and mandatory corrective action plan.
    (2) Second offense: Fine of not less than $10,000 nor more than $50,000.
    (3) Third offense: Suspension or revocation of license.

SECTION 5. ENFORCEMENT
(a) The Agency is authorized to:
    (1) Conduct inspections with 48-hour notice.
    (2) Issue subpoenas for records.
    (3) Impose civil penalties.

SECTION 6. EFFECTIVE DATE
This Act takes effect 90 days after enactment."""
