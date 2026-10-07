from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class DifficultyStat(BaseModel):
    total: int = 0
    solved: int = 0


class TopicSummary(BaseModel):
    topic: str
    step_num: Optional[int] = None
    total: int = 0
    solved: int = 0
    difficulties: Dict[str, DifficultyStat] = Field(default_factory=dict)


class GlobalSummaryResponse(BaseModel):
    track: str = "DSA"
    total_problems: int = 474
    total_solved: int = 0
    topics: List[TopicSummary]


class ProblemItem(BaseModel):
    id: str
    track: str
    position: int
    step_num: Optional[int] = None
    topic: str
    subtopic: str
    title: str
    difficulty: str
    url: Optional[str] = None
    platform: Optional[str] = None
    article_url: Optional[str] = None
    video_url: Optional[str] = None
    companies_count: Optional[int] = None
    is_solved: bool = False
    completed_at: Optional[datetime] = None


class ProblemToggleResponse(BaseModel):
    track: str = "DSA"
    position: int
    is_solved: bool
    completed_at: Optional[datetime] = None
    message: str
