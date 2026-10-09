from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class NoteCreateRequest(BaseModel):
    category: str = Field(default="DSA", description="Category: DSA or AI or custom")
    title: str = Field(default="Untitled Note", min_length=1, max_length=200)
    content: str = Field(default="")
    tags: List[str] = Field(default_factory=list)
    urls: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    is_pinned: bool = False


class NoteUpdateRequest(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    urls: Optional[List[str]] = None
    images: Optional[List[str]] = None
    is_pinned: Optional[bool] = None


class NoteResponse(BaseModel):
    id: str
    user_id: str
    category: str
    title: str
    content: str
    tags: List[str] = Field(default_factory=list)
    urls: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    is_pinned: bool = False
    created_at: datetime
    updated_at: datetime
