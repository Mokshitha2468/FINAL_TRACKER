from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class WhiteboardCreateRequest(BaseModel):
    title: str = Field(default="Weekly Study Notes", min_length=1, max_length=120)


class WhiteboardUpdateRequest(BaseModel):
    title: Optional[str] = None
    elements: Optional[List[Dict[str, Any]]] = None
    viewport: Optional[Dict[str, Any]] = None
    thumbnail: Optional[str] = None


class WhiteboardSummaryResponse(BaseModel):
    id: str
    title: str
    element_count: int = 0
    created_at: datetime
    updated_at: datetime


class WhiteboardDetailResponse(BaseModel):
    id: str
    title: str
    elements: List[Dict[str, Any]] = Field(default_factory=list)
    viewport: Dict[str, Any] = Field(default_factory=lambda: {"panX": 0, "panY": 0, "zoom": 1.0})
    thumbnail: Optional[str] = None
    created_at: datetime
    updated_at: datetime
