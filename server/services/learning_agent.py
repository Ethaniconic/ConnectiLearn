import os
import json
import re
from typing import List, Dict, Any, TypedDict
from bson import ObjectId
from groq import Groq
from langgraph.graph import StateGraph, END

from ..config import settings
from ..db import documents_collection, leaderboard_collection

# Helper to safely clean and parse JSON output from LLM
def safe_parse_json(text: str) -> dict:
    if not text:
        return {}
    cleaned = re.sub(r'```(?:json)?\s*', '', text)
    cleaned = re.sub(r'\s*```', '', cleaned).strip()

    # Attempt 1: direct parse
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # Attempt 2: extract outermost JSON object
    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass

    # Attempt 3: repair truncated JSON by finding last complete array item
    # Try to close unclosed JSON structures
    for attempt in range(1, 6):
        padded = cleaned + (']' * attempt) + ('}' * attempt)
        try:
            return json.loads(padded)
        except Exception:
            pass

    return {}


# Define LangGraph Agent State
class LearningAgentState(TypedDict):
    document_id: str
    user_id: Any
    mode: str          # visual, auditory, readwrite, kinesthetic
    tool_type: str     # mindmap, flashcards, summary, quiz, visualcard, auto
    contexts: List[Dict[str, Any]]
    document_name: str
    architecture_type: str
    output_payload: Dict[str, Any]


# Node 1: Context Retrieval Node
async def retrieve_context_node(state: LearningAgentState) -> dict:
    doc_id = state["document_id"]
    user_id = state["user_id"]

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return {"contexts": [], "document_name": "Document"}

    # Try multiple userId formats since MongoDB may store it as string or ObjectId
    doc = await documents_collection.find_one({"_id": oid, "userId": str(user_id)})
    if not doc:
        doc = await documents_collection.find_one({"_id": oid, "userId": user_id})
    if not doc:
        try:
            doc = await documents_collection.find_one({"_id": oid, "userId": ObjectId(str(user_id))})
        except Exception:
            pass
    if not doc:
        doc = await documents_collection.find_one({"_id": oid})
    if not doc:
        return {"contexts": [], "document_name": "Document"}

    chunks = doc.get("chunks", [])
    full_text = doc.get("content", "")
    doc_name = doc.get("originalName", "Document")

    if chunks:
        context_items = [{"text": c["text"], "filename": doc_name} for c in chunks[:3]]
    else:
        context_items = [{"text": full_text[:4000], "filename": doc_name}]

    return {"contexts": context_items, "document_name": doc_name}


# Node 2: Architecture Planning Node
async def plan_architecture_node(state: LearningAgentState) -> dict:
    mode = (state.get("mode") or "readwrite").lower()
    tool_type = (state.get("tool_type") or "auto").lower()

    # Map requested tool_type & mode to a bespoke architecture format
    if tool_type == "mindmap":
        arch = "interactive_tree"
    elif tool_type == "flashcards":
        arch = "flip_deck"
    elif tool_type == "visualcard":
        arch = "infographic_card"
    elif tool_type == "podcast":
        arch = "radio_broadcast"
    elif tool_type == "audio_recap":
        arch = "audio_recap"
    elif tool_type == "audio_quiz":
        arch = "audio_quiz"
    elif tool_type == "voice_dictation":
        arch = "qa_study_guide"
    elif tool_type == "summary":
        arch = "glossary_notebook"
    elif tool_type == "cornell_notes":
        arch = "cornell_notes"
    elif tool_type == "cheatsheet" or tool_type == "qa_guide":
        arch = "qa_study_guide"
    elif tool_type == "quiz":
        arch = "challenge_quiz"
    elif tool_type == "roleplay":
        arch = "scenario_roleplay"
    elif tool_type == "fill_blank":
        arch = "fill_blank"
    elif tool_type == "mnemonic_song":
        arch = "mnemonic_song"
    else:
        # Auto mode resolution based on VARK category
        arch_map = {
            "visual": "interactive_tree",
            "auditory": "radio_broadcast",
            "kinesthetic": "scenario_roleplay",
            "readwrite": "glossary_notebook"
        }
        arch = arch_map.get(mode, "interactive_tree")

    return {"architecture_type": arch}


