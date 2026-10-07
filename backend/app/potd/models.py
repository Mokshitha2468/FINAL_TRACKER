from typing import Optional, List
from pydantic import BaseModel, Field


class POTDProblem(BaseModel):
    position: int
    title: str
    topic: str
    difficulty: str
    subtopic: Optional[str] = None
    url: Optional[str] = None


class POTDDayStatus(BaseModel):
    date: str
    day_name: str
    is_solved: bool


class POTDResponse(BaseModel):
    date: str
    problem: POTDProblem
    is_solved: bool = False
    solved_at: Optional[str] = None
    streak: int = 0
    history: List[POTDDayStatus] = Field(default_factory=list)


class POTDCompleteResponse(BaseModel):
    message: str
    date: str
    is_solved: bool
    streak: int
    position: int
