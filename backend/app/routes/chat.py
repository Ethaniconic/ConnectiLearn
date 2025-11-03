"""
Chat route handler
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatMessage, ChatResponse
from app.services.rag_service import rag_service
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """
    Handle chat messages and return AI responses with RAG
    
    Args:
        message: User's chat message
        
    Returns:
        AI response with context information
    """
    try:
        # Search for relevant context in vector database
        context = rag_service.search(message.message, top_k=3)
        
        # Generate AI response with context
        response = ai_service.generate_response(message.message, context)
        
        # Extract filenames from context
        context_files = [doc["filename"] for doc in context] if context else []
        
        return ChatResponse(
            response=response,
            context_used=context_files
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")
