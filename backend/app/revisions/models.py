from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProblemNotes(BaseModel):
    approach: Optional[str] = Field(default="", description="What approach did I use?")
    what_went_wrong: Optional[str] = Field(default="", description="What went wrong?")
    what_learned: Optional[str] = Field(default="", description="What did I learn?")
    remember_next_time: Optional[str] = Field(default="", description="What should I remember next time?")


class ProblemLogRequest(BaseModel):
    title: str = Field(..., min_length=1, description="Problem name or title")
    platform: Optional[str] = Field(default="leetcode", description="leetcode, gfg, takeuforward, etc.")
    url: Optional[str] = Field(default=None, description="Problem URL")
    topic: Optional[str] = Field(default="Arrays", description="Topic name")
    difficulty: Optional[str] = Field(default="Medium", description="Easy, Medium, or Hard")
    status: str = Field(default="solved", description="solved or attempted")
    date: Optional[str] = Field(default=None, description="Completion date (YYYY-MM-DD)")
    notes: Optional[ProblemNotes] = Field(default_factory=ProblemNotes)


class RevisionEventResponse(BaseModel):
    id: str
    user_id: str
    track: str = "DSA"
    position: Optional[int] = None
    problem_title: str
    topic: str
    difficulty: str
    url: Optional[str] = None
    revision_number: int
    scheduled_date: str
    is_completed: bool
    completed_at: Optional[datetime] = None
    is_due: bool = False


class RevisionStatsResponse(BaseModel):
    due_today: int = 0
    upcoming: int = 0
    completed: int = 0
    total: int = 0
