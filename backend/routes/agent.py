from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel
from services.pipeline import run_pipeline
from services.mongodb import db

router = APIRouter()

class PipelineRequest(BaseModel):
    job_id: str

@router.post("/run-pipeline")
async def run_pipeline_route(payload: PipelineRequest, background_tasks: BackgroundTasks):
    """
    Triggers the AI agent hiring pipeline as a background task for a given job_id.
    """
    job_id = payload.job_id
    if not job_id:
        raise HTTPException(status_code=400, detail="Missing job_id in request body.")
        
    # Check if pipeline is already running for this job
    active_status = db.pipeline_status.find_one({"job_id": job_id})
    if active_status and active_status.get("step") in ["parsing", "embedding", "searching", "ranking"]:
        return {
            "message": "Pipeline is already running for this job.",
            "job_id": job_id,
            "status": active_status.get("step")
        }
        
    background_tasks.add_task(run_pipeline, job_id)
    return {"message": "Pipeline started.", "job_id": job_id}

@router.get("/pipeline-status")
async def get_pipeline_status(job_id: str = Query(..., description="The ID of the job to check status for")):
    """
    Returns the current status of the pipeline steps for a specific job_id, mapped to UI stepper expectations.
    """
    doc = db.pipeline_status.find_one({"job_id": job_id})
    if not doc:
        return {
            "status": "idle",
            "current_step": "",
            "error": None,
            "steps": {
                "Parsing Resumes": "pending",
                "Structuring with Gemini": "pending",
                "Generating Embeddings": "pending",
                "Running Vector Search": "pending",
                "Ranking Candidates": "pending"
            }
        }
        
    step = doc.get("step", "idle")
    error = doc.get("error")
    
    # Map backend pipeline steps to frontend stepper steps
    steps_map = {
        "Parsing Resumes": "pending",
        "Structuring with Gemini": "pending",
        "Generating Embeddings": "pending",
        "Running Vector Search": "pending",
        "Ranking Candidates": "pending"
    }
    
    status = "running"
    current_step = ""
    
    if step == "parsing":
        steps_map["Parsing Resumes"] = "completed"
        steps_map["Structuring with Gemini"] = "running"
        current_step = "Structuring with Gemini"
    elif step == "embedding":
        steps_map["Parsing Resumes"] = "completed"
        steps_map["Structuring with Gemini"] = "completed"
        steps_map["Generating Embeddings"] = "running"
        current_step = "Generating Embeddings"
    elif step == "searching":
        steps_map["Parsing Resumes"] = "completed"
        steps_map["Structuring with Gemini"] = "completed"
        steps_map["Generating Embeddings"] = "completed"
        steps_map["Running Vector Search"] = "running"
        current_step = "Running Vector Search"
    elif step == "ranking":
        steps_map["Parsing Resumes"] = "completed"
        steps_map["Structuring with Gemini"] = "completed"
        steps_map["Generating Embeddings"] = "completed"
        steps_map["Running Vector Search"] = "completed"
        steps_map["Ranking Candidates"] = "running"
        current_step = "Ranking Candidates"
    elif step == "complete":
        steps_map["Parsing Resumes"] = "completed"
        steps_map["Structuring with Gemini"] = "completed"
        steps_map["Generating Embeddings"] = "completed"
        steps_map["Running Vector Search"] = "completed"
        steps_map["Ranking Candidates"] = "completed"
        status = "completed"
    elif step == "failed":
        status = "failed"
        
    return {
        "status": status,
        "current_step": current_step,
        "error": error,
        "steps": steps_map
    }
