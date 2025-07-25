from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict
from .auth import get_current_user

router = APIRouter()

# In-memory store for user WebSocket connections (user_id -> WebSocket)
active_connections: Dict[int, WebSocket] = {}

# WebSocket endpoint for notifications
def get_user_id_from_query(websocket: WebSocket):
    # Helper to extract user_id from query params (for demo; use JWT in production)
    user_id = websocket.query_params.get("user_id")
    if user_id is not None:
        return int(user_id)
    return None

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    user_id = get_user_id_from_query(websocket)
    if user_id is None:
        await websocket.close(code=1008)
        return
    active_connections[user_id] = websocket
    try:
        while True:
            # Keep the connection alive; receive messages if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Remove connection on disconnect
        if user_id in active_connections:
            del active_connections[user_id]

# Function to send notification to a user (call from ingestion pipeline, etc.)
def send_notification(user_id: int, message: str):
    websocket = active_connections.get(user_id)
    if websocket:
        import asyncio
        asyncio.create_task(websocket.send_text(message))
    # In production, consider fallback to email/SMS if user is not connected 