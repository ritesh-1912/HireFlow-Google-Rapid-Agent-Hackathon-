import os
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from typing import List
from services.pdf_parser import extract_text_from_pdf
from services.pipeline import run_pipeline
from services.mongodb import (
    save_job_description,
    insert_resume_doc,
    clear_resumes,
    get_active_job_id,
    get_active_job_description,
    get_db
)

router = APIRouter()

@router.get("/active-job")
async def get_active_job():
    job_id = get_active_job_id()
    text = get_active_job_description()
    return {"job_id": job_id, "text": text}


@router.post("/upload")
async def upload(
    jd_text: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")
        
    # Check if files are PDFs
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF.")
            
    # Clear resumes collection first to make it a fresh run
    clear_resumes()
    
    # Save the JD and retrieve the job_id
    job_id = save_job_description(jd_text)
    
    resume_count = 0
    total_files = len(files)
    # Parse PDF contents and store them as initial resumes in MongoDB linked to job_id
    for file in files:
        content = await file.read()
        try:
            raw_text = extract_text_from_pdf(content)
        except Exception as e:
            raw_text = f"Error reading PDF content: {e}"
            
        fallback_name = os.path.splitext(file.filename)[0].replace("_", " ").title()
        
        insert_resume_doc(
            resume_data={"name": fallback_name},
            raw_text=raw_text,
            job_id=job_id,
            embedding=[0.0] * 768
        )
        resume_count += 1
        print(f"Inserted resume {resume_count} of {total_files}")
        
    return {
        "job_id": job_id,
        "resume_count": resume_count
    }


@router.post("/upload-in-chat")
async def upload_in_chat(
    files: List[UploadFile] = File(...),
    jd_text: str = Form(...),
    session_id: str = Form(default="default"),
    background_tasks: BackgroundTasks = None
):
    try:
        db = get_db()
        
        # Create a job document
        job = {
            "title": jd_text[:100],
            "text": jd_text,
            "raw_text": jd_text,
            "created_at": datetime.utcnow(),
            "session_id": session_id,
            "active": True
        }
        # Mark other jobs as inactive so this is the active one
        db.jobs.update_many({"active": True}, {"$set": {"active": False}})
        
        job_result = db.jobs.insert_one(job)
        job_id = str(job_result.inserted_id)
        
        resume_count = 0
        for file in files:
            contents = await file.read()
            # Extract text from PDF
            raw_text = extract_text_from_pdf(contents)
            if not raw_text.strip():
                continue
            
            resume_doc = {
                "job_id": job_id,
                "filename": file.filename,
                "raw_text": raw_text,
                "name": file.filename.replace(".pdf", ""),
                "skills": [],
                "experience_years": 0,
                "score": 0,
                "reasoning": "",
                "interview_questions": [],
                "status": "applied",
                "embedding": [],
                "created_at": datetime.utcnow()
            }
            db.resumes.insert_one(resume_doc)
            resume_count += 1
        
        # Automatically trigger the pipeline as background task
        if background_tasks is None:
            background_tasks = BackgroundTasks()
        background_tasks.add_task(run_pipeline, job_id)
        
        return {
            "job_id": job_id,
            "resume_count": resume_count,
            "message": f"Uploaded {resume_count} resume(s). Pipeline starting..."
        }
    except Exception as e:
        print(f"Upload-in-chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


