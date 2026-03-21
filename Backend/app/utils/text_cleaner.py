import re
import unicodedata


def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.replace("\xa0", " ").replace("\t", " ")
    text = re.sub(r"\[PAGE \d+\]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]", "", text)
    return text.strip()


def normalize_section_title(title: str) -> str:
    title = title.strip()
    title = re.sub(r"\s+", " ", title)
    return title.title()


def truncate_text(text: str, max_chars: int = 3000) -> str:
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_period = truncated.rfind(".")
    if last_period > max_chars * 0.7:
        return truncated[: last_period + 1]
    return truncated + "..."


def extract_bill_number_from_filename(filename: str) -> str:
    name = filename.replace(".pdf", "").replace("-", " ").replace("_", " ")
    match = re.search(r"(HB|SB|HR|SR|AB|SJR|HJR)[\s-]?\d+", name, re.IGNORECASE)
    if match:
        return match.group(0).upper().replace(" ", "-")
    return name.strip().upper()
