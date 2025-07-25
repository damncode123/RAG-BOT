from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.auth import get_current_user
from query.handler import handle_query

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

@router.post("/query")
async def query_endpoint(request: QueryRequest, user=Depends(get_current_user)):
    answer = handle_query(request.query, user["id"])
    return {"answer": answer} 