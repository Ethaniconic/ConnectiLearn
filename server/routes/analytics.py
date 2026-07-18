from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Body
from jose import jwt, JWTError
from bson import ObjectId
from ..db import behavior_collection, users_collection
from ..config import settings
from ..routes.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

MAX_DURATION_MS = 4 * 60 * 60 * 1000
MAX_TAB_SWITCHES = 200

@router.post("/track")
async def track_behavior(
    user_agent: str = Header(None, alias="User-Agent"),
    authorization: str = Header(None),
    payload: dict = Body(...),
):
    # Determine token: Authorization header first (normal requests),
    # then _token from body (sendBeacon unload requests which cannot set headers)
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    elif payload.get("_token"):
        token = payload.pop("_token")

    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        decoded = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = decoded.get("id")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=401, detail="Invalid token")
        current_user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


    session_id = payload.get("sessionId")
    page_path = payload.get("pagePath")
    duration_ms = payload.get("durationMs", 0)
    tab_switches = payload.get("tabSwitches", 0)
    increment_visit = payload.get("incrementVisit", False)
    reason = payload.get("reason", "heartbeat")
    occurred_at_str = payload.get("occurredAt")
    
    if not session_id or not isinstance(session_id, str):
        raise HTTPException(status_code=400, detail="Valid sessionId is required")
        
    if not page_path or not isinstance(page_path, str) or not page_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Valid pagePath is required")
        
    safe_duration = min(max(int(duration_ms) or 0, 0), MAX_DURATION_MS)
    safe_tab_switches = min(max(int(tab_switches) or 0, 0), MAX_TAB_SWITCHES)
    safe_visit_increment = 1 if increment_visit else 0
    
    if safe_duration == 0 and safe_tab_switches == 0 and safe_visit_increment == 0:
        return {"ok": True, "skipped": True}
        
    try:
        occurred_at = datetime.fromisoformat(occurred_at_str.replace("Z", "+00:00")) if occurred_at_str else datetime.utcnow()
    except Exception:
        occurred_at = datetime.utcnow()
        
    # Perform upsert
    metric = await behavior_collection.find_one_and_update(
        {
            "userId": current_user["_id"],
            "sessionId": session_id.strip(),
            "pagePath": page_path.strip()
        },
        {
            "$inc": {
                "totalTimeMs": safe_duration,
                "tabSwitchCount": safe_tab_switches,
                "visitCount": safe_visit_increment
            },
            "$set": {
                "lastSeenAt": occurred_at,
                "lastReason": reason[:50] if isinstance(reason, str) else "heartbeat",
                "lastUserAgent": user_agent[:300] if user_agent else ""
            },
            "$setOnInsert": {
                "firstSeenAt": occurred_at
            }
        },
        upsert=True,
        return_document=True
    )
    
    return {
        "ok": True,
        "metric": {
            "id": str(metric["_id"]),
            "totalTimeMs": metric["totalTimeMs"],
            "tabSwitchCount": metric["tabSwitchCount"],
            "visitCount": metric["visitCount"]
        }
    }

