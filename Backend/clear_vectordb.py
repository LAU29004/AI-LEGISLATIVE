import chromadb

client = chromadb.PersistentClient(path="chroma_db")
collection = client.get_collection(name="bill_sections")

# Get all IDs then delete them
results = collection.get()
ids = results["ids"]

print("Docs to delete:", len(ids))
if ids:
    collection.delete(ids=ids)
    print("All documents deleted from 'bill_section'.")
else:
    print("Collection already empty.")

input("Press Enter to exit...")