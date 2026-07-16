import re
import json
import io
import random
import asyncio
import httpx
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from bson import ObjectId
from groq import Groq
from gtts import gTTS

from ..config import settings
from ..db import documents_collection, leaderboard_collection
from ..routes.auth import get_current_user
from ..services.learning_agent import run_learning_agent

router = APIRouter(prefix="/learn", tags=["learn"])
groq_client = Groq(api_key=settings.groq_api_key)

# Helper to parse JSON robustly from LLM response
def safe_parse_json(str_val: str):
    try:
        clean_str = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", str_val)
        start_idx = -1
        for idx, char in enumerate(clean_str):
            if char in ["[", "{"]:
                start_idx = idx
                break
        end_idx = -1
        for idx in range(len(clean_str) - 1, -1, -1):
            if clean_str[idx] in ["]", "}"]:
                end_idx = idx
                break
        if start_idx == -1 or end_idx == -1:
            raise ValueError("No JSON markers found")
        clean_str = clean_str[start_idx:end_idx + 1]
        clean_str = re.sub(r",\s*([\]}])", r"\1", clean_str)
        return json.loads(clean_str)
    except Exception as e:
        print("JSON parse failed in python:", str(e))
        return None

# Leaderboard Helpers
async def get_leaderboard():
    board = await leaderboard_collection.find_one({"singletonId": "global"})
    if not board:
        board = {
            "singletonId": "global",
            "visualPoints": 0,
            "auditoryPoints": 0,
            "readwritePoints": 0,
            "kinestheticPoints": 0
        }
        await leaderboard_collection.insert_one(board)
    return board

async def increment_leaderboard_points(style: str, amount: int = 1):
    field_mapping = {
        "Visual": "visualPoints",
        "Auditory": "auditoryPoints",
        "ReadWrite": "readwritePoints",
        "Kinesthetic": "kinestheticPoints"
    }
    field = field_mapping.get(style)
    if not field:
        return
    await leaderboard_collection.update_one(
        {"singletonId": "global"},
        {"$inc": {field: amount}},
        upsert=True
    )

# VARK fallbacks when LLM fails or keys are missing
def build_fallback_flashcards(text: str) -> list:
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.strip()) > 30]
    if not sentences:
        return [{"front": "What does this document mainly contain?", "back": "It contains educational study material."}]
    cards = []
    for s in sentences[:6]:
        front = f"Explain this key concept: {s[:80]}..." if len(s) > 80 else f"Explain: {s}"
        cards.append({"front": front, "back": s, "tag": "Concept"})
    return cards

def build_fallback_quiz(text: str) -> list:
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.strip()) > 30]
    if len(sentences) < 2:
        return [{
            "question": "What is the primary theme of the document?",
            "options": ["Educational study topic", "Irrelevant symbols", "Fictional storytelling", "No useful data"],
            "correct": 0,
            "explanation": "The document is an educational study resource."
        }]
    questions = []
    pool = sentences[:10]
    for idx, sentence in enumerate(pool[:5]):
        distractors = [s for i, s in enumerate(pool) if i != idx][:3]
        while len(distractors) < 3:
            distractors.append("This is an unverified placeholder fact.")
        options = [sentence] + distractors
        random.shuffle(options)
        correct_idx = options.index(sentence)
        questions.append({
            "question": "Based on the document, which statement is most accurate?",
            "options": options,
            "correct": correct_idx,
            "explanation": sentence
        })
    return questions

def build_fallback_summary(text: str) -> str:
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.strip()) > 30]
    if not sentences:
        return "This is a basic summary of the document. Please review it carefully to master the concepts."
    return "\n\n".join([" ".join(sentences[i:i+3]) for i in range(0, min(len(sentences), 9), 3)])

def build_fallback_mindmap(text: str) -> dict:
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.strip()) > 30]
    central = sentences[0][:60] if sentences else "Core Concept"
    branches = []
    chunks = [sentences[i:i+3] for i in range(0, min(len(sentences), 9), 3)]
    for idx, chunk in enumerate(chunks):
        branches.append({
            "name": f"Subtheme {idx + 1}",
            "children": chunk
        })
    return {"central": central, "branches": branches}

