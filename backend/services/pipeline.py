import os
from dotenv import load_dotenv
load_dotenv()

import datetime
from bson.objectid import ObjectId
from services.mongodb import (
    db,
    resumes_collection,
    vector_search,
    get_active_job_description,
    update_candidate_score
)
from services.gemini import structure_resume, rank_candidates
from services.embeddings import embed_text

def set_pipeline_status(job_id: str, step: str, error: str = None):
    """
    Updates the step and error in the MongoDB 'pipeline_status' collection.
    """
    db["pipeline_status"].update_one(
        {"job_id": job_id},
        {
            "$set": {
                "step": step,
                "error": error,
                "updated_at": datetime.datetime.utcnow()
            }
        },
        upsert=True
    )

async def run_pipeline(job_id: str):
    """
    Orchestrates the AI hiring pipeline.
    Steps:
      1. Set status to "parsing"
      2. Fetch all resumes for job_id from MongoDB
      3. For each resume, call structure_resume and update the DB document
      4. Set status to "embedding"
      5. For each resume, generate text embedding and store it back
      6. Set status to "searching"
      7. Embed Job Description and run vector_search
      8. Set status to "ranking"
      9. Call rank_candidates on top 10 candidates
      10. Update candidates with their scores, reasoning, and interview questions
      11. Set top 3 scores to "shortlisted", rest to "applied"
      12. Set status to "complete"
    """
    try:
        # 1. Sets pipeline status to "parsing" in a MongoDB "pipeline_status" collection
        set_pipeline_status(job_id, "parsing")

        # 2. Fetches all resumes for the job_id from MongoDB
        resumes = list(resumes_collection.find({"job_id": job_id}))
        if not resumes:
            raise ValueError(f"No resumes found in the database for job_id '{job_id}'.")

        # 3. For each resume, calls gemini.structure_resume() and updates the MongoDB document
        for r in resumes:
            raw_text = r.get("raw_text", "")
            structured = structure_resume(raw_text)
            
            resumes_collection.update_one(
                {"_id": r["_id"]},
                {
                    "$set": {
                        "name": structured.get("name", "Unknown"),
                        "skills": structured.get("skills", []),
                        "experience_years": structured.get("experience_years", 0.0),
                        "education": structured.get("education", []),
                        "summary": structured.get("summary", "")
                    }
                }
            )

        # 4. Sets status to "embedding"
        set_pipeline_status(job_id, "embedding")

        # 5. For each resume, calls embeddings.embed_text(resume.summary + " " + " ".join(resume.skills)) and stores the vector back in MongoDB
        # Fetch updated resumes from DB
        updated_resumes = list(resumes_collection.find({"job_id": job_id}))
        for r in updated_resumes:
            summary = r.get("summary", "")
            skills = r.get("skills", [])
            text_to_embed = f"{summary} {' '.join(skills)}".strip()
            
            vector = embed_text(text_to_embed)
            resumes_collection.update_one(
                {"_id": r["_id"]},
                {"$set": {"embedding": vector}}
            )

        # 6. Sets status to "searching"
        set_pipeline_status(job_id, "searching")

        # 7. Embeds the job description text and runs mongodb.vector_search() to get top 10 candidates
        jd_text = get_active_job_description()
        if not jd_text:
            raise ValueError("No active job description found.")
            
        jd_embedding = embed_text(jd_text)
        top_candidates = vector_search(jd_embedding, top_k=10)

        # 8. Sets status to "ranking"
        set_pipeline_status(job_id, "ranking")

        # 9. Calls gemini.rank_candidates() on the top 10, gets scores, reasoning, interview_questions
        # Filter top candidates to only include those matching this job_id
        top_candidates = [c for c in top_candidates if c.get("job_id") == job_id]

        if top_candidates:
            ranked_results = rank_candidates(jd_text, top_candidates)

            # 10. Updates each candidate in MongoDB with their score, reasoning, interview_questions
            for rank_item in ranked_results:
                cand_id = rank_item.get("candidate_id")
                score = rank_item.get("score")
                reasoning = rank_item.get("reasoning")
                questions = rank_item.get("interview_questions", [])
                
                if cand_id:
                    update_candidate_score(cand_id, score, reasoning, questions)

        # 11. Sets top 3 scores as status="shortlisted", rest as "applied"
        # Fetch all candidates for the job to sort and partition
        all_candidates = list(resumes_collection.find({"job_id": job_id}))
        
        # Split into scored vs unscored
        scored = [c for c in all_candidates if c.get("score") is not None]
        unscored = [c for c in all_candidates if c.get("score") is None]
        
        # Sort scored descending
        scored.sort(key=lambda x: x.get("score"), reverse=True)
        
        # Mark top 3 as shortlisted
        for idx, c in enumerate(scored):
            status = "shortlisted" if idx < 3 else "applied"
            resumes_collection.update_one(
                {"_id": c["_id"]},
                {"$set": {"status": status}}
            )
            
        # Unscored are marked as applied
        for c in unscored:
            resumes_collection.update_one(
                {"_id": c["_id"]},
                {"$set": {"status": "applied"}}
            )

        # 12. Sets pipeline status to "complete"
        set_pipeline_status(job_id, "complete")

    except Exception as e:
        print(f"Pipeline failed for job_id {job_id}: {e}")
        set_pipeline_status(job_id, "failed", error=str(e))
        raise e