# Node 3: Tool Execution & Generation Node
async def execute_tool_node(state: LearningAgentState) -> dict:
    arch = state["architecture_type"]
    contexts = state["contexts"]
    doc_name = state["document_name"]
    mode = state["mode"]

    context_text = "\n\n".join([f"Snippet:\n{c['text']}" for c in contexts[:3]])
    if not context_text:
        context_text = f"Study material for {doc_name}"

    api_key = settings.groq_api_key.strip()
    groq_client = Groq(api_key=api_key)

    # --- Determine max_tokens and model list based on architecture ---
    max_tokens = 2000
    if arch in ("flip_deck", "interactive_tree"):
        max_tokens = 3000
    elif arch in ("audio_quiz", "challenge_quiz"):
        max_tokens = 2000
    elif arch in ("cornell_notes", "qa_study_guide", "glossary_notebook", "mnemonic_song"):
        max_tokens = 2500

    if arch == "interactive_tree":
        prompt = (
            "You are a master learning architect. Extract a comprehensive, deep, structured node mindmap tree from the content.\n"
            "Dynamically choose the appropriate number of main branches (between 3 and 8) and depth (2 to 4 levels deep) based on the document complexity and structure.\n"
            "Each branch MUST have sub-branches (nested children objects) AND leaf-level details where relevant.\n"
            "IMPORTANT: Return ONLY a valid, COMPLETE JSON object. NO codeblocks, NO preamble, NO trailing text.\n"
            "Format:\n"
            "{\n"
            '  "central": "Main Topic Title",\n'
            '  "complexity": "simple|moderate|complex",\n'
            '  "branches": [\n'
            '    {\n'
            '      "name": "Subtopic Branch Name",\n'
            '      "color_hint": "blue",\n'
            '      "children": [\n'
            '        {\n'
            '          "name": "Sub-branch Name",\n'
            '          "details": ["Leaf detail 1", "Leaf detail 2"]\n'
            '        },\n'
            '        "Simple direct leaf point"\n'
            '      ]\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    elif arch == "flip_deck":
        prompt = (
            "You are a visual learning designer. Create a dynamic deck of comprehensive memory flashcards from the content (between 6 and 12 cards depending on the content size).\n"
            "Each flashcard question must be COMPLETE and not truncated — write the full question text.\n"
            "Each answer must be detailed enough for proper understanding (2-4 sentences).\n"
            "IMPORTANT: Return ONLY a valid, COMPLETE JSON object. Do not truncate. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "cards": [\n'
            '    {\n'
            '      "question": "Complete, full front-side question or concept prompt without any truncation",\n'
            '      "answer": "Complete back-side answer that fully explains the concept in 2-4 sentences",\n'
            '      "tag": "Category tag",\n'
            '      "importance": "high|medium|low"\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    elif arch == "radio_broadcast":
        prompt = (
            "You are a podcast producer. Create a 2-host radio dialogue script based on the content.\n"
            "The hosts are Alex (Host) and Dr. Taylor (Specialist).\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "title": "Episode title",\n'
            '  "dialogue": [\n'
            '    {"speaker": "Alex", "text": "intro line"},\n'
            '    {"speaker": "Dr. Taylor", "text": "explanation line"}\n'
            '  ],\n'
            '  "rawScript": "Alex: intro line\\nDr. Taylor: explanation line"\n'
            "}"
        )
    elif arch == "audio_recap":
        prompt = (
            "You are an educational radio narrator. Create a crisp, engaging 60-second verbal summary recap of the material.\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "title": "Verbal Summary Recap",\n'
            '  "rawScript": "Full conversational verbal summary script ready for audio streaming.",\n'
            '  "keyBullets": ["Point 1", "Point 2", "Point 3"]\n'
            "}"
        )
    elif arch == "audio_quiz":
        prompt = (
            "You are an audio quiz designer for auditory learners. Create between 4 and 8 spoken quiz questions (optimized for verbal delivery) based on the complexity of the material.\n"
            "Questions must be clear, concise, and naturally spoken (no complex punctuation or formatting).\n"
            "Each question has 4 multiple-choice options labeled A, B, C, D.\n"
            "Include brief audio-friendly feedback for correct and incorrect responses.\n"
            "Return ONLY a valid, COMPLETE JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "quizTitle": "Audio Quiz: [Topic Name]",\n'
            '  "questions": [\n'
            '    {\n'
            '      "id": 1,\n'
            '      "spokenQuestion": "What is the primary purpose of photosynthesis in plants?",\n'
            '      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],\n'
            '      "correct": 0,\n'
            '      "correctFeedbackAudio": "Correct! [Brief 1-sentence spoken explanation]",\n'
            '      "incorrectFeedbackAudio": "Not quite. [Brief 1-sentence spoken correction]"\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    elif arch == "cornell_notes":
        # Detect document type in prompt
        prompt = (
            "You are a master academic note-taking expert. First, identify whether this document is technical, narrative, or procedural.\n"
            "Then format the document into a high-yield Cornell Note-Taking System appropriate to its type.\n"
            "For technical docs: include precise definitions and mechanisms.\n"
            "For narrative docs: include key events, characters, themes.\n"
            "For procedural docs: include steps, workflows, decision points.\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "documentType": "technical|narrative|procedural",\n'
            '  "cues": ["Cue Question 1", "Key Term 2", "Core Principle 3"],\n'
            '  "notes": ["Detailed note paragraph 1.", "Detailed note paragraph 2."],\n'
            '  "summary": "Bottom summary statement synthesizing the whole lesson.",\n'
            '  "keyTakeaways": ["Takeaway 1", "Takeaway 2"],\n'
            '  "highlights": [\n'
            '    {"term": "KeyTerm", "type": "key_concept|process|formula|person|date", "definition": "Short definition"}\n'
            '  ],\n'
            '  "asciiDiagram": "Optional: simple ASCII diagram if document is procedural/technical. Otherwise empty string.",\n'
            '  "diagramTitle": "Title of the diagram if present"\n'
            "}"
        )
    elif arch == "qa_study_guide":
        prompt = (
            "You are a Socratic instructor. Create an interactive Socratic Text Q&A Study Guide with between 4 and 8 probing academic questions, detailed model answers, and concept tags.\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "qaPairs": [\n'
            '    {\n'
            '      "question": "Probing Text Question 1?",\n'
            '      "answer": "Comprehensive written model response explaining the concept step-by-step.",\n'
            '      "conceptTag": "Fundamental Concept",\n'
            '      "hint": "Think about the underlying structure or mechanism."\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    elif arch == "fill_blank":
        prompt = (
            "You are a kinesthetic interactive exercise designer. Create between 5 and 10 fill-in-the-blank practice exercises of MIXED difficulty based on the key terms in the text.\n"
            "Include easy (word-level), medium (phrase/concept-level), and hard (paragraph-level cloze) exercises.\n"
            "For each exercise, include progressive hints: first letter, first 3 letters, then full word.\n"
            "Domain-specific vocabulary should be prioritized as the missing terms.\n"
            "Return ONLY a valid, COMPLETE JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "exercises": [\n'
            '    {\n'
            '      "sentence": "In photosynthesis, plants convert _____ into chemical energy.",\n'
            '      "missingWord": "sunlight",\n'
            '      "difficulty": "easy",\n'
            '      "hint": "Solar energy source",\n'
            '      "hintLetters": ["s", "sun", "sunlight"]\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    elif arch == "scenario_roleplay":
        prompt = (
            "You are a scenario designer. Create a real-world dilemma scenario with 3 strategic choice pathways.\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "scenarioTitle": "Real-world Scenario Title",\n'
            '  "scenarioDescription": "Practical dilemma description requiring decision-making.",\n'
            '  "questions": [\n'
            '    {\n'
            '      "question": "What is your immediate tactical decision?",\n'
            '      "options": ["Option A choice", "Option B choice", "Option C choice"],\n'
            '      "correct": 0,\n'
            '      "explanation": "Why this choice yields optimal results."\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    elif arch == "challenge_quiz":
        prompt = (
            "You are an assessment author. Create between 4 and 8 multiple choice practice test questions based on the content.\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "question": "Practice test question",\n'
            '      "options": ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],\n'
            '      "correct": 0,\n'
            '      "explanation": "Rationale for the correct option"\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    elif arch == "mnemonic_song":
        prompt = (
            "You are an educational songwriter. Create a short 3-verse rhyming mnemonic song (AABB rhyme scheme) "
            "that encodes the 5 most important facts from the document into memorable lyrics. Include a simple chorus.\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "title": "Song Title",\n'
            '  "chorus": "Catchy chorus lyrics...",\n'
            '  "verses": [\n'
            '    {"label": "Verse 1", "lyrics": "Rhyming verse line 1\\nLine 2..."}\n'
            '  ],\n'
            '  "keyFacts": ["Fact 1 mapped to song", "Fact 2 mapped to song"]\n'
            "}"
        )
    else:  # glossary_notebook
        prompt = (
            "You are an academic note architect. Detect the document type (technical, narrative, or procedural), then create an executive notebook summary.\n"
            "Include: a key terms glossary, highlighted terms, intelligent diagram, and self-assessment prompts.\n"
            "Return ONLY a JSON object. NO codeblocks, NO preamble.\n"
            "Format:\n"
            "{\n"
            '  "documentType": "technical|narrative|procedural",\n'
            '  "executiveSummary": "Comprehensive academic overview paragraph synthesizing key findings.",\n'
            '  "highlights": [\n'
            '    {"term": "Term", "type": "key_concept|process|formula|person|date", "definition": "Short definition"}\n'
            '  ],\n'
            '  "glossary": [\n'
            '    {"term": "Term Name", "definition": "Clear, precise definition", "example": "Real-world contextual example."}\n'
            '  ],\n'
            '  "keyOutlines": ["Outline point 1: Core foundation", "Outline point 2: Operational details"],\n'
            '  "selfTestPrompts": ["Prompt 1: Define key term in your own words", "Prompt 2: Compare contrast concepts"],\n'
            '  "asciiDiagram": "Optional: ASCII diagram if content is procedural/technical. Otherwise empty string.",\n'
            '  "diagramTitle": "Optional title for diagram"\n'
            "}"
        )

    models_to_try = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]
    parsed = {}

    for model_name in models_to_try:
        try:
            completion = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Content from document ({doc_name}):\n\n{context_text}"}
                ],
                temperature=0.3,
                max_tokens=max_tokens
            )
            raw_text = completion.choices[0].message.content
            parsed = safe_parse_json(raw_text)
            if parsed and isinstance(parsed, dict) and len(parsed) > 0:
                break
        except Exception as e:
            print(f"LangGraph Agent model {model_name} execution fallback: {str(e)}")

    payload = {
        "architectureType": arch,
        "title": f"{doc_name} • Agent Tool",
        "targetMode": mode,
        "data": parsed
    }

    # Increment leaderboard points for style engagement
    field_mapping = {
        "visual": "visualPoints",
        "auditory": "auditoryPoints",
        "kinesthetic": "kinestheticPoints",
        "readwrite": "readwritePoints"
    }
    field = field_mapping.get(mode)
    if field:
        await leaderboard_collection.update_one(
            {"singletonId": "global"},
            {"$inc": {field: 1}},
            upsert=True
        )
    return {"output_payload": payload}


# Build and Compile LangGraph State Graph
builder = StateGraph(LearningAgentState)
builder.add_node("retrieve", retrieve_context_node)
builder.add_node("plan", plan_architecture_node)
builder.add_node("execute", execute_tool_node)

builder.set_entry_point("retrieve")
builder.add_edge("retrieve", "plan")
builder.add_edge("plan", "execute")
builder.add_edge("execute", END)

learning_agent_graph = builder.compile()


async def run_learning_agent(
    document_id: str,
    mode: str,
    tool_type: str,
    user_id: Any
) -> Dict[str, Any]:
    initial_state = {
        "document_id": document_id,
        "user_id": user_id,
        "mode": mode or "readwrite",
        "tool_type": tool_type or "auto",
        "contexts": [],
        "document_name": "Document",
        "architecture_type": "interactive_tree",
        "output_payload": {}
    }

    result = await learning_agent_graph.ainvoke(initial_state)
    return result.get("output_payload", {})
