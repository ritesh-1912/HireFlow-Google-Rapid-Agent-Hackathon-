from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import vertexai
from vertexai.generative_models import GenerativeModel
import os
from services.mongodb import get_db
import json

router = APIRouter()

vertexai.init(
    project=os.getenv("GOOGLE_CLOUD_PROJECT"),
    location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
)

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    job_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = []

def fetch_candidates(job_id: str):
    try:
        db = get_db()
        candidates = list(db.resumes.find(
            {"job_id": job_id},
            {"_id": 0, "embedding": 0}
        ).sort("score", -1))
        return candidates
    except Exception as e:
        return []

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        # Fetch candidates context if job_id provided
        candidates_context = ""
        if req.job_id:
            candidates = fetch_candidates(req.job_id)
            if candidates:
                candidates_context = "CURRENT CANDIDATES IN DATABASE:\n"
                for i, c in enumerate(candidates, 1):
                    candidates_context += (
                        f"{i}. {c.get('name', 'Unknown')} | "
                        f"Score: {c.get('score', 'N/A')}/10 | "
                        f"Status: {c.get('status', 'applied')} | "
                        f"Reason: {c.get('reasoning', 'N/A')}\n"
                    )
            else:
                candidates_context = "No candidates have been processed yet."

        system_prompt = f"""You are HireFlow AI, an autonomous hiring 
agent for small businesses. You help hiring managers make fast, 
confident hiring decisions.

{candidates_context}

Based on the candidate data above, answer the user's questions 
decisively. When listing candidates, use this format:
1. [Name] — Score: X/10 — [One line recommendation]

Tell the user exactly who to hire and why. Be concise."""

        model = GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=system_prompt
        )

        # Build history for context
        history_text = ""
        for h in (req.history or [])[-6:]:
            role = "You" if h.role == "model" else "User"
            history_text += f"{role}: {h.text}\n"

        full_message = history_text + f"User: {req.message}"

        response = model.generate_content(full_message)
        reply = response.text

        return {"reply": reply}

    except Exception as e:
        print(f"Chat error: {str(e)}")
        return {"reply": "I'm processing your request. Your candidates will appear in the Kanban board shortly. Ask me 'who are my candidates?' once the pipeline completes."}