@router.get("/summary")
async def get_analytics_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    recommended_style = current_user.get("learningStyle", "")
    
    # Aggregate overall stats
    pipeline_overall = [
        {"$match": {"userId": user_id}},
        {
            "$group": {
                "_id": None,
                "totalTimeMs": {"$sum": "$totalTimeMs"},
                "totalTabSwitches": {"$sum": "$tabSwitchCount"},
                "totalVisits": {"$sum": "$visitCount"},
                "trackedPages": {"$addToSet": "$pagePath"}
            }
        }
    ]
    
    overall_res = await behavior_collection.aggregate(pipeline_overall).to_list(length=1)
    overall = overall_res[0] if overall_res else {}
    
    # Breakdown by page Path
    pipeline_pages = [
        {"$match": {"userId": user_id}},
        {
            "$group": {
                "_id": "$pagePath",
                "totalTimeMs": {"$sum": "$totalTimeMs"},
                "tabSwitchCount": {"$sum": "$tabSwitchCount"},
                "visitCount": {"$sum": "$visitCount"},
                "lastSeenAt": {"$max": "$lastSeenAt"}
            }
        },
        {"$sort": {"totalTimeMs": -1}},
        {"$limit": 10}
    ]
    
    pages_res = await behavior_collection.aggregate(pipeline_pages).to_list(length=10)
    
    total_time_ms = overall.get("totalTimeMs", 0)
    total_tab_switches = overall.get("totalTabSwitches", 0)
    total_visits = overall.get("totalVisits", 0)
    tracked_pages_count = len(overall.get("trackedPages", []))
    
    # Calculate focus scores
    tab_switches_per_hour = 0.0
    if total_time_ms > 0:
        hours = total_time_ms / (60 * 60 * 1000)
        tab_switches_per_hour = round(total_tab_switches / hours, 2)
        
    focus_penalty = (total_tab_switches / max(total_time_ms / 60000, 1.0)) * 8.0
    focus_score = max(0, min(100, round(100 - focus_penalty)))
    
    # --- Advanced Research Metrics (Brainstormed for International Conference Paper) ---
    # Group engagement by VARK modality:
    modality_engagement = {
        "visual": {"timeMs": 0, "tabSwitches": 0},
        "auditory": {"timeMs": 0, "tabSwitches": 0},
        "kinesthetic": {"timeMs": 0, "tabSwitches": 0},
        "readwrite": {"timeMs": 0, "tabSwitches": 0}
    }
    
    all_metrics = await behavior_collection.find(
        {"userId": user_id},
        {"pagePath": 1, "totalTimeMs": 1, "tabSwitchCount": 1}
    ).to_list(length=1000)
    for m in all_metrics:
        path = m.get("pagePath", "").lower()
        t = m.get("totalTimeMs", 0)
        s = m.get("tabSwitchCount", 0)
        
        # Categorize path into modalities
        if "mode=visual" in path:
            modality_engagement["visual"]["timeMs"] += t
            modality_engagement["visual"]["tabSwitches"] += s
        elif "mode=auditory" in path:
            modality_engagement["auditory"]["timeMs"] += t
            modality_engagement["auditory"]["tabSwitches"] += s
        elif "mode=kinesthetic" in path:
            modality_engagement["kinesthetic"]["timeMs"] += t
            modality_engagement["kinesthetic"]["tabSwitches"] += s
        elif "mode=readwrite" in path or "/chat" in path:
            modality_engagement["readwrite"]["timeMs"] += t
            modality_engagement["readwrite"]["tabSwitches"] += s
            
    # Calculate Focus Score per Modality
    for mod, data in modality_engagement.items():
        m_time = data["timeMs"]
        m_switches = data["tabSwitches"]
        m_penalty = (m_switches / max(m_time / 60000, 1.0)) * 8.0
        modality_engagement[mod]["focusScore"] = max(0, min(100, round(100 - m_penalty)))
        modality_engagement[mod]["activeMinutes"] = round(m_time / 60000)
        
    # Analyze Modality Alignment
    aligned_time = 0
    aligned_switches = 0
    misaligned_time = 0
    misaligned_switches = 0
    
    style_to_mode = {
        "Visual": "visual",
        "Auditory": "auditory",
        "Kinesthetic": "kinesthetic",
        "ReadWrite": "readwrite"
    }
    recommended_mode = style_to_mode.get(recommended_style)
    
    for mod, data in modality_engagement.items():
        if recommended_mode:
            if mod == recommended_mode:
                aligned_time += data["timeMs"]
                aligned_switches += data["tabSwitches"]
            else:
                # Exclude general non-learning pages from misaligned
                misaligned_time += data["timeMs"]
                misaligned_switches += data["tabSwitches"]
                
    aligned_penalty = (aligned_switches / max(aligned_time / 60000, 1.0)) * 8.0 if aligned_time > 0 else 0
    aligned_focus = max(0, min(100, round(100 - aligned_penalty))) if aligned_time > 0 else 100
    
    misaligned_penalty = (misaligned_switches / max(misaligned_time / 60000, 1.0)) * 8.0 if misaligned_time > 0 else 0
    misaligned_focus = max(0, min(100, round(100 - misaligned_penalty))) if misaligned_time > 0 else 100
    
    # Tab switches specifically on the quiz screen
    quiz_metrics = [m for m in all_metrics if "mode=kinesthetic" in m.get("pagePath", "").lower()]
    quiz_tab_switches = sum(qm.get("tabSwitchCount", 0) for qm in quiz_metrics)
    
    return {
        "summary": {
            "totalTimeMs": total_time_ms,
            "totalActiveMinutes": round(total_time_ms / 60000),
            "totalTabSwitches": total_tab_switches,
            "totalVisits": total_visits,
            "trackedPages": tracked_pages_count,
            "tabSwitchesPerHour": tab_switches_per_hour,
            "focusScore": focus_score
        },
        "pageBreakdown": [
            {
                "pagePath": p["_id"],
                "totalTimeMs": p["totalTimeMs"],
                "totalActiveMinutes": round(p["totalTimeMs"] / 60000),
                "tabSwitchCount": p["tabSwitchCount"],
                "visitCount": p["visitCount"],
                "lastSeenAt": p["lastSeenAt"].isoformat() if isinstance(p["lastSeenAt"], datetime) else p["lastSeenAt"]
            }
            for p in pages_res
        ],
        "researchMetrics": {
            "modalityEngagement": modality_engagement,
            "alignmentComparison": {
                "alignedStudyTimeMinutes": round(aligned_time / 60000),
                "misalignedStudyTimeMinutes": round(misaligned_time / 60000),
                "alignedFocusScore": aligned_focus,
                "misalignedFocusScore": misaligned_focus,
                "hypothesisVerified": aligned_focus > misaligned_focus if aligned_time > 0 and misaligned_time > 0 else None,
                "description": "Hypothesis: Studying in your recommended modality leads to higher Focus Scores and lower distraction rates."
            },
            "quizSpecificDistraction": {
                "quizTabSwitches": quiz_tab_switches,
                "description": "Number of times user exited the tab specifically while taking interactive quizzes."
            }
        }
    }
