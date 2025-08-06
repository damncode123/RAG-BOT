# Import FastAPI classes and dependencies
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from pydantic import BaseModel

# Import authentication dependency and DB utility function
from api.auth import get_current_user  # Dependency to get the currently authenticated user
from db.models import get_user_conversations, create_new_conversation, get_conversation_history  # Functions to fetch and create conversations

# Initialize a router instance to define endpoints in this module
router = APIRouter()

# Request model for creating new conversation
class NewConversationRequest(BaseModel):
    title: str = "New Chat"

# Define a POST endpoint to create a new conversation
@router.post("/conversations/new")
async def create_conversation(
    request: NewConversationRequest = NewConversationRequest(),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Extract user ID from the authenticated user's data
        user_id = current_user.get("id")
        print("Creating new conversation for user ID:", user_id)

        # Create new conversation in the database
        chat_id = create_new_conversation(str(user_id))
        print("New conversation created with ID:", chat_id)

        # Return the new conversation ID
        return {"chatId": chat_id, "message": "New conversation created successfully"}

    except Exception as e:
        # If any exception occurs, print the full stack trace (for debugging)
        import traceback
        traceback.print_exc()

        # Raise HTTP 500 Internal Server Error with exception message
        raise HTTPException(status_code=500, detail=str(e))

# Define a GET endpoint to retrieve conversation history
@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Extract user ID from the authenticated user's data
        user_id = current_user.get("id")
        print(f"Getting conversation history for user {user_id}, conversation {conversation_id}")

        # Get conversation history from the database
        history = get_conversation_history(str(user_id), conversation_id)
        print("Conversation history retrieved:", history)

        # Return the conversation history
        return history

    except Exception as e:
        # If any exception occurs, print the full stack trace (for debugging)
        import traceback
        traceback.print_exc()

        # Raise HTTP 500 Internal Server Error with exception message
        raise HTTPException(status_code=500, detail=str(e))

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

# Define a DELETE endpoint to delete a conversation
@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Extract user ID from the authenticated user's data
        user_id = current_user.get("id")
        print(f"Deleting conversation {conversation_id} for user {user_id}")

        # Import the delete function (we'll create this)
        from db.models import delete_conversation_by_id

        # Delete the conversation from the database
        success = delete_conversation_by_id(str(user_id), conversation_id)

        if success:
            return {"message": "Conversation deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    except Exception as e:
        # If any exception occurs, print the full stack trace (for debugging)
        import traceback
        traceback.print_exc()

        # Raise HTTP 500 Internal Server Error with exception message
        raise HTTPException(status_code=500, detail=str(e))