def build_fallback_mnemonic_song(text: str) -> dict:
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.strip()) > 35]
    if not sentences:
        sentences = [
            "We study the lessons to learn and grow,",
            "Acquiring the wisdom we need to know,",
            "Each day is a journey of minds taking flight,",
            "Guiding our future with knowledge and light."
        ]
    
    facts = sentences[:4]
    title = f"The Rhythm of Learning: {facts[0][:30]}..." if facts else "The Rhythm of Learning"
    
    chorus = (
        "Study deep, learn it well, sing the memory tune,\n"
        "Rising high, shining bright, like the sun and the moon!\n"
        "Repeat the facts, make it last, feel the beat of the song,\n"
        "Knowledge stays in our minds, where it truly belongs!"
    )
    
    verses = []
    for idx in range(0, min(len(sentences), 4), 2):
        pair = sentences[idx:idx+2]
        while len(pair) < 2:
            pair.append("Let's review the facts and study the theme.")
        verses.append({
            "verseNumber": len(verses) + 1,
            "lyrics": f"First we know that: {pair[0]}\nNext we see that: {pair[1]}"
        })
        
    return {
        "title": title,
        "chorus": chorus,
        "verses": verses,
        "keyFacts": [f[:100] for f in facts]
    }

# --- HuggingFace TTS Helper ---
async def hf_tts_generate(text: str, hf_token: str) -> Optional[bytes]:
    """
    Calls HuggingFace Inference API for high-quality neural TTS.
    Uses facebook/mms-tts-eng as primary model.
    Returns raw audio bytes or None on failure.
    """
    if not hf_token or not text.strip():
        return None

    # Try multiple HF TTS models in order
    hf_models = [
        "facebook/mms-tts-eng",
        "espnet/kan-bayashi_ljspeech_vits",
    ]

    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in hf_models:
            try:
                url = f"https://api-inference.huggingface.co/models/{model}"
                payload = {"inputs": text[:1000]}  # HF inference API text limit
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200 and len(response.content) > 1000:
                    return response.content
            except Exception as e:
                print(f"HF TTS model {model} failed: {e}")
                continue

    return None


# --- ROUTES ---

@router.get("/hype")
async def welcome_hype(current_user: dict = Depends(get_current_user)):
    style = current_user.get("learningStyle")
    if not style:
        return {"message": "Welcome to ConnectiLearn!"}

    board = await get_leaderboard()
    points_text = (
        f"Visual: {board.get('visualPoints', 0)}, "
        f"Auditory: {board.get('auditoryPoints', 0)}, "
        f"ReadWrite: {board.get('readwritePoints', 0)}, "
        f"Kinesthetic: {board.get('kinestheticPoints', 0)}"
    )

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are an enthusiastic gamification announcer. The user is a '{style}' learner.\n"
                        f"The current global leaderboard points are: {points_text}.\n"
                        "Write a short, highly-hyped 2-sentence message welcoming the user, bragging about their learning style's points, or encouraging them to boost their points to beat the others! No hashtags or emojis in excess."
                    )
                }
            ],
            temperature=0.8,
            max_tokens=150
        )
        message = completion.choices[0].message.content
        return {"message": message, "points": board}
    except Exception:
        return {
            "message": f"Welcome to your learning dashboard! Your style is {style}.",
            "points": board
        }


