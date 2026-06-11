import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import client, db, and indexer from services.mongodb
from services.mongodb import client, create_vector_search_index

# Import modular routers
from routes.upload import router as upload_router
from routes.agent import router as agent_router
from routes.candidates import router as candidates_router
from routes.chat import router as chat_router

# Load env vars
load_dotenv()

app = FastAPI(title="HireFlow AI Hiring Agent Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Enable CORS for all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    try:
        # 1. Connect to "hireflow" database (ensured via client selection)
        target_db = client["hireflow"]
        
        # 2. Creates three collections if they don't exist: "resumes", "jobs", "pipeline_status"
        existing_cols = target_db.list_collection_names()
        required_cols = ["resumes", "jobs", "pipeline_status"]
        for col in required_cols:
            if col not in existing_cols:
                target_db.create_collection(col)
                print(f"Collection '{col}' created")
                
        # 3. Creates a regular index on resumes.job_id field for fast lookups
        target_db["resumes"].create_index("job_id")
        print("Regular index on resumes.job_id created")
        
        # 4. Build vector search index on startup
        create_vector_search_index()
    except Exception as e:
        print(f"Database initialization failed on startup: {e}")
        print("FastAPI will start, but database operations may fail until the MongoDB connection is resolved.")

# Register routes
app.include_router(upload_router)
app.include_router(agent_router)
app.include_router(candidates_router)
app.include_router(chat_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
