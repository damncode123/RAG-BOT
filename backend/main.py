from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Import routers using absolute imports
from api import upload, query, auth, notifications, conversations

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="RAG Bot API",
    description="Personalized RAG chatbot API",
    version="1.0.0"
)

# CORS setup - allow all origins for now (change in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (implement these in api/ directory)
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(query.router)
app.include_router(notifications.router)
app.include_router(conversations.router)
# Add startup event to configure logging
@app.on_event("startup")
async def startup_event():
    import logging
    logging.basicConfig(level=logging.INFO)
    logging.info("RAG Bot API started") 