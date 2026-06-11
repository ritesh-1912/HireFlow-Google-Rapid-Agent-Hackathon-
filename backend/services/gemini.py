import os
import json
from dotenv import load_dotenv
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

# Load environment variables
load_dotenv()

# Initialize Vertex AI
project = os.environ.get("GOOGLE_CLOUD_PROJECT")
location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

if project:
    vertexai.init(project=project, location=location)
else:
    print("Warning: GOOGLE_CLOUD_PROJECT is not set. Vertex AI initialization skipped in gemini.py.")

def get_gemini_model():
    # Utilizing gemini-2.0-flash-001 as requested
    return GenerativeModel("gemini-2.0-flash-001")

def structure_resume(raw_text: str) -> dict:
    """
    Uses Gemini to extract and structure candidate information from raw resume text.
    Returns a dict with: name, skills, experience_years, education, summary.
    """
    if not raw_text.strip():
        return {
            "name": "Unknown",
            "skills": [],
            "experience_years": 0.0,
            "education": [],
            "summary": "Empty resume content."
        }

    model = get_gemini_model()
    prompt = f"""
    Extract and structure the professional information from the following raw resume text.
    Return the output strictly as a JSON object with the following schema:
    {{
        "name": "Full Name",
        "skills": ["Skill 1", "Skill 2", ...],
        "experience_years": 5.5,
        "education": ["Degree/Certification - School/Institution", ...],
        "summary": "Short professional summary"
    }}
    
    IMPORTANT: Return ONLY a valid JSON object. Do NOT wrap the JSON in markdown code blocks (like ```json ... ```) or any other formatting. Do NOT include any explanation or additional text before or after the JSON object.

    Raw Resume Text:
    {raw_text}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=GenerationConfig(response_mime_type="application/json")
        )
        data = json.loads(response.text.strip())
        # Ensure correct type for experience_years
        if "experience_years" in data:
            try:
                data["experience_years"] = float(data["experience_years"])
            except ValueError:
                data["experience_years"] = 0.0
        return data
    except Exception as e:
        print(f"Error structuring resume with Gemini: {e}")
        # Try to clean response if it contains markdown code blocks
        try:
            cleaned = response.text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
            return data
        except Exception:
            pass
            
        return {
            "name": "Unknown Candidate",
            "skills": [],
            "experience_years": 0.0,
            "education": [],
            "summary": "Could not structure resume content due to model error."
        }

def rank_candidates(jd_text: str, candidates_list: list) -> list:
    """
    Uses Gemini to rank candidates against a job description.
    Each candidate in candidates_list should be a dictionary containing structured candidate data.
    Returns a list of dicts with: candidate_id, score, reasoning, interview_questions (list of 5 strings).
    """
    if not candidates_list:
        return []

    model = get_gemini_model()
    
    # Clean input list to only relevant fields for Gemini to reduce context tokens
    candidates_data = []
    for c in candidates_list:
        candidates_data.append({
            "candidate_id": str(c.get("_id") or c.get("id")),
            "name": c.get("name"),
            "skills": c.get("skills"),
            "experience_years": c.get("experience_years"),
            "education": c.get("education"),
            "summary": c.get("summary")
        })

    prompt = f"""
    You are an expert technical recruiter. Evaluate and rank the following candidates against the job description.
    
    Job Description:
    {jd_text}
    
    Candidates List:
    {json.dumps(candidates_data, indent=2)}
    
    Evaluate each candidate's match against the job description. For each candidate, assign a score out of 10 (decimal values are allowed), write a brief hiring manager reasoning explaining the score, and generate exactly 5 tailored interview questions.
    
    Return the output strictly as a JSON array of objects with the following schema:
    [
        {{
            "candidate_id": "string (matching candidate_id from the input list)",
            "score": 8.5,
            "reasoning": "Detailed reasoning here...",
            "interview_questions": [
                "Question 1?",
                "Question 2?",
                "Question 3?",
                "Question 4?",
                "Question 5?"
            ]
        }},
        ...
    ]
    
    Ensure you return ONLY a valid JSON array. Do not wrap it in markdown code blocks.
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=GenerationConfig(response_mime_type="application/json")
        )
        data = json.loads(response.text.strip())
        return data
    except Exception as e:
        print(f"Error ranking candidates with Gemini: {e}")
        # Try cleaning formatting
        try:
            cleaned = response.text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
            return data
        except Exception:
            pass
            
        return []
