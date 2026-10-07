from typing import Optional, List
from pydantic import BaseModel, Field


class SaveUsernameRequest(BaseModel):
    username: str = Field(..., description="LeetCode username to connect")


class LeetCodeSyncRequest(BaseModel):
    username: Optional[str] = Field(None, description="Optional override LeetCode username")
    session_cookie: Optional[str] = Field(None, description="Optional LEETCODE_SESSION cookie if submissions are private")
    today_only: bool = Field(True, description="Sync only problems solved today")


class SyncedProblemItem(BaseModel):
    position: Optional[int] = None
    title: str
    difficulty: str
    slug: str


class LeetCodeProblemItem(BaseModel):
    title_slug: str
    title: str
    difficulty: str
    attempt_count: int = 1
    failed_attempts: int = 0
    needs_revision: bool = False
    notes: Optional[str] = None
    last_submitted_at: Optional[str] = None
    matched_a2z_position: Optional[int] = None
    url: str
    is_today: bool = False


class UpdateProblemNoteRequest(BaseModel):
    notes: Optional[str] = None
    needs_revision: Optional[bool] = None


class LeetCodeProfileResponse(BaseModel):
    username: Optional[str] = None
    last_synced_at: Optional[str] = None
    total_synced: int = 0
    today_synced: int = 0
    needs_revision_count: int = 0
    leetcode_total_solved: Optional[int] = None
    leetcode_easy_solved: Optional[int] = None
    leetcode_medium_solved: Optional[int] = None
    leetcode_hard_solved: Optional[int] = None
    leetcode_ranking: Optional[int] = None
    leetcode_avatar: Optional[str] = None
    is_submissions_private: Optional[bool] = None


class LeetCodeProblemListResponse(BaseModel):
    profile: LeetCodeProfileResponse
    problems: List[LeetCodeProblemItem]


class LeetCodeSyncResponse(BaseModel):
    username: str
    total_accepted_submissions_found: int
    today_solved_count: int = 0
    matched_a2z_problems: int
    newly_solved: int
    already_solved: int
    needs_revision_count: int = 0
    synced_problems: List[SyncedProblemItem] = Field(default_factory=list)
    message: str

