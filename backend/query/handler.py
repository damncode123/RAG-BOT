from db.models import save_search_history
import datetime

def handle_query(query, user_id):
    print("Connecting to Pinecone...")
    from ingestion.pipeline import pinecone_index, embed_model, GEMINI_API_KEY
    from llama_index.vector_stores.pinecone import PineconeVectorStore
    from llama_index.core.indices.vector_store import VectorStoreIndex
    from llama_index.llms.gemini import Gemini

    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    print("Vector store created.")
    index = VectorStoreIndex.from_vector_store(vector_store, embed_model=embed_model)
    print("Index loaded.")

    # Use Gemini as the LLM
    llm = Gemini(api_key=GEMINI_API_KEY, model_name="models/gemini-2.0-flash")
    query_engine = index.as_query_engine(llm=llm)
    print("Query engine ready.")

    results = query_engine.query(query)
    print("Query executed. Results:", results)

    save_search_history(user_id, query, str(results))
    return str(results)