from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body, Path as FastAPIPath
from bson import ObjectId
from ..db import chats_collection, users_collection
from ..routes.auth import get_current_user
from ..services.rag_agent import run_rag_agent

router = APIRouter(prefix="/chat", tags=["chat"])

# Helper to serialize chat response
def make_chat_response(chat: dict) -> dict:
    return {
        "_id": str(chat["_id"]),
        "title": chat.get("title", "New Chat"),
        "isPinned": chat.get("isPinned", False),
        "isActive": chat.get("isActive", True),
        "messages": [
            {
                "role": m["role"],
                "content": m["content"],
                "contexts": [
                    {
                        "text": c["text"],
                        "filename": c["filename"],
                        "score": c.get("score", 0.0)
                    }
                    for c in m.get("contexts", [])
                ],
                "timestamp": m["timestamp"].isoformat() if isinstance(m["timestamp"], datetime) else m["timestamp"]
            }
            for m in chat.get("messages", [])
        ],
        "createdAt": chat["createdAt"].isoformat(),
        "updatedAt": chat["updatedAt"].isoformat()
    }

@router.get("/list")
async def get_chats(current_user: dict = Depends(get_current_user)):
    cursor = chats_collection.find({"userId": current_user["_id"]}).sort([("isPinned", -1), ("updatedAt", -1)])
    chats = await cursor.to_list(length=100)
    return {
        "chats": [
            {
                "_id": str(c["_id"]),
                "title": c.get("title", "New Chat"),
                "isPinned": c.get("isPinned", False),
                "isActive": c.get("isActive", True),
                "updatedAt": c["updatedAt"].isoformat()
            }
            for c in chats
        ]
    }

@router.post("/new")
async def create_chat(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    await chats_collection.update_many({"userId": user_id}, {"$set": {"isActive": False}})
    
    new_chat = {
        "userId": user_id,
        "title": "New Chat",
        "messages": [],
        "isActive": True,
        "isPinned": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    res = await chats_collection.insert_one(new_chat)
    new_chat["_id"] = res.inserted_id
    
    return {"chat": make_chat_response(new_chat)}

@router.post("/switch/{chatId}")
async def switch_chat(chatId: str = FastAPIPath(...), current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    await chats_collection.update_many({"userId": user_id}, {"$set": {"isActive": False}})
    
    chat = await chats_collection.find_one_and_update(
        {"_id": ObjectId(chatId), "userId": user_id},
        {"$set": {"isActive": True, "updatedAt": datetime.utcnow()}},
        return_document=True
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    return {"chat": make_chat_response(chat)}

@router.post("/pin/{chatId}")
async def pin_chat(chatId: str = FastAPIPath(...), current_user: dict = Depends(get_current_user)):
    chat = await chats_collection.find_one({"_id": ObjectId(chatId), "userId": current_user["_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    new_pin = not chat.get("isPinned", False)
    updated = await chats_collection.find_one_and_update(
        {"_id": ObjectId(chatId)},
        {"$set": {"isPinned": new_pin, "updatedAt": datetime.utcnow()}},
        return_document=True
    )
    return {"chat": make_chat_response(updated)}

@router.put("/rename/{chatId}")
async def rename_chat(
    chatId: str = FastAPIPath(...),
    title: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    chat = await chats_collection.find_one_and_update(
        {"_id": ObjectId(chatId), "userId": current_user["_id"]},
        {"$set": {"title": title, "updatedAt": datetime.utcnow()}},
        return_document=True
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    return {"chat": make_chat_response(chat)}

@router.delete("/{chatId}")
async def delete_chat(chatId: str = FastAPIPath(...), current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    chat = await chats_collection.find_one_and_delete({"_id": ObjectId(chatId), "userId": user_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    if chat.get("isActive", False):
        # Find next chat to activate
        next_chat = await chats_collection.find_one({"userId": user_id}, sort=[("updatedAt", -1)])
        if next_chat:
            await chats_collection.update_one({"_id": next_chat["_id"]}, {"$set": {"isActive": True}})
            
    return {"message": "Chat deleted"}

from ..models import QueryRequest

@router.post("")
@router.post("/")
@router.post("/query")
async def query_chat(req: QueryRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    query = req.query.strip()
    
    # Find active chat or create one
    chat = await chats_collection.find_one({"userId": user_id, "isActive": True})
    if not chat:
        chat = {
            "userId": user_id,
            "title": query[:50],
            "messages": [],
            "isActive": True,
            "isPinned": False,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        res = await chats_collection.insert_one(chat)
        chat["_id"] = res.inserted_id
        
    if chat.get("title") == "New Chat":
        await chats_collection.update_one({"_id": chat["_id"]}, {"$set": {"title": query[:50]}})
        chat["title"] = query[:50]
        
    # Get current history format
    history = []
    for msg in chat.get("messages", []):
        history.append({"role": msg["role"], "content": msg["content"]})
        
    # Run the RAG agent with Groq AI integration
    try:
        answer, contexts = await run_rag_agent(
            query=query,
            user_id=user_id,
            learning_style=current_user.get("learningStyle"),
            history=history
        )
    except Exception as e:
        print("Error during run_rag_agent:", str(e))
        answer = f"I apologize, but I encountered an issue processing your request. Please try again. (Details: {str(e)})"
        contexts = []
    
    # Save messages to database
    user_msg = {"role": "user", "content": query, "contexts": contexts, "timestamp": datetime.utcnow()}
    assistant_msg = {"role": "assistant", "content": answer, "contexts": [], "timestamp": datetime.utcnow()}
    
    await chats_collection.update_one(
        {"_id": chat["_id"]},
        {
            "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
            "$set": {"updatedAt": datetime.utcnow()}
        }
    )
    
    # Increment totalQueries
    await users_collection.update_one({"_id": user_id}, {"$inc": {"totalQueries": 1}})
    
    response_contexts = [
        {"text": c["text"], "filename": c["filename"], "score": c["score"]}
        for c in contexts
    ]
    
    return {
        "answer": answer,
        "contexts": response_contexts,
        "query": query,
        "chatId": str(chat["_id"])
    }

@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    chat = await chats_collection.find_one({"userId": current_user["_id"], "isActive": True})
    if not chat:
        return {"history": [], "chatId": None}
        
    resp = make_chat_response(chat)
    return {"history": resp["messages"], "chatId": resp["_id"]}

@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    await chats_collection.update_one(
        {"userId": current_user["_id"], "isActive": True},
        {"$set": {"messages": [], "title": "New Chat", "updatedAt": datetime.utcnow()}}
    )
    return {"message": "Chat history cleared"}
