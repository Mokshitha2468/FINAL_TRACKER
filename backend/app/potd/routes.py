from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from app.auth.dependencies import get_current_user, get_optional_current_user
from app.potd.models import POTDResponse, POTDCompleteResponse
from app.potd.service import get_potd_for_user, complete_potd

router = APIRouter(prefix="/potd", tags=["Problem of the Day"])


@router.get("/today", response_model=POTDResponse)
def get_today_potd(
    date: Optional[str] = Query(None, description="Optional target date in YYYY-MM-DD format"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Returns the deterministic Problem of the Day for today (or requested date),
    including user's solved status, current streak, and 7-day visual history.
    """
    user_id = current_user["id"] if current_user else None
    return get_potd_for_user(user_id=user_id, target_date=date)


@router.post("/today/complete", response_model=POTDCompleteResponse)
def mark_today_potd_complete(
    date: Optional[str] = Query(None, description="Optional target date in YYYY-MM-DD format"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Marks today's (or target date's) Problem of the Day as completed.
    Synchronizes with both POTD completions and user problem progress.
    """
    return complete_potd(user_id=current_user["id"], target_date=date)
