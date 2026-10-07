from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from app.auth.dependencies import get_current_user
from app.revisions.models import ProblemLogRequest
from app.revisions.service import log_problem, get_user_revisions, complete_revision

router = APIRouter(prefix="/revisions", tags=["Revisions & Manual Logging"])


@router.post("/log", status_code=status.HTTP_201_CREATED)
def log_manual_problem(
    req: ProblemLogRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Manually logs a problem with structured reflection notes.
    - Automatically links to canonical A2Z problem if URL or Title matches.
    - Automatically schedules +1, +3, +7, +21 days spaced repetition if solved.
    """
    return log_problem(user_id=current_user["id"], req=req)


@router.get("")
def list_revisions(
    filter_type: Optional[str] = Query(None, alias="filter", description="due_today, upcoming, or completed"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieves spaced repetition revision events for the authenticated user.
    Returns stats summary (due_today, upcoming, completed) and the event list.
    """
    return get_user_revisions(user_id=current_user["id"], filter_type=filter_type)


@router.post("/{revision_id}/complete")
def mark_revision_complete(
    revision_id: str = Path(..., description="Revision event ObjectId string"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Marks a scheduled spaced repetition event as completed.
    """
    return complete_revision(user_id=current_user["id"], revision_id=revision_id)
