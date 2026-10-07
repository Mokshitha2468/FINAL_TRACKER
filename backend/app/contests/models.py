from typing import Optional, List
from pydantic import BaseModel, Field


class ContestItem(BaseModel):
    id: str
    name: str
    platform: str  # LeetCode, Codeforces, CodeChef, AtCoder
    start_time: str  # ISO string or human-readable format
    duration_minutes: int
    url: str
    is_bookmarked: bool = False


class ContestBookmarkToggleResponse(BaseModel):
    contest_id: str
    is_bookmarked: bool
    message: str