@router.post("/flashcards")
async def generate_flashcards(
    documentId: str = Body(..., embed=True),
    mode: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    try:
        payload = await run_learning_agent(documentId, mode or "visual", "flashcards", str(current_user["_id"]))
        data = payload.get("data", {})
        cards = data.get("cards", [])
        formatted_cards = [
            {
                "front": c.get("question", c.get("front", "")),
                "back": c.get("answer", c.get("back", "")),
                "tag": c.get("tag", "Concept")
            } for c in cards
        ]
    except Exception as e:
        print(f"LangGraph flashcard agent error: {e}")
        formatted_cards = []
        payload = {}

    if not formatted_cards:
        doc = await documents_collection.find_one({"_id": ObjectId(documentId), "userId": str(current_user["_id"])})
        if not doc:
            doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
        text = doc.get("content", "") if doc else ""
        formatted_cards = build_fallback_flashcards(text)

    return {"flashcards": formatted_cards, "agentPayload": payload, "source": "langgraph_agent"}


@router.post("/quiz")
async def generate_quiz(
    documentId: str = Body(..., embed=True),
    mode: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    try:
        payload = await run_learning_agent(documentId, mode or "kinesthetic", "quiz", str(current_user["_id"]))
        data = payload.get("data", {})
        quiz_items = data.get("questions", [])
    except Exception as e:
        print(f"LangGraph quiz agent error: {e}")
        quiz_items = []
        payload = {}

    if not quiz_items:
        doc = await documents_collection.find_one({"_id": ObjectId(documentId), "userId": str(current_user["_id"])})
        if not doc:
            doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
        text = doc.get("content", "") if doc else ""
        quiz_items = build_fallback_quiz(text)

    return {"quiz": quiz_items, "agentPayload": payload, "source": "langgraph_agent"}


@router.post("/summary")
async def generate_summary(
    documentId: str = Body(..., embed=True),
    mode: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    req_mode = mode or "auditory"
    target_tool = "podcast" if req_mode == "auditory" else "summary"
    
    try:
        payload = await run_learning_agent(documentId, req_mode, target_tool, str(current_user["_id"]))
        data = payload.get("data", {})
        raw_text = data.get("rawScript") or data.get("executiveSummary") or ""
        if not raw_text and data.get("dialogue"):
            raw_text = "\n".join([f"{d.get('speaker', 'Host')}: {d.get('text', '')}" for d in data.get("dialogue", [])])
    except Exception as e:
        print(f"LangGraph summary agent error: {e}")
        raw_text = ""
        payload = {}

    if not raw_text:
        doc = await documents_collection.find_one({"_id": ObjectId(documentId), "userId": str(current_user["_id"])})
        if not doc:
            doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
        text = doc.get("content", "") if doc else ""
        raw_text = build_fallback_summary(text)
        
        if req_mode == "auditory":
            lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
            dialogue_lines = []
            for idx, line in enumerate(lines):
                speaker = "Alex" if idx % 2 == 0 else "Dr. Taylor"
                dialogue_lines.append(f"{speaker}: {line}")
            raw_text = "\n".join(dialogue_lines)
            
            payload = {
                "architectureType": "radio_broadcast",
                "title": "Audio Summary Broadcast",
                "data": {
                    "rawScript": raw_text
                }
            }
        else:
            payload = {
                "architectureType": "glossary_notebook",
                "title": "Executive Summary",
                "data": {
                    "rawScript": raw_text
                }
            }

    return {"summary": raw_text, "agentPayload": payload, "source": "langgraph_agent"}


@router.post("/podcast-audio")
async def generate_podcast_audio(
    text: str = Body(..., embed=True),
    voice: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text is required to generate podcast audio.")

    # Strategy 1: Try HuggingFace neural TTS (best quality)
    hf_token = getattr(settings, "hf_token", "").strip()
    if hf_token:
        try:
            audio_bytes = await hf_tts_generate(clean_text[:1000], hf_token)
            if audio_bytes:
                fp = io.BytesIO(audio_bytes)
                fp.seek(0)
                return StreamingResponse(
                    fp,
                    media_type="audio/mpeg",
                    headers={"Content-Disposition": "inline; filename=podcast.mp3", "X-Audio-Engine": "HuggingFace Neural TTS"}
                )
        except Exception as e:
            print(f"HuggingFace TTS failed: {e}")

    # Strategy 2: edge_tts (neural voices, good quality)
    v_name = "en-US-GuyNeural"
    if voice and ("taylor" in voice.lower() or "female" in voice.lower() or "aria" in voice.lower()):
        v_name = "en-US-AriaNeural"

    try:
        import edge_tts
        communicate = edge_tts.Communicate(clean_text[:4000], v_name)
        audio_bytes = bytearray()
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                audio_bytes.extend(chunk["data"])
        fp = io.BytesIO(audio_bytes)
        fp.seek(0)
        return StreamingResponse(
            fp,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=podcast.mp3", "X-Audio-Engine": "Edge Neural TTS"}
        )
    except Exception as e:
        print("edge_tts failed, falling back to gTTS:", str(e))

    # Strategy 3: gTTS (last resort)
    try:
        tts = await run_in_threadpool(gTTS, text=clean_text[:3000], lang="en", slow=False)
        fp = io.BytesIO()
        await run_in_threadpool(tts.write_to_fp, fp)
        fp.seek(0)
        return StreamingResponse(
            fp,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=podcast.mp3", "X-Audio-Engine": "gTTS"}
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to synthesize audio in the cloud.")


@router.post("/hf-audio")
async def generate_hf_audio(
    text: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Dedicated HuggingFace neural TTS endpoint"""
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text is required.")

    hf_token = getattr(settings, "hf_token", "").strip()
    if not hf_token:
        raise HTTPException(status_code=503, detail="HuggingFace token not configured.")

    audio_bytes = await hf_tts_generate(clean_text[:1000], hf_token)
    if not audio_bytes:
        raise HTTPException(status_code=503, detail="HuggingFace TTS generation failed.")

    fp = io.BytesIO(audio_bytes)
    fp.seek(0)
    return StreamingResponse(fp, media_type="audio/mpeg")


@router.post("/voice-tutor-dialogue")
async def voice_tutor_dialogue(
    userMessage: str = Body(..., embed=True),
    documentId: Optional[str] = Body(None, embed=True),
    history: Optional[List[Dict[str, str]]] = Body(default_factory=list, embed=True),
    learningStyle: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    clean_user = userMessage.strip()
    if not clean_user:
        raise HTTPException(status_code=400, detail="User speech content is required.")

    doc_context = ""
    if documentId:
        try:
            doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
            if doc:
                content = doc.get("content", "")
                doc_context = f"Document ({doc.get('originalName', 'Reference')}):\n{content[:3500]}"
        except Exception:
            pass

    # Get learning style from request or user profile
    style = learningStyle or current_user.get("learningStyle", "")
    style_instruction = ""
    if style:
        style_instruction = f"\nThe student is a {style} learner — tailor your spoken explanations accordingly."

    system_prompt = (
        "You are Aura AI, a warm, conversational, and highly engaging AI Auditory Learning Tutor. "
        "The student is practicing spoken dialogue with you. "
        f"Rules:{style_instruction}\n"
        "- Respond in a clear, natural, friendly conversational tone.\n"
        "- Keep answers punchy and easy to digest when read aloud (2 to 4 sentences max).\n"
        "- Use spoken analogies and end with ONE short follow-up question to keep the verbal conversation flowing naturally.\n"
        "- Do NOT use bullet lists, markdown tables, or code blocks.\n"
        "- After your response, on a new line, write: FOLLOW_UP: [One short probing follow-up question]"
    )

    messages = [{"role": "system", "content": system_prompt}]
    if doc_context:
        messages.append({"role": "system", "content": doc_context})

    for h in (history or [])[-8:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

    messages.append({"role": "user", "content": clean_user})

    reply_text = ""
    follow_up = ""
    models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
    for model_name in models_to_try:
        try:
            completion = groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=350
            )
            raw_reply = completion.choices[0].message.content
            if raw_reply:
                # Extract follow-up question if present
                if "FOLLOW_UP:" in raw_reply:
                    parts = raw_reply.split("FOLLOW_UP:", 1)
                    reply_text = parts[0].strip()
                    follow_up = parts[1].strip()
                else:
                    reply_text = raw_reply.strip()
                break
        except Exception as e:
            print(f"Voice tutor model {model_name} error: {str(e)}")

    if not reply_text:
        reply_text = "That's a great observation! Could you clarify that slightly so we can explore it deeper together?"

    await increment_leaderboard_points("Auditory")

    return {
        "replyText": reply_text,
        "followUpQuestion": follow_up,
        "userMessage": clean_user
    }


@router.post("/audio-quiz")
async def generate_audio_quiz(
    documentId: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Generate an audio-optimized quiz for auditory learners"""
    try:
        payload = await run_learning_agent(documentId, "auditory", "audio_quiz", str(current_user["_id"]))
        data = payload.get("data", {})
        questions = data.get("questions", [])
    except Exception as e:
        print(f"Audio quiz agent error: {e}")
        questions = []
        payload = {}

    if not questions:
        doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
        if not doc:
            doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
        text = doc.get("content", "") if doc else ""
        fallback = build_fallback_quiz(text)
        # Convert fallback to audio_quiz format
        questions = [
            {
                "id": i + 1,
                "spokenQuestion": q.get("question", ""),
                "options": q.get("options", []),
                "correct": q.get("correct", 0),
                "correctFeedbackAudio": "Correct! Well done on that one.",
                "incorrectFeedbackAudio": "Not quite, but don't worry — let's keep going."
            }
            for i, q in enumerate(fallback)
        ]

    await increment_leaderboard_points("Auditory")
    return {"questions": questions, "agentPayload": payload, "source": "langgraph_agent"}


@router.post("/cornell-notes")
async def generate_cornell_notes(
    documentId: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    payload = await run_learning_agent(documentId, "readwrite", "cornell_notes", str(current_user["_id"]))
    return {"agentPayload": payload, "source": "langgraph_agent"}


@router.post("/qa-guide")
async def generate_qa_guide(
    documentId: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    payload = await run_learning_agent(documentId, "readwrite", "qa_guide", str(current_user["_id"]))
    return {"agentPayload": payload, "source": "langgraph_agent"}


@router.post("/fill-blank")
async def generate_fill_blank(
    documentId: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    payload = await run_learning_agent(documentId, "kinesthetic", "fill_blank", str(current_user["_id"]))
    return {"agentPayload": payload, "source": "langgraph_agent"}


@router.post("/audio-recap")
async def generate_audio_recap(
    documentId: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    payload = await run_learning_agent(documentId, "auditory", "audio_recap", str(current_user["_id"]))
    return {"agentPayload": payload, "source": "langgraph_agent"}


@router.post("/mnemonic-song")
async def generate_mnemonic_song(
    documentId: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    try:
        payload = await run_learning_agent(documentId, "auditory", "mnemonic_song", str(current_user["_id"]))
        data = payload.get("data", {})
    except Exception as e:
        print(f"Audio mnemonic song agent error: {e}")
        data = {}
        payload = {}
        
    if not data or not data.get("title"):
        doc = await documents_collection.find_one({"_id": ObjectId(documentId), "userId": str(current_user["_id"])})
        if not doc:
            doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
        text = doc.get("content", "") if doc else ""
        data = build_fallback_mnemonic_song(text)
        payload = {
            "architectureType": "mnemonic_song",
            "title": data.get("title"),
            "data": data
        }
        
    await increment_leaderboard_points("Auditory")
    return {"agentPayload": payload, "source": "langgraph_agent"}


@router.post("/roleplay")
async def generate_roleplay(
    documentId: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    payload = await run_learning_agent(documentId, "kinesthetic", "roleplay", str(current_user["_id"]))
    return {"agentPayload": payload, "source": "langgraph_agent"}


@router.post("/mindmap")
async def generate_mindmap(
    documentId: str = Body(..., embed=True),
    mode: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    try:
        payload = await run_learning_agent(documentId, mode or "visual", "mindmap", str(current_user["_id"]))
        data = payload.get("data", {})
    except Exception as e:
        print(f"LangGraph mindmap agent error: {e}")
        data = {}
        payload = {}

    if not data.get("central") and not data.get("branches"):
        doc = await documents_collection.find_one({"_id": ObjectId(documentId), "userId": str(current_user["_id"])})
        if not doc:
            doc = await documents_collection.find_one({"_id": ObjectId(documentId)})
        text = doc.get("content", "") if doc else ""
        data = build_fallback_mindmap(text)

    return {"mindmap": data, "agentPayload": payload, "source": "langgraph_agent"}


@router.post("/agent-tool")
async def execute_agent_tool(
    documentId: str = Body(..., embed=True),
    mode: Optional[str] = Body("visual", embed=True),
    toolType: Optional[str] = Body("auto", embed=True),
    current_user: dict = Depends(get_current_user)
):
    payload = await run_learning_agent(documentId, mode, toolType, current_user["_id"])
    return {"agentPayload": payload, "source": "langgraph_agent"}


@router.post("/visual-card")
async def generate_visual_card(
    concept: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    import urllib.parse
    if not concept.strip():
        raise HTTPException(status_code=400, detail="Concept text is required.")

    raw_prompt = f"educational concept diagram of {concept.strip()}, flat vector illustration, schema design, infographic style, high resolution, academic visual aid, white background"
    encoded_prompt = urllib.parse.quote(raw_prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"

    await increment_leaderboard_points("Visual")

    return {"imageUrl": image_url}
