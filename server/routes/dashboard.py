from fastapi import APIRouter, Depends
from bson import ObjectId
from ..db import documents_collection
from ..routes.auth import get_current_user
from ..routes.documents import make_document_response
from ..services.recommendation import recommend_content

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    # DB aggregation or counts
    total_docs = await documents_collection.count_documents({"userId": user_id})
    completed_docs = await documents_collection.count_documents({"userId": user_id, "isCompleted": True})
    
    # Get active documents (excluding content and chunks to save bandwidth)
    cursor = documents_collection.find({"userId": user_id}).sort("createdAt", -1)
    documents = await cursor.to_list(length=100)
    
    completion_rate = int((completed_docs / total_docs) * 100) if total_docs > 0 else 0
    
    recommendations = []
    if current_user.get("learningStyle"):
        recommendations = recommend_content(
            current_user["learningStyle"], 
            current_user.get("questionnaire", [])
        )
        
    return {
        "stats": {
            "totalDocs": total_docs,
            "completedDocs": completed_docs,
            "completionRate": completion_rate,
            "learningStyle": current_user.get("learningStyle", "Analysis Pending") or "Analysis Pending"
        },
        "documents": [make_document_response(d) for d in documents],
        "recommendations": recommendations
    }
