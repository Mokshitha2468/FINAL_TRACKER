from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Path
from app.auth.dependencies import get_current_user, get_optional_current_user
from app.problems.models import GlobalSummaryResponse, ProblemItem, ProblemToggleResponse
from app.problems.service import get_topic_summaries, get_problems, toggle_problem_progress

router = APIRouter(prefix="/problems", tags=["Problems & Dashboard"])


@router.get("/summary", response_model=GlobalSummaryResponse)
def get_summary(
    track: str = Query("DSA", description="Curriculum track (e.g. DSA, DBMS, OOP)"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Returns high-level summary cards for all Topics in the track.
    Computes total problems, solved problems, and Easy/Medium/Hard breakdown.
    If authenticated, returns the user's progress; otherwise returns 0 solved.
    """
    user_id = current_user["id"] if current_user else None
    return get_topic_summaries(user_id=user_id, track=track)


@router.get("", response_model=List[ProblemItem])
def list_problems(
    track: str = Query("DSA", description="Curriculum track"),
    topic: Optional[str] = Query(None, description="Topic name (e.g. Arrays, Strings)"),
    difficulty: Optional[str] = Query(None, description="Difficulty (Easy, Medium, Hard)"),
    subtopic: Optional[str] = Query(None, description="Filter by original A2Z subtopic metadata"),
    status: Optional[str] = Query(None, description="Filter by 'solved' or 'unsolved'"),
    search: Optional[str] = Query(None, description="Search term matching title or subtopic"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Retrieves canonical problems matching Topic -> Difficulty -> Problems hierarchy.
    Results are strictly sorted by position ASC (1 -> 474).
    Subtopic is available as a filter without altering primary hierarchy.
    """
    user_id = current_user["id"] if current_user else None
    return get_problems(
        track=track,
        topic=topic,
        difficulty=difficulty,
        subtopic=subtopic,
        status_filter=status,
        search=search,
        user_id=user_id,
    )


@router.post("/{position}/toggle", response_model=ProblemToggleResponse)
def toggle_problem(
    position: int = Path(..., ge=1, le=474, description="Canonical A2Z problem position (1-474)"),
    track: str = Query("DSA", description="Curriculum track"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Toggles a problem's solved status for the authenticated user.
    Modifies only the user_problem_progress collection.
    The canonical a2z_problems document is never modified.
    """
    return toggle_problem_progress(
        user_id=current_user["id"],
        position=position,
        track=track,
    )
