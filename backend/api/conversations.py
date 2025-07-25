from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from api.auth import get_current_user
from db.models import get_user_conversations

router = APIRouter()

@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    try:
        print("Current user:", current_user)
        user_id = current_user.get("id")
        print("User ID:", user_id)

        conversations = get_user_conversations(user_id)
        print("Fetched conversations:", conversations)

        return {"conversations": conversations}
    except Exception as e:
        import traceback
        traceback.print_exc()  # helpful for full stack trace
        raise HTTPException(status_code=500, detail=str(e))

