import requests
import os

from webextract import extract_bills  # your scraper

API_URL = "https://sansad.in/api_rs/legislation/getBills"


def fetch_lok_sabha_bills(page=1, size=1):
    url = "https://sansad.in/api_rs/legislation/getBills"

    params = {
        "loksabha": "",
        "sessionNo": "",
        "billName": "",
        "house": "Lok Sabha",
        "ministryName": "",
        "billType": "Government",
        "billCategory": "",
        "billStatus": "",
        "introductionDateFrom": "",
        "introductionDateTo": "",
        "page": page,
        "size": size,
        "locale": "en",
        "sortOn": "billIntroducedDate",
        "sortBy": "desc",
    }

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
    }

    res = requests.get(url, params=params, headers=headers)

    print("Status:", res.status_code)

    try:
        data = res.json()
    except Exception:
        print("❌ JSON error:", res.text[:200])
        return []

    bills = []

    for item in data.get("records", []):
        bills.append({
            "bill_id": item.get("billNumber"),
            "title": item.get("billName"),
            "status": item.get("status"),
            "pdf_url": item.get("billIntroducedFile")
        })

    return bills

def download_pdf(url, bill_id):
    if not url:
        print("❌ No PDF URL")
        return None

    os.makedirs("data", exist_ok=True)

    file_path = f"data/{bill_id}.pdf"

    res = requests.get(url)

    if res.status_code != 200:
        print("❌ Failed to download PDF")
        return None

    with open(file_path, "wb") as f:
        f.write(res.content)

    return file_path