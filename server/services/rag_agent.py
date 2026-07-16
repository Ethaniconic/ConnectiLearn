"""
RAG Agent — simplified, no LangGraph.
Uses direct Groq API calls with TF-IDF document retrieval.
LangGraph was removed because langgraph==0.0.66 has silent TypedDict
state failures that are impossible to debug with uvicorn --reload.
"""
import os
import math
from collections import Counter
from typing import Any, Dict, List, Tuple

from bson import ObjectId
from groq import Groq
from fastapi.concurrency import run_in_threadpool

from ..config import settings
from ..db import documents_collection


# ---------------------------------------------------------------------------
# TF-IDF document retrieval
# ---------------------------------------------------------------------------

def _tfidf_score(query: str, chunk: str) -> float:
    q_words = query.lower().split()
    c_words = chunk.lower().split()
    if not c_words:
        return 0.0
    freq = Counter(c_words)
    score = 0.0
    for w in q_words:
        if w in freq:
            tf = freq[w] / len(c_words)
            score += tf * (1.0 + math.log(1.0 + len(w)))
    return score


async def _retrieve_contexts(query: str, user_id: Any, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch top-K relevant chunks from user's uploaded documents."""
    id_variants: list = [user_id]
    try:
        id_variants.append(ObjectId(str(user_id)))
    except Exception:
        pass
    if isinstance(user_id, ObjectId):
        id_variants.append(str(user_id))

    cursor = documents_collection.find(
        {"userId": {"$in": id_variants}},
        {"chunks": 1, "originalName": 1}
    )
    docs = await cursor.to_list(length=100)

    results: List[Dict[str, Any]] = []
    for doc in docs:
        fname = doc.get("originalName", "Document")
        for chunk in doc.get("chunks", []):
            text = chunk.get("text", "")
            score = _tfidf_score(query, text)
            if score > 0:
                results.append({"text": text, "filename": fname, "score": score})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]


# ---------------------------------------------------------------------------
# VARK system-prompt adapters
# ---------------------------------------------------------------------------

_VARK_PROMPTS: Dict[str, str] = {
    "Visual": (
        "The user is a VISUAL learner.\n"
        "- Use markdown tables, bullet points, bold emphasis.\n"
        "- Include ASCII diagrams where helpful."
    ),
    "Auditory": (
        "The user is an AUDITORY learner.\n"
        "- Write in a conversational, spoken tone.\n"
        "- Use analogies and rhetorical questions."
    ),
    "Kinesthetic": (
        "The user is a KINESTHETIC learner.\n"
        "- Focus on practical applications and step-by-step workflows.\n"
        "- End with a quick practice question."
    ),
    "ReadWrite": (
        "The user is a READ/WRITE learner.\n"
        "- Provide thorough text summaries, precise definitions, and indexed headings."
    ),
}


def _vark_prompt(style: str) -> str:
    if not style:
        return _VARK_PROMPTS["ReadWrite"]
        
    if style in _VARK_PROMPTS:
        return _VARK_PROMPTS[style]
        
    # Handle multimodal styles e.g. 'VA', 'VK', 'VARK'
    prompts = []
    short_map = {"V": "Visual", "A": "Auditory", "R": "ReadWrite", "K": "Kinesthetic"}
    for char in style:
        full_name = short_map.get(char.upper())
        if full_name and full_name in _VARK_PROMPTS:
            prompts.append(_VARK_PROMPTS[full_name])
            
    if not prompts:
        return _VARK_PROMPTS["ReadWrite"]
        
    return "The user has a multimodal learning preference:\n\n" + "\n\n".join(prompts)


# ---------------------------------------------------------------------------
# Core RAG call
# ---------------------------------------------------------------------------

async def run_rag_agent(
    query: str,
    user_id: Any,
    learning_style: str,
    history: list,
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    1. Retrieve relevant document chunks (TF-IDF)
    2. Build messages list for Groq
    3. Call Groq synchronously via run_in_threadpool
    4. Return (answer_text, contexts)
    """

    # Step 1 — retrieve
    contexts = await _retrieve_contexts(query, user_id, limit=5)

    context_str = (
        "\n\n".join(f"[{c['filename']}]\n{c['text']}" for c in contexts)
        if contexts
        else "No document context available. Answer from general knowledge."
    )

    # Step 2 — build messages
    sys_content = (
        "You are ConnectiLearn AI, an adaptive educational assistant. "
        "Answer clearly and thoroughly. Use the provided document context when relevant.\n\n"
        + _vark_prompt(learning_style or "ReadWrite")
    )

    messages = [{"role": "system", "content": sys_content}]

    # Append last 6 history turns
    for turn in (history or [])[-6:]:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({
        "role": "user",
        "content": f"Document context:\n{context_str}\n\nQuestion: {query}"
    })

    # Step 3 — call Groq
    api_key = (
settings.groq_api_key
    ).strip()

    if not api_key:
        print("[rag_agent] ERROR: GROQ_API_KEY is empty")
        return (
            "I'm sorry — the AI API key is not configured. "
            "Please add GROQ_API_KEY to server/.env.",
            contexts,
        )

    client = Groq(api_key=api_key)
    answer = ""

    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            # Capture all args by value to avoid closure bugs
            def _call(m=model, msgs=messages, c=client):
                return c.chat.completions.create(
                    model=m,
                    messages=msgs,
                    temperature=0.7,
                    max_tokens=1024,
                )

            completion = await run_in_threadpool(_call)
            text = (completion.choices[0].message.content or "").strip()
            if text:
                answer = text
                print(f"[rag_agent] ✓ {model} responded ({len(text)} chars)")
                break
        except Exception as exc:
            print(f"[rag_agent] ✗ {model} failed: {exc}")

    if not answer:
        answer = (
            "I'm sorry, I'm currently unable to reach the AI model. "
            "Please check your Groq API key in server/.env."
        )

    return answer, contexts
