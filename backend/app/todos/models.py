from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TodoCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(default="", max_length=1000, description="Task details")
    due_date: Optional[str] = Field(default=None, description="Due date (YYYY-MM-DD)")
    priority: str = Field(default="medium", description="low, medium, or high")


class TodoUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    due_date: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None


class TodoItemResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None
    priority: str
    completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
