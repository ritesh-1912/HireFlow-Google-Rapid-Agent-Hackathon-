import os
import httpx
import fitz  # PyMuPDF
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def text_to_pdf_bytes(text: str) -> bytes:
    """
    Utility helper to convert raw string text into valid PDF bytes in memory.
    """
    doc = fitz.open()
    page = doc.new_page()
    rect = fitz.Rect(50, 50, page.rect.width - 50, page.rect.height - 50)
    page.insert_textbox(rect, text)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes

def upload_job_and_resumes(jd_text: str, resume_texts: list[str]) -> str:
    """
    Uploads a job description (jd_text) and a list of resume text profiles (resume_texts).
    Converts each resume text to PDF bytes dynamically and submits it.
    Returns the generated job_id.
    """
    backend_url = os.getenv("BACKEND_URL")
    if not backend_url:
        raise ValueError("BACKEND_URL environment variable is not set")
        
    files = []
    for i, text in enumerate(resume_texts):
        pdf_bytes = text_to_pdf_bytes(text)
        files.append(("files", (f"resume_{i}.pdf", pdf_bytes, "application/pdf")))
        
    data = {"jd_text": jd_text}
    response = httpx.post(f"{backend_url}/upload", data=data, files=files)
    response.raise_for_status()
    return response.json().get("job_id", "")

def run_hiring_pipeline(job_id: str) -> str:
    """
    Triggers the background AI evaluation/ranking pipeline for candidates linked to a job_id.
    Returns a status message indicating the pipeline has started.
    """
    backend_url = os.getenv("BACKEND_URL")
    if not backend_url:
        raise ValueError("BACKEND_URL environment variable is not set")
        
    response = httpx.post(f"{backend_url}/run-pipeline", json={"job_id": job_id})
    response.raise_for_status()
    return response.json().get("message", "Pipeline started.")

def get_pipeline_status(job_id: str) -> str:
    """
    Checks the current execution status or step of the pipeline for a job_id.
    Returns the current step name or 'complete' once fully finished.
    """
    backend_url = os.getenv("BACKEND_URL")
    if not backend_url:
        raise ValueError("BACKEND_URL environment variable is not set")
        
    response = httpx.get(f"{backend_url}/pipeline-status", params={"job_id": job_id})
    response.raise_for_status()
    data = response.json()
    if data.get("status") == "completed":
        return "complete"
    return data.get("current_step") or data.get("status") or "idle"

def get_ranked_candidates(job_id: str) -> list[dict]:
    """
    Retrieves the candidate listings for the given job_id, sorted by score.
    Returns a list of dicts with each candidate's name, score, reasoning, and interview_questions.
    """
    backend_url = os.getenv("BACKEND_URL")
    if not backend_url:
        raise ValueError("BACKEND_URL environment variable is not set")
        
    response = httpx.get(f"{backend_url}/candidates", params={"job_id": job_id})
    response.raise_for_status()
    candidates = response.json()
    
    results = []
    for c in candidates:
        results.append({
            "name": c.get("name"),
            "score": c.get("score"),
            "reasoning": c.get("reasoning"),
            "interview_questions": c.get("interview_questions", [])
        })
    return results

root_agent = Agent(
    name="hireflow_agent",
    model="gemini-2.0-flash-001",
    description="AI hiring agent that screens and ranks candidates for small businesses",
    instruction="""
        You are HireFlow, an AI hiring agent for small businesses.
        You help hiring managers screen candidates efficiently.
        
        When asked to analyze candidates:
        1. Call run_hiring_pipeline with the provided job_id
        2. Poll get_pipeline_status until it returns 'complete'
        3. Call get_ranked_candidates to get the results
        4. Present a clear summary: who to shortlist, who to reject, 
           and the top 3 personalized interview questions per 
           shortlisted candidate
        
        Be concise and professional. Focus on helping the hiring 
        manager make fast, confident decisions.
    """,
    tools=[
        FunctionTool(upload_job_and_resumes),
        FunctionTool(run_hiring_pipeline),
        FunctionTool(get_pipeline_status),
        FunctionTool(get_ranked_candidates),
    ]
)
