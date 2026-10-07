from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class WeeklyHours(BaseModel):
    monday: float = Field(default=2.0, ge=0.0, le=24.0)
    tuesday: float = Field(default=2.0, ge=0.0, le=24.0)
    wednesday: float = Field(default=1.5, ge=0.0, le=24.0)
    thursday: float = Field(default=2.0, ge=0.0, le=24.0)
    friday: float = Field(default=1.5, ge=0.0, le=24.0)
    saturday: float = Field(default=3.0, ge=0.0, le=24.0)
    sunday: float = Field(default=3.0, ge=0.0, le=24.0)


class DifficultyEstimates(BaseModel):
    Easy: int = Field(default=20, ge=5, le=120, description="Estimated minutes for Easy")
    Medium: int = Field(default=35, ge=10, le=180, description="Estimated minutes for Medium")
    Hard: int = Field(default=45, ge=15, le=240, description="Estimated minutes for Hard")


class PlannerSettingsRequest(BaseModel):
    weekly_hours: Optional[WeeklyHours] = None
    difficulty_estimates: Optional[DifficultyEstimates] = None


class ScheduledProblem(BaseModel):
    position: int
    title: str
    difficulty: str
    topic: str
    estimated_minutes: int
    is_completed: bool = False
    url: Optional[str] = None


class DailyScheduleSlot(BaseModel):
    date: str
    day_of_week: str
    available_minutes: int
    allocated_minutes: int
    items: List[ScheduledProblem]


class PlannerScheduleResponse(BaseModel):
    track: str = "DSA"
    total_remaining_problems: int
    total_remaining_hours: float
    weekly_available_hours: float
    estimated_days_needed: int
    target_completion_date: Optional[str] = None
    schedule: List[DailyScheduleSlot]
