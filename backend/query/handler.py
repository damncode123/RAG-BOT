# Import save_search_history function to log user queries
from db.models import save_search_history, add_messages_to_conversation
import datetime
import time

# Main function to handle a user's query using Pinecone + Gemini + LlamaIndex
def handle_query(query, user_id, conversation_id=None):
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

    # Create metadata filters to only search user's documents
    from llama_index.core.vector_stores import MetadataFilters, MetadataFilter, FilterOperator

    metadata_filters = MetadataFilters(
        filters=[
            MetadataFilter(
                key="user_id",
                value=float(user_id),  # Use float to match stored data type
                operator=FilterOperator.EQ
            )
        ]
    )

    # Convert the index into a query engine using the Gemini LLM with user filtering
    query_engine = index.as_query_engine(
        llm=llm,
        filters=metadata_filters,
        similarity_top_k=5  # Return top 5 most relevant chunks
    )
    print(f"Query engine ready with user filter for user_id: {user_id}")

    # Warm up the query engine with a simple test (for new users)
    try:
        # Quick warm-up query to ensure everything is initialized
        _ = query_engine.query("test")
        print("Query engine warmed up successfully.")
    except Exception as warmup_error:
        print(f"Query engine warmup warning: {warmup_error}")
        # Continue anyway, as this is just a warmup

    # Try the query with a retry mechanism for better initialization
    max_retries = 2
    retry_delay = 1  # seconds

    for attempt in range(max_retries + 1):
        try:
            # Add a small delay for the first retry to allow proper initialization
            if attempt > 0:
                print(f"Retrying query (attempt {attempt + 1})...")
                time.sleep(retry_delay)

            # Perform the actual query
            results = query_engine.query(query)
            print("Query executed. Results:", results)

            result_text = str(results)

            # If we get a meaningful response (not the generic "cannot answer" message), break
            if result_text and not result_text.startswith("I am sorry, I cannot answer") and not result_text.startswith("This query cannot be answered"):
                break
            elif attempt < max_retries:
                # If it's a generic response and we have retries left, continue to retry
                print("Got generic response, retrying...")
                continue

        except Exception as e:
            print(f"Error during query execution (attempt {attempt + 1}): {e}")
            # Handle specific API errors
            if "ResourceExhausted" in str(e) or "429" in str(e):
                result_text = "I'm currently experiencing high demand. Please try again in a few moments. The service should be available shortly."
                break
            elif "quota" in str(e).lower():
                result_text = "The AI service is temporarily unavailable due to quota limits. Please try again later."
                break
            elif attempt == max_retries:
                # Last attempt failed
                result_text = "I'm sorry, I encountered an error while processing your request. Please try again."
                break

    # Save the query and results to user's search history in the database
    save_search_history(user_id, query, result_text)

    # If conversation_id is provided, save the messages to the conversation
    if conversation_id:
        add_messages_to_conversation(str(user_id), conversation_id, query, result_text)

    # Return the results as a string (you could also return a structured response if preferred)
    return result_text
