import os
import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.operations import SearchIndexModel
from bson.objectid import ObjectId

# Load environment variables
load_dotenv()

MONGODB_URI = os.environ.get("MONGODB_URI")
if not MONGODB_URI:
    print("Warning: MONGODB_URI env variable is not set. Defaulting to local MongoDB.")
    MONGODB_URI = "mongodb://localhost:27017/"

# Initialize client and db
client = MongoClient(MONGODB_URI)
db = client["hireflow"]

# Collections
resumes_collection = db["resumes"]  # Target "resumes" collection
jd_collection = db["jobs"]

def create_vector_search_index():
    """
    Creates a Vector Search Index on the 'resumes' collection in the 'hireflow' database.
    Checks if a search index named 'resume_vector_index' already exists.
    """
    try:
        index_exists = False
        try:
            indexes = list(resumes_collection.list_search_indexes())
            for idx in indexes:
                if idx.get("name") == "resume_vector_index":
                    index_exists = True
                    break
        except Exception:
            # Fallback if list_search_indexes is not supported on non-Atlas or local environment
            pass

        if index_exists:
            print("Index already exists")
            return

        model = SearchIndexModel(
            definition={
                "fields": [
                    {
                        "type": "vector",
                        "path": "embedding",
                        "numDimensions": 768,
                        "similarity": "cosine"
                    }
                ]
            },
            name="resume_vector_index",
            type="vectorSearch"
        )
        resumes_collection.create_search_index(model=model)
        print("Vector search index created")
    except Exception as e:
        print(f"Error creating search index: {e}")


def insert_resume_doc(resume_data: dict, raw_text: str, job_id: str, embedding: list[float] = None) -> str:
    """
    Inserts a resume into the database containing all requested schema fields.
    """
    doc = {
        "raw_text": raw_text,
        "name": resume_data.get("name"),
        "skills": resume_data.get("skills", []),
        "experience_years": resume_data.get("experience_years", 0.0),
        "education": resume_data.get("education", []),
        "summary": resume_data.get("summary", ""),
        "embedding": embedding if embedding is not None else [0.0] * 768,
        "score": None,
        "reasoning": None,
        "interview_questions": [],
        "status": "applied",  # status: "applied" | "shortlisted" | "rejected"
        "job_id": job_id,
        "created_at": datetime.datetime.utcnow()
    }
    result = resumes_collection.insert_one(doc)
    return str(result.inserted_id)

def clear_resumes():
    """
    Clears all documents in the resumes collection.
    """
    resumes_collection.delete_many({})

def save_job_description(jd_text: str) -> str:
    """
    Saves the active Job Description and returns its string ID.
    """
    result = jd_collection.update_one(
        {"active": True},
        {"$set": {"text": jd_text, "updated_at": datetime.datetime.utcnow()}},
        upsert=True
    )
    doc = jd_collection.find_one({"active": True})
    return str(doc["_id"]) if doc else "default_job_id"

def get_active_job_description() -> str:
    """
    Retrieves the active Job Description text.
    """
    doc = jd_collection.find_one({"active": True})
    return doc.get("text", "") if doc else ""

def get_active_job_id() -> str:
    """
    Retrieves the active Job Description document ID.
    """
    doc = jd_collection.find_one({"active": True})
    return str(doc["_id"]) if doc else "default_job_id"

def vector_search(query_embedding: list[float], top_k: int = 10) -> list[dict]:
    """
    Performs vector search on the 'resumes' collection using the 'resume_vector_index'.
    Returns full documents containing a 'vector_score' field.
    """
    pipeline = [
        {
            "$vectorSearch": {
                "index": "resume_vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": 50,
                "limit": top_k
            }
        },
        {
            "$addFields": {
                "vector_score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    try:
        results = list(resumes_collection.aggregate(pipeline))
        for doc in results:
            doc["_id"] = str(doc["_id"])
            doc.pop("embedding", None)  # Remove embedding vectors from response to optimize payload size
        return results
    except Exception as e:
        print(f"Vector search failed (index might be building or not supported): {e}")
        print("Falling back to local scan retrieval.")
        
        # Fallback: Get all resumes from DB and add placeholder vector_score
        results = list(resumes_collection.find({}))
        for doc in results:
            doc["_id"] = str(doc["_id"])
            doc["vector_score"] = 0.0
            doc.pop("embedding", None)
        return results

def update_candidate_score(candidate_id: str, score: float, reasoning: str, interview_questions: list[str]):
    """
    Updates the evaluation score, reasoning, and interview questions on a resume.
    """
    try:
        resumes_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {
                "$set": {
                    "score": score,
                    "reasoning": reasoning,
                    "interview_questions": interview_questions
                }
            }
        )
    except Exception as e:
        print(f"Error updating resume score for {candidate_id}: {e}")

def update_candidate_status(candidate_id: str, status: str):
    """
    Updates the Kanban status of a resume (applied, shortlisted, rejected).
    """
    try:
        resumes_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"status": status.lower()}}  # Ensure stored status is lowercase
        )
    except Exception as e:
        print(f"Error updating resume status for {candidate_id}: {e}")

def get_candidates() -> list[dict]:
    """
    Retrieves all resumes.
    """
    results = list(resumes_collection.find({}))
    for doc in results:
        doc["_id"] = str(doc["_id"])
        doc.pop("embedding", None)
    return results

def get_db():
    return db

def get_candidates_by_job(job_id: str):
    db = get_db()
    return list(db.resumes.find(
        {"job_id": job_id}, 
        {"_id": 0, "embedding": 0}
    ).sort("score", -1))

def update_candidate_status(job_id: str, candidate_name: str, status: str):
    db = get_db()
    db.resumes.update_one(
        {"job_id": job_id, "name": candidate_name},
        {"$set": {"status": status}}
    )

