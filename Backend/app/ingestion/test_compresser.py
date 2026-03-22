# from prompt_compressor import compress_pdf_to_json

# result = compress_pdf_to_json("../../pdfs/appropriation_test.pdf")

# print(result["title"])
# print(result["compression_ratio"])
# print(result["sections"].keys())

# import requests
# resp = requests.get("https://sansad.in/api_rs/legislation/getBills", params={
#     "house": "Lok Sabha", "billType": "Government",
#     "page": 1, "size": 1, "locale": "en",
#     "sortOn": "billIntroducedDate", "sortBy": "desc"
# })
# print(resp.json()["records"][0].keys())