from prompt_compressor import compress_pdf_to_json

result = compress_pdf_to_json("../../pdfs/appropriation_test.pdf")

print(result["title"])
print(result["compression_ratio"])
print(result["sections"].keys())