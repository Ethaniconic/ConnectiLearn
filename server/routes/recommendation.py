from typing import List, Union, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from ..db import users_collection
from ..routes.auth import get_current_user, make_user_response
from ..services.recommendation import calculate_vark_scores, recommend_content

router = APIRouter(prefix="/recommendation", tags=["recommendation"])

def has_all_fields(answers: List[Any]) -> bool:
    return isinstance(answers, list) and len(answers) == 16 and all(isinstance(val, list) for val in answers)

@router.get("/questionnaire")
async def get_questionnaire(current_user: dict = Depends(get_current_user)):
    return {
        "questionnaireCompleted": current_user.get("questionnaireCompleted", False),
        "learningStyle": current_user.get("learningStyle"),
        "questionnaire": current_user.get("questionnaire", []),
        "varkScores": current_user.get("varkScores", {})
    }

@router.post("/questionnaire")
async def submit_questionnaire(
    answers: Union[List[List[str]], dict] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("questionnaireCompleted"):
        raise HTTPException(status_code=403, detail="Questionnaire has already been completed.")
        
    raw_answers = answers
    if isinstance(answers, dict):
        if "answers" in answers:
            raw_answers = answers["answers"]
            
    if not has_all_fields(raw_answers):
        raise HTTPException(status_code=400, detail="All 16 VARK questionnaire fields must be answered as lists of selected options.")
        
    try:
        # Perform scoring using standard algorithm
        from ..services.recommendation import calculate_vark_scores
        score_res = calculate_vark_scores(raw_answers)
        learning_style = score_res["style_string"]
        tallies = score_res["tallies"]
        recommendations = recommend_content(learning_style, raw_answers)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error evaluating answers: {str(e)}")
        
    # Save to user record
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "questionnaire": raw_answers,
                "learningStyle": learning_style,
                "varkScores": tallies,
                "questionnaireCompleted": True
            }
        }
    )
    
    # Fetch updated user
    updated_user = await users_collection.find_one({"_id": current_user["_id"]})
    
    return {
        "learningStyle": learning_style,
        "varkScores": tallies,
        "recommendations": recommendations,
        "user": make_user_response(updated_user)
    }

@router.get("/recommendations")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    if not current_user.get("questionnaireCompleted") or not current_user.get("learningStyle"):
        raise HTTPException(status_code=400, detail="Complete questionnaire first.")
        
    recommendations = recommend_content(
        current_user["learningStyle"], 
        current_user.get("questionnaire", [])
    )
    
    return {
        "learningStyle": current_user["learningStyle"],
        "recommendations": recommendations,
        "varkScores": current_user.get("varkScores", {})
    }

@router.post("/reset")
async def reset_questionnaire(current_user: dict = Depends(get_current_user)):
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "questionnaire": [],
                "learningStyle": None,
                "varkScores": {},
                "questionnaireCompleted": False
            }
        }
    )
    
    # Fetch updated user
    updated_user = await users_collection.find_one({"_id": current_user["_id"]})
    
    return {
        "message": "Questionnaire reset successfully",
        "user": make_user_response(updated_user)
    }
