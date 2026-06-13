import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from typing import List
from services.pdf_parser import extract_text_from_pdf
from services.pipeline import run_pipeline
from services.mongodb import (
    save_job_description,
    insert_resume_doc,
    clear_resumes,
    get_active_job_id,
    get_active_job_description
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
    message: str = Form(...),
    session_id: str = Form("session_001"),
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
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
    job_id = save_job_description(message)
    
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
        
    if background_tasks:
        background_tasks.add_task(run_pipeline, job_id)
        
    return {
        "job_id": job_id,
        "resume_count": resume_count
    }


