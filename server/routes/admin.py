from fastapi import APIRouter, Depends, HTTPException, Body, Path as FastAPIPath
from fastapi.responses import StreamingResponse
import io
import csv
from datetime import datetime
from bson import ObjectId
from ..db import users_collection, documents_collection, chats_collection, behavior_collection
from ..routes.auth import get_current_admin, make_user_response

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_admin_stats(current_admin: dict = Depends(get_current_admin)):
    total_users = await users_collection.count_documents({})
    total_documents = await documents_collection.count_documents({})
    total_chats = await chats_collection.count_documents({})
    
    # 1. Aggregated study styles counts
    pipeline = [
        {"$group": {"_id": "$learningStyle", "count": {"$sum": 1}}}
    ]
    style_counts_cursor = users_collection.aggregate(pipeline)
    style_counts = {"Visual": 0, "Auditory": 0, "ReadWrite": 0, "Kinesthetic": 0}
    async for item in style_counts_cursor:
        style = item["_id"]
        if style in style_counts:
            style_counts[style] = item["count"]
            
    # 2. Aggregated global academic research metrics
    cursor = behavior_collection.find({}, {"userId": 1, "pagePath": 1, "totalTimeMs": 1, "tabSwitchCount": 1})
    all_metrics = await cursor.to_list(length=5000)
    
    user_data = {} # userId -> modality -> {timeMs, tabSwitches}
    for m in all_metrics:
        uid = str(m.get("userId", "unknown"))
        path = m.get("pagePath", "").lower()
        t = m.get("totalTimeMs", 0)
        s = m.get("tabSwitchCount", 0)
        
        if uid not in user_data:
            user_data[uid] = {
                "visual": {"timeMs": 0, "tabSwitches": 0},
                "auditory": {"timeMs": 0, "tabSwitches": 0},
                "kinesthetic": {"timeMs": 0, "tabSwitches": 0},
                "readwrite": {"timeMs": 0, "tabSwitches": 0}
            }
            
        if "mode=visual" in path:
            user_data[uid]["visual"]["timeMs"] += t
            user_data[uid]["visual"]["tabSwitches"] += s
        elif "mode=auditory" in path:
            user_data[uid]["auditory"]["timeMs"] += t
            user_data[uid]["auditory"]["tabSwitches"] += s
        elif "mode=kinesthetic" in path:
            user_data[uid]["kinesthetic"]["timeMs"] += t
            user_data[uid]["kinesthetic"]["tabSwitches"] += s
        elif "mode=readwrite" in path or "/chat" in path:
            user_data[uid]["readwrite"]["timeMs"] += t
            user_data[uid]["readwrite"]["tabSwitches"] += s

    # Get users styles to calculate Aligned vs Misaligned study
    users_cursor = users_collection.find({}, {"_id": 1, "learningStyle": 1})
    users_styles = {str(u["_id"]): u.get("learningStyle") for u in await users_cursor.to_list(length=1000)}

    global_modality_times = {"visual": 0.0, "auditory": 0.0, "kinesthetic": 0.0, "readwrite": 0.0}
    global_modality_focus = {"visual": 0.0, "auditory": 0.0, "kinesthetic": 0.0, "readwrite": 0.0}
    modality_counts = {"visual": 0, "auditory": 0, "kinesthetic": 0, "readwrite": 0}
    
    aligned_focus_sum = 0.0
    aligned_focus_count = 0
    misaligned_focus_sum = 0.0
    misaligned_focus_count = 0
    
    quiz_switches_total = 0
    quiz_time_total_ms = 0

    for uid, modes in user_data.items():
        style = users_styles.get(uid)
        style_map = {"Visual": "visual", "Auditory": "auditory", "ReadWrite": "readwrite", "Kinesthetic": "kinesthetic"}
        target_mode = style_map.get(style) if style else None
        
        for mod, mdata in modes.items():
            t_ms = mdata["timeMs"]
            switches = mdata["tabSwitches"]
            
            if t_ms > 0:
                t_min = t_ms / 60000.0
                global_modality_times[mod] += t_min
                modality_counts[mod] += 1
                
                # Modality focus score
                penalty = (switches / max(t_min, 1.0)) * 8.0
                f_score = max(0.0, min(100.0, 100.0 - penalty))
                global_modality_focus[mod] += f_score
                
                # Check alignment
                if target_mode:
                    if mod == target_mode:
                        aligned_focus_sum += f_score
                        aligned_focus_count += 1
                    else:
                        misaligned_focus_sum += f_score
                        misaligned_focus_count += 1

                # Special case: kinesthetic quiz tracking for distraction
                if mod == "kinesthetic":
                    quiz_switches_total += switches
                    quiz_time_total_ms += t_ms

    # Calculate averages
    num_users = len(user_data) or 1
    avg_modality_times = {m: round(t / num_users, 2) for m, t in global_modality_times.items()}
    avg_modality_focus = {m: round(f / (modality_counts[m] or 1), 2) for m, f in global_modality_focus.items()}
    
    avg_aligned_focus = round(aligned_focus_sum / (aligned_focus_count or 1), 2)
    avg_misaligned_focus = round(misaligned_focus_sum / (misaligned_focus_count or 1), 2)
    
    quiz_hours = (quiz_time_total_ms / 3600000.0) or 1.0
    avg_quiz_disruptions = round(quiz_switches_total / quiz_hours, 2)

    recent_users_cursor = users_collection.find().sort("createdAt", -1).limit(5)
    recent_users = await recent_users_cursor.to_list(length=5)
    
    return {
        "totalUsers": total_users,
        "totalDocuments": total_documents,
        "totalChats": total_chats,
        "recentUsers": [make_user_response(u) for u in recent_users],
        "styleDistribution": style_counts,
        "globalResearchMetrics": {
            "avgModalityTimes": avg_modality_times,
            "avgModalityFocus": avg_modality_focus,
            "avgAlignedFocus": avg_aligned_focus,
            "avgMisalignedFocus": avg_misaligned_focus,
            "avgQuizDisruptionsPerHour": avg_quiz_disruptions
        }
    }

