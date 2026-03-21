'''import requests   # Used to send HTTP requests (GET, POST, etc.)
import pdfplumber   # Used to extract text from PDF files

API_URL = "https://sansad.in/api_rs/legislation/getBills" # the link when you send request here , it returns the bill data in a json format

def fetch_lok_sabha_bills(page=1, size=5):  # function to get bills from API
    # the parameters dictionary is used to filter those many bills which are filtered by these parameters
    #    the blank section of value means that restriction is not applied and the value against that key is the one using which it is being
    #    filtered
    params = { # parameters dictionary
        "rajyasabha": "",
        "sessionNo": "",
        "billName": "",
        "house": "Rajya Sabha",
        "ministryName": "",
        "billType": "Government",
        "billCategory": "",
        "billStatus": "",
        "introductionDateFrom": "",
        "introductionDateTo": "",
        "passedInLsDateFrom": "",
        "passedInLsDateTo": "",
        "passedInRsDateFrom": "",
        "passedInRsDateTo": "",
        "page": page,
        "size": size,
        "locale": "en",
        "sortOn": "billIntroducedDate",
        "sortBy": "desc",
    }
    # requests.get() is function used to hit a HTTP request , it converts it into URL with all these parameters , timeout is used to wait for 20 s if 
    #    response is not received it quits
    resp = requests.get(API_URL, params=params, timeout=20)
    resp.raise_for_status() # raises an error when HTTP request fails
    data = resp.json()  # { "records": [...], "_metadata": {...} }

    items = data.get("records", [])

    bills = []
    for item in items:
        bill_id = item.get("billNumber")               # e.g. "72"
        title = item.get("billName")                   # e.g. "THE APPROPRIATION BILL, 2026"
        status = item.get("status")                    # often null now
        pdf_url = item.get("billIntroducedFile")       # full https://...getFile/...pdf

        bills.append(
            {
                "bill_id": bill_id,
                "title": title,
                "status": status,
                "pdf_url": pdf_url,
                "raw": item,
            }
        )
    return bills

def download_pdf(url, filename="bill.pdf"):
    resp = requests.get(url, timeout=60) # sends an HTTP GET request to download the pdf
    resp.raise_for_status()   #error handling
    with open(filename, "wb") as f:  # w:write   b:binary
        f.write(resp.content)
    return filename

def extract_text_from_pdf(path, max_pages=3):
    text = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages):
            if i >= max_pages:
                break
            t = page.extract_text() or ""
            text.append(t)
    return "\n\n".join(text)

if __name__ == "__main__":
    # 1. Fetch latest bills
    bills = fetch_lok_sabha_bills(page=1, size=1)  # get the newest one
    for b in bills:
        print("Bill ID:", b["bill_id"])
        print("Title:", b["title"])
        print("Status:", b["status"])
        print("PDF URL:", b["pdf_url"])
        print("=" * 60)
    if not bills:
        print("No bills found")
        raise SystemExit

    bill = bills[0]
    print("Bill ID:", bill["bill_id"])
    print("Title:", bill["title"])
    print("Status:", bill["status"])
    print("PDF URL:", bill["pdf_url"])

    if not bill["pdf_url"]:
        print("No PDF URL in JSON; inspect bill['raw'] to find the right key.")
        print(bill["raw"])
        raise SystemExit

    # 2. Download PDF
    pdf_file = download_pdf(bill["pdf_url"], "rajya_sabha_latest_bill.pdf")
    print("Downloaded to:", pdf_file)

    # 3. Extract and show first few pages of text
    text = extract_text_from_pdf(pdf_file, max_pages=2)
    print("\n=== FIRST PAGES OF BILL TEXT ===\n")
    print(text[:5000])
    print("Parameters: ")
'''



# ------------------------------------------------------------------------------------------------------------------------------------------------
import requests
from bs4 import BeautifulSoup


def extract_bills():
    url = "https://sansad.in/ls/legislation/bills"

    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")

    bills = []

    rows = soup.select("table tbody tr")

    for row in rows:
        cols = row.find_all("td")

        if len(cols) < 2:
            continue

        title = cols[1].text.strip()

        link = row.find("a", href=True)
        pdf_url = None

        if link:
            pdf_url = "https://sansad.in" + link["href"]

        bills.append({
            "id": title.replace(" ", "_"),
            "title": title,
            "pdf_url": pdf_url,
            "status": "unknown"
        })

    return bills