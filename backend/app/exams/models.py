from typing import Optional, List
from pydantic import BaseModel, Field


class ExamProblemItem(BaseModel):
    position: int
    title: str
    topic: str
    difficulty: str
    url: Optional[str] = None
    is_solved: bool = False


class ExamCreateRequest(BaseModel):
    title: str = "Timed Mock Assessment"
    duration_minutes: int = 60
    difficulty_preset: str = "standard"  # standard, drill, hardcore
    topic: Optional[str] = None


class ExamSubmitRequest(BaseModel):
    solved_positions: List[int] = Field(default_factory=list)
    notes: Optional[str] = None


class ExamSessionResponse(BaseModel):
    id: str
    title: str
    duration_minutes: int
    started_at: str
    expires_at: str
    status: str  # in_progress, completed, abandoned
    problems: List[ExamProblemItem]
    score: Optional[float] = None
    total_problems: int = 0
    solved_count: int = 0
    time_spent_seconds: Optional[int] = None
    completed_at: Optional[str] = None


class ExamHistoryItem(BaseModel):
    id: str
    title: str
    duration_minutes: int
    started_at: str
    completed_at: Optional[str] = None
    status: str
    total_problems: int
    solved_count: int
    score: float
