# Import necessary modules from FastAPI and Pydantic
from fastapi import APIRouter, Depends  # For routing and dependency injection
from pydantic import BaseModel  # For request body validation
from api.auth import get_current_user  # Function to get the currently authenticated user
from query.handler import handle_query  # Function to process the query with LLM and vector store

# Create a new APIRouter instance to group query-related endpoints
router = APIRouter()

# Define a request body schema using Pydantic
class QueryRequest(BaseModel):
    query: str  # The input query string from the user
    conversation_id: str = None  # Optional conversation ID for context

# Define the POST endpoint to handle query processing
@router.post("/query")
async def query_endpoint(
    request: QueryRequest,  # Automatically parses and validates the incoming JSON body
    user=Depends(get_current_user)  # Injects the authenticated user using FastAPI's dependency system
):
    # Call the handler function with the query, user ID, and conversation ID
    answer = handle_query(request.query, user["id"], request.conversation_id)

    # Return the answer in a JSON response
    return {"answer": answer}
