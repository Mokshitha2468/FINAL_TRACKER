from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import get_current_user
from app.planner.models import (
    PlannerSettingsRequest,
    PlannerScheduleResponse,
)
from app.planner.service import (
    get_or_create_settings,
    update_settings,
    generate_schedule,
    get_schedule,
    get_today_schedule,
    get_next_unsolved,
)

router = APIRouter(prefix="/planner", tags=["Planly — Study Planner"])


@router.get("/settings")
def get_planner_settings(
    track: str = Query("DSA", description="Curriculum track"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves the user's weekly study hours and time estimate settings."""
    return get_or_create_settings(user_id=current_user["id"], track=track)


@router.post("/settings")
def save_planner_settings(
    req: PlannerSettingsRequest,
    track: str = Query("DSA", description="Curriculum track"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Updates weekly availability and difficulty estimates.
    Automatically triggers forward replanning for remaining unsolved problems.
    """
    settings = update_settings(user_id=current_user["id"], req=req, track=track)
    schedule = generate_schedule(user_id=current_user["id"], track=track)
    return {"settings": settings, "schedule_summary": schedule}


@router.post("/generate", response_model=PlannerScheduleResponse)
def trigger_generate_schedule(
    track: str = Query("DSA", description="Curriculum track"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Generates the complete forward-looking study schedule up front.
    Packs unsolved problems into daily slots based on available study hours.
    """
    return generate_schedule(user_id=current_user["id"], track=track)


@router.get("/schedule", response_model=PlannerScheduleResponse)
def get_full_schedule(
    track: str = Query("DSA", description="Curriculum track"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieves the complete generated study schedule.
    If no schedule has been generated yet, it runs generation automatically.
    """
    return get_schedule(user_id=current_user["id"], track=track)


@router.get("/today")
def get_today_plan(
    track: str = Query("DSA", description="Curriculum track"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves today's assigned study slot and problems."""
    slot = get_today_schedule(user_id=current_user["id"], track=track)
    return slot or {"date": None, "items": [], "allocated_minutes": 0}


@router.get("/next-unsolved")
def list_next_unsolved(
    limit: int = Query(10, ge=1, le=100, description="Number of problems to retrieve"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    track: str = Query("DSA", description="Curriculum track"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieves the next N unsolved problems following canonical position ASC order.
    Example: 'Next 10 unsolved Easy Array problems'.
    """
    return get_next_unsolved(
        user_id=current_user["id"],
        limit=limit,
        topic=topic,
        difficulty=difficulty,
        track=track,
    )
