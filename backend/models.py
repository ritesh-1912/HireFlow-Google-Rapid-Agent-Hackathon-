from pydantic import BaseModel, Field
from typing import List, Optional

class ResumeStructure(BaseModel):
    name: str = Field(description="The full name of the candidate")
    skills: List[str] = Field(default_factory=list, description="List of technical and professional skills")
    experience_years: float = Field(default=0.0, description="Total years of professional experience")
    education: List[str] = Field(default_factory=list, description="Degrees, certifications, and educational background")
    summary: str = Field(description="A concise summary of the candidate's professional background")

class Candidate(BaseModel):
    id: str = Field(alias="_id")
    name: str
    skills: List[str]
    experience_years: float
    education: List[str]
    summary: str
    status: str = "Applied"  # Applied, Shortlisted, Rejected
    score: Optional[float] = None
    reasoning: Optional[str] = None
    interview_questions: List[str] = Field(default_factory=list)

    class Config:
        populate_by_name = True

class JobDescription(BaseModel):
    text: str

class CandidateStatusUpdate(BaseModel):
    status: str  # Applied, Shortlisted, Rejected