@router.get("/export/csv")
async def export_research_data_csv(current_admin: dict = Depends(get_current_admin)):
    users_cursor = users_collection.find()
    users = await users_cursor.to_list(length=1000)
    
    behavior_cursor = behavior_collection.find()
    all_metrics = await behavior_cursor.to_list(length=10000)
    
    user_behavior = {}
    for m in all_metrics:
        uid = str(m.get("userId", ""))
        if not uid:
            continue
        path = m.get("pagePath", "").lower()
        t = m.get("totalTimeMs", 0)
        s = m.get("tabSwitchCount", 0)
        
        if uid not in user_behavior:
            user_behavior[uid] = {
                "visual_time": 0, "visual_switches": 0,
                "auditory_time": 0, "auditory_switches": 0,
                "readwrite_time": 0, "readwrite_switches": 0,
                "kinesthetic_time": 0, "kinesthetic_switches": 0
            }
            
        if "mode=visual" in path:
            user_behavior[uid]["visual_time"] += t
            user_behavior[uid]["visual_switches"] += s
        elif "mode=auditory" in path:
            user_behavior[uid]["auditory_time"] += t
            user_behavior[uid]["auditory_switches"] += s
        elif "mode=kinesthetic" in path:
            user_behavior[uid]["kinesthetic_time"] += t
            user_behavior[uid]["kinesthetic_switches"] += s
        elif "mode=readwrite" in path or "/chat" in path:
            user_behavior[uid]["readwrite_time"] += t
            user_behavior[uid]["readwrite_switches"] += s

    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "user_id", "name", "email", "learning_style", "questionnaire_completed",
        "score_visual", "score_auditory", "score_readwrite", "score_kinesthetic",
        "time_visual_min", "switches_visual",
        "time_auditory_min", "switches_auditory",
        "time_readwrite_min", "switches_readwrite",
        "time_kinesthetic_min", "switches_kinesthetic",
        "total_active_time_min", "overall_focus_score", "created_at"
    ])
    
    for u in users:
        uid = str(u["_id"])
        scores = u.get("varkScores", {})
        
        ub = user_behavior.get(uid, {
            "visual_time": 0, "visual_switches": 0,
            "auditory_time": 0, "auditory_switches": 0,
            "readwrite_time": 0, "readwrite_switches": 0,
            "kinesthetic_time": 0, "kinesthetic_switches": 0
        })
        
        t_vis = ub["visual_time"] / 60000.0
        t_aud = ub["auditory_time"] / 60000.0
        t_rw = ub["readwrite_time"] / 60000.0
        t_kin = ub["kinesthetic_time"] / 60000.0
        total_time = t_vis + t_aud + t_rw + t_kin
        
        total_switches = (
            ub["visual_switches"] + ub["auditory_switches"] + 
            ub["readwrite_switches"] + ub["kinesthetic_switches"]
        )
        
        if total_time > 0:
            penalty = (total_switches / max(total_time, 1.0)) * 8.0
            focus_score = round(max(0.0, min(100.0, 100.0 - penalty)), 2)
        else:
            focus_score = 100.0
            
        writer.writerow([
            uid,
            u.get("name", ""),
            u.get("email", ""),
            u.get("learningStyle", "Analysis Pending") or "Analysis Pending",
            u.get("questionnaireCompleted", False),
            scores.get("Visual", 0),
            scores.get("Auditory", 0),
            scores.get("ReadWrite", 0),
            scores.get("Kinesthetic", 0),
            round(t_vis, 2), ub["visual_switches"],
            round(t_aud, 2), ub["auditory_switches"],
            round(t_rw, 2), ub["readwrite_switches"],
            round(t_kin, 2), ub["kinesthetic_switches"],
            round(total_time, 2),
            focus_score,
            u.get("createdAt").isoformat() if isinstance(u.get("createdAt"), datetime) else str(u.get("createdAt", ""))
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=connectilearn_research_data.csv"}
    )

@router.get("/users")
async def get_all_users(current_admin: dict = Depends(get_current_admin)):
    cursor = users_collection.find().sort("createdAt", -1)
    users = await cursor.to_list(length=500)
    return {
        "users": [make_user_response(u) for u in users]
    }

@router.delete("/users/{id}")
async def delete_user(id: str = FastAPIPath(...), current_admin: dict = Depends(get_current_admin)):
    user_id = ObjectId(id)
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Delete user, their documents, and their chats
    await users_collection.delete_one({"_id": user_id})
    await documents_collection.delete_many({"userId": user_id})
    await chats_collection.delete_many({"userId": user_id})
    
    return {"message": "User deleted"}

@router.patch("/users/{id}/role")
async def update_user_role(
    id: str = FastAPIPath(...),
    role: str = Body(..., embed=True),
    current_admin: dict = Depends(get_current_admin)
):
    if role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    user_id = ObjectId(id)
    user = await users_collection.find_one_and_update(
        {"_id": user_id},
        {"$set": {"role": role}},
        return_document=True
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "user": make_user_response(user)
    }

@router.get("/documents")
async def get_all_documents(current_admin: dict = Depends(get_current_admin)):
    # Find all documents
    cursor = documents_collection.find().sort("createdAt", -1)
    documents = await cursor.to_list(length=1000)
    
    docs_with_users = []
    for doc in documents:
        user = await users_collection.find_one({"_id": doc["userId"]})
        user_info = {"name": user["name"], "email": user["email"]} if user else {"name": "Deleted User", "email": ""}
        
        doc_resp = {
            "_id": str(doc["_id"]),
            "filename": doc["filename"],
            "originalName": doc["originalName"],
            "filepath": doc["filepath"],
            "fileType": doc["fileType"],
            "size": doc["size"],
            "wordCount": doc.get("wordCount", 0),
            "status": doc.get("status", "ready"),
            "isCompleted": doc.get("isCompleted", False),
            "createdAt": doc["createdAt"].isoformat(),
            "userId": user_info
        }
        docs_with_users.append(doc_resp)
        
    return {
        "documents": docs_with_users
    }
