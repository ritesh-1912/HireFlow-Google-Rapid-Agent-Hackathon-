from fastapi import APIRouter, HTTPException, Query
from services.mongodb import resumes_collection, update_candidate_status
from models import CandidateStatusUpdate
from bson import ObjectId

router = APIRouter()

@router.get("/candidates")
async def get_candidates_for_job(job_id: str = Query(..., description="The ID of the job to get candidates for")):
    """
    Returns all resumes for the specified job_id, sorted by score descending (unranked candidates sorted last).
    """
    try:
        results = list(resumes_collection.find({"job_id": job_id}))
        for doc in results:
            doc["_id"] = str(doc["_id"])
            doc.pop("embedding", None)  # Remove embedding to reduce response payload
            
        sorted_candidates = sorted(
            results,
            key=lambda x: (x.get("score") is not None, x.get("score") or 0.0),
            reverse=True
        )
        return sorted_candidates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve candidates: {e}")

@router.put("/candidates/{candidate_id}/status")
async def update_status(candidate_id: str, payload: CandidateStatusUpdate):
    """
    Updates a candidate's status column (applied, shortlisted, rejected).
    """
    update_candidate_status(candidate_id, payload.status)
    return {"message": "Candidate status updated successfully."}

@router.patch("/candidates/{id}/status")
async def patch_status(id: str, payload: CandidateStatusUpdate):
    """
    Updates a candidate's status column (applied, shortlisted, rejected) using PATCH.
    """
    update_candidate_status(id, payload.status)
    return {"message": "Candidate status updated successfully."}

