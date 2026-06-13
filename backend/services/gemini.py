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
    return GenerativeModel("gemini-2.5-flash")

def structure_resume(raw_text: str) -> dict:
    """
    Uses Gemini to extract and structure candidate information from raw resume text.
    Returns a dict with: name, skills, experience_years, education, summary.
    """
    if not raw_text.strip():
        return {
            "name": "Candidate",
            "skills": [],
            "experience_years": 0.0,
            "education": "Not specified",
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
    
    Return ONLY a raw JSON object. No markdown, no code fences, no explanation. Start your response with {{ and end with }}

    Raw Resume Text:
    {raw_text}
    """
    
    response = None
    parsed = {}
    try:
        response = model.generate_content(
            prompt,
            generation_config=GenerationConfig(response_mime_type="application/json")
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        parsed = json.loads(text)
    except Exception as e:
        print(f"Error structuring resume with Gemini: {e}")
        if response:
            try:
                text = response.text.strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                text = text.strip()
                parsed = json.loads(text)
            except Exception:
                pass
                
    exp_years = parsed.get("experience_years", 0)
    try:
        exp_years = float(exp_years)
    except (ValueError, TypeError):
        exp_years = 0.0

    return {
        "name": parsed.get("name") or "Candidate",
        "skills": parsed.get("skills") if isinstance(parsed.get("skills"), list) else [],
        "experience_years": exp_years,
        "education": parsed.get("education") or "Not specified",
        "summary": parsed.get("summary") or parsed.get("raw_text") or (raw_text[:200] if raw_text else "")
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
    
    Return ONLY a raw JSON object. No markdown, no code fences, no explanation. Start your response with [ and end with ]
    """
    
    response = None
    parsed = []
    try:
        response = model.generate_content(
            prompt,
            generation_config=GenerationConfig(response_mime_type="application/json")
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        parsed = json.loads(text)
    except Exception as e:
        print(f"Error ranking candidates with Gemini: {e}")
        if response:
            try:
                text = response.text.strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                text = text.strip()
                parsed = json.loads(text)
            except Exception:
                pass
                
    # Normalize results
    results = []
    if isinstance(parsed, dict):
        for key, val in parsed.items():
            if isinstance(val, list):
                parsed = val
                break
                
    if not isinstance(parsed, list):
        parsed = []
        
    for item in parsed:
        c_id = item.get("candidate_id")
        score = item.get("score", 5.0)
        try:
            score = float(score)
            score = max(0.0, min(10.0, score))
        except (ValueError, TypeError):
            score = 5.0
            
        results.append({
            "candidate_id": c_id,
            "score": score,
            "reasoning": item.get("reasoning") or "Evaluated by AI recruiter.",
            "interview_questions": item.get("interview_questions") if isinstance(item.get("interview_questions"), list) else ["Tell me about your experience."]
        })
        
    return results
