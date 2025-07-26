# Import FastAPI classes and dependencies
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

# Import authentication dependency and DB utility function
from api.auth import get_current_user  # Dependency to get the currently authenticated user
from db.models import get_user_conversations  # Function to fetch conversations from DB

# Initialize a router instance to define endpoints in this module
router = APIRouter()

# Define a GET endpoint to retrieve user's conversations
@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    try:
        # Print current user info for debugging
        print("Current user:", current_user)
        
        # Extract user ID from the authenticated user's data
        user_id = current_user.get("id")
        print("User ID:", user_id)

        # Fetch conversations from the database for this user
        conversations = get_user_conversations(user_id)
        print("Fetched conversations:", conversations)

        # Return the fetched conversations in a JSON response
        return {"conversations": conversations}

    except Exception as e:
        # If any exception occurs, print the full stack trace (for debugging)
        import traceback
        traceback.print_exc()

        # Raise HTTP 500 Internal Server Error with exception message
        raise HTTPException(status_code=500, detail=str(e))
