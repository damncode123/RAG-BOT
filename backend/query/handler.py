# Import save_search_history function to log user queries
from db.models import save_search_history
import datetime

# Main function to handle a user's query using Pinecone + Gemini + LlamaIndex
def handle_query(query, user_id):
    print("Connecting to Pinecone...")

    # Lazy import: importing only when function is called to avoid unnecessary global loads
    from ingestion.pipeline import pinecone_index, embed_model, GEMINI_API_KEY
    from llama_index.vector_stores.pinecone import PineconeVectorStore  # Interface to connect with Pinecone
    from llama_index.core.indices.vector_store import VectorStoreIndex  # High-level index built on vector store
    from llama_index.llms.gemini import Gemini  # LLM wrapper for Gemini

    # Create Pinecone vector store instance using the existing index
    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    print("Vector store created.")

    # Load index using embedding model and vector store
    index = VectorStoreIndex.from_vector_store(vector_store, embed_model=embed_model)
    print("Index loaded.")

    # Instantiate Gemini as the LLM with provided API key
    llm = Gemini(api_key=GEMINI_API_KEY, model_name="models/gemini-2.0-flash")

    # Convert the index into a query engine using the Gemini LLM
    query_engine = index.as_query_engine(llm=llm)
    print("Query engine ready.")

    # Perform the actual query
    results = query_engine.query(query)
    print("Query executed. Results:", results)

    # Save the query and results to user's search history in the database
    save_search_history(user_id, query, str(results))

    # Return the results as a string (you could also return a structured response if preferred)
    return str(results)
