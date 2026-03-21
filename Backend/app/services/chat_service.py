from app.services.vector_service import search_similar


def generate_answer(query):
    chunks = search_similar(query)

    context = "\n".join(chunks)

    # simple answer (no LLM yet)
    return {
        "query": query,
        "context": context[:1000]
    }