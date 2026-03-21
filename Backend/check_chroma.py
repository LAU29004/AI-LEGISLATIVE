import chromadb

client     = chromadb.PersistentClient(path="chroma_db")
collection = client.get_collection("bill_sections")

results = collection.peek(limit=5)
ids   = results["ids"]
docs  = results["documents"]
metas = results["metadatas"]

print(f"Total entries: {collection.count()}")
print("=" * 60)

for i in range(len(ids)):
    bill_number = metas[i].get("bill_number", "?")
    title       = metas[i].get("title", "?")
    section     = metas[i].get("section", "?")
    text        = (docs[i] or "")[:200]

    print(f"ID      : {ids[i]}")
    print(f"Bill    : {bill_number} | {title}")
    print(f"Section : {section}")
    print(f"Text    : {text}...")
    print("-" * 60)

input("Press Enter to exit...")