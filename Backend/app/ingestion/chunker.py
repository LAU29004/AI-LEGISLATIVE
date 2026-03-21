import re


def split_by_section(text):
    pattern = r"(Section\s+\d+[A-Za-z\-]*)"

    parts = re.split(pattern, text)

    sections = []

    for i in range(1, len(parts), 2):
        title = parts[i]
        content = parts[i + 1] if i + 1 < len(parts) else ""

        sections.append({
            "section": title.strip(),
            "content": content.strip()
        })

    # fallback if no sections found
    if not sections:
        sections.append({
            "section": "full_text",
            "content": text[:2000]  # prevent huge chunk
        })

    return sections