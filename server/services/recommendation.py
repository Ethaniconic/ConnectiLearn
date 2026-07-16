import os
from typing import List, Dict, Any

CATEGORIES = ['Visual', 'Auditory', 'Kinesthetic', 'ReadWrite']

CONTENT_LIBRARY = [
    # --- VISUAL TOOLS (3 Tools) ---
    {
        "id": "visual-1",
        "category": "Visual",
        "title": "Interactive Mindmap Canvas",
        "format": "NotebookLM Bezier Tree Diagram",
        "action": "Explore central concepts and hierarchical branch relationships dynamically.",
        "targetMode": "visual",
        "actionType": "mindmap"
    },
    {
        "id": "visual-2",
        "category": "Visual",
        "title": "Color-Coded Memory Flashcards",
        "format": "Interactive Visual Flip Deck",
        "action": "Review key terms and concepts with high-contrast flip markers.",
        "targetMode": "visual",
        "actionType": "flashcards"
    },
    {
        "id": "visual-3",
        "category": "Visual",
        "title": "Cloud Visual Concept Art Cards",
        "format": "AI Infographic Illustration",
        "action": "Generate visual memory anchor cards rendered via cloud GPUs.",
        "targetMode": "visual",
        "actionType": "visualcard"
    },

    # --- AUDITORY TOOLS (3 Tools) ---
    {
        "id": "auditory-1",
        "category": "Auditory",
        "title": "Dual-Host Conversational Podcast",
        "format": "Alex & Dr. Taylor Neural Radio Studio",
        "action": "Listen to a lively radio broadcast with active speaker indicators.",
        "targetMode": "auditory",
        "actionType": "podcast"
    },
    {
        "id": "auditory-2",
        "category": "Auditory",
        "title": "Verbal Summary Recap Stream",
        "format": "Audio Recap Stream",
        "action": "Listen to 60-second verbal summary recaps.",
        "targetMode": "auditory",
        "actionType": "audio_recap"
    },
    {
        "id": "auditory-3",
        "category": "Auditory",
        "title": "Vocal Dictation Practice Studio",
        "format": "Voice Dictation & Query Studio",
        "action": "Practice explaining concepts out loud using browser dictation.",
        "targetMode": "auditory",
        "actionType": "voice_dictation"
    },

    # --- KINESTHETIC TOOLS (3 Tools) ---
    {
        "id": "kinesthetic-1",
        "category": "Kinesthetic",
        "title": "Interactive Practice Sandbox Quiz",
        "format": "Sandbox Challenge Trail",
        "action": "Solve practice questions first, then inspect feedback for misses.",
        "targetMode": "kinesthetic",
        "actionType": "quiz"
    },
    {
        "id": "kinesthetic-2",
        "category": "Kinesthetic",
        "title": "Scenario Roleplay Challenge",
        "format": "Decision-Tree Scenario Dilemma",
        "action": "Navigate choices to resolve real-world scenario dilemmas.",
        "targetMode": "kinesthetic",
        "actionType": "roleplay"
    },
    {
        "id": "kinesthetic-3",
        "category": "Kinesthetic",
        "title": "Fill-in-the-Blank Micro-Tasks",
        "format": "Interactive Cloze Test",
        "action": "Complete missing terms in active recall sentences.",
        "targetMode": "kinesthetic",
        "actionType": "fill_blank"
    },

    # --- READ/WRITE TOOLS (3 Tools) ---
    {
        "id": "readwrite-1",
        "category": "ReadWrite",
        "title": "Executive Notebook & Glossary",
        "format": "Cornell Executive Summary",
        "action": "Study written notes with highlighted terminology glossaries.",
        "targetMode": "readwrite",
        "actionType": "summary"
    },
    {
        "id": "readwrite-2",
        "category": "ReadWrite",
        "title": "Classic Cornell Notes System",
        "format": "Cue Column & Note Grid",
        "action": "Review cues, key keywords, and synthesized summaries.",
        "targetMode": "readwrite",
        "actionType": "cornell_notes"
    },
    {
        "id": "readwrite-3",
        "category": "ReadWrite",
        "title": "Socratic Text Q&A Study Guide",
        "format": "Deep-Dive Text Q&A",
        "action": "Study probing text questions and model responses.",
        "targetMode": "readwrite",
        "actionType": "qa_guide"
    }
]

def calculate_vark_scores(answers: List[List[str]]) -> Dict[str, Any]:
    """
    Neil Fleming's standard VARK scoring algorithm.
    Counts the selections for V, A, R, and K, and uses a range-based threshold
    to determine if the student is single-modal, bimodal, trimodal, or quadmodal.
    """
    tallies = {"Visual": 0, "Auditory": 0, "ReadWrite": 0, "Kinesthetic": 0}
    mapping = {
        "V": "Visual",
        "A": "Auditory",
        "R": "ReadWrite",
        "K": "Kinesthetic"
    }
    
    for q_ans in answers:
        if isinstance(q_ans, list):
            for choice in q_ans:
                full_name = mapping.get(choice.upper())
                if full_name:
                    tallies[full_name] += 1
        elif isinstance(q_ans, str):
            full_name = mapping.get(q_ans.upper())
            if full_name:
                tallies[full_name] += 1
                
    total_score = sum(tallies.values())
    
    # Calculate threshold based on total choices selected
    if total_score >= 30:
        threshold = 4
    elif total_score >= 20:
        threshold = 3
    elif total_score >= 10:
        threshold = 2
    else:
        threshold = 1
        
    max_score = max(tallies.values()) if tallies else 0
    
    preferred = []
    for style in ["Visual", "Auditory", "ReadWrite", "Kinesthetic"]:
        if max_score > 0 and tallies[style] >= (max_score - threshold):
            preferred.append(style)
            
    if not preferred:
        preferred = ["ReadWrite"]
        
    short_map = {"Visual": "V", "Auditory": "A", "ReadWrite": "R", "Kinesthetic": "K"}
    style_chars = [short_map[p] for p in preferred]
    resolved_style = "".join(style_chars)
    
    return {
        "tallies": tallies,
        "preferred": preferred,
        "style_string": resolved_style
    }

def predict_learning_style(answers: List[List[str]]) -> str:
    """
    Wrapper for compatibility. Returns resolved multimodal style code (e.g. 'VA', 'VARK').
    """
    res = calculate_vark_scores(answers)
    return res["style_string"]

def recommend_content(learning_style: str, questionnaire: Any) -> List[Dict[str, Any]]:
    """
    Filter and rank content based on user's multimodal learning style.
    Handles single modal, bimodal (e.g. 'VK'), trimodal, or quadmodal ('VARK').
    """
    # Map short codes back to long category names
    short_map = {"V": "Visual", "A": "Auditory", "R": "ReadWrite", "K": "Kinesthetic"}
    active_categories = []
    for char in learning_style:
        full_name = short_map.get(char.upper())
        if full_name:
            active_categories.append(full_name)
            
    if not active_categories:
        active_categories = ["ReadWrite"]
        
    recommendations = []
    for item in CONTENT_LIBRARY:
        rank = 0
        # If the item's category is part of the user's multimodal style, give it a high boost
        if item["category"] in active_categories:
            rank += 10
            
        # Additional contextual boosts
        if "Kinesthetic" in active_categories and "Interactive" in item["format"]:
            rank += 2
        if "ReadWrite" in active_categories and "Text" in item["format"]:
            rank += 2
            
        rec_item = item.copy()
        rec_item["rank"] = rank
        recommendations.append(rec_item)
        
    # Sort by rank descending
    recommendations.sort(key=lambda x: x["rank"], reverse=True)
    
    # Return top 6 recommendations
    return [
        {k: v for k, v in item.items() if k != "rank"} 
        for item in recommendations[:6]
    ]
