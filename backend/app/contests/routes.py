from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Path
from app.auth.dependencies import get_current_user, get_optional_current_user
from app.contests.models import ContestItem, ContestBookmarkToggleResponse
from app.contests.service import get_contests_for_user, toggle_contest_bookmark

router = APIRouter(prefix="/contests", tags=["Contests"])


@router.get("", response_model=List[ContestItem])
def list_contests(
    platform: Optional[str] = Query(None, description="Filter by platform: LeetCode, Codeforces, CodeChef, AtCoder"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Returns upcoming contests across major competitive programming platforms.
    """
    user_id = current_user["id"] if current_user else None
    return get_contests_for_user(user_id=user_id, platform=platform)


@router.post("/{contest_id}/bookmark", response_model=ContestBookmarkToggleResponse)
def bookmark_contest(
    contest_id: str = Path(..., description="Contest identifier"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Toggles a bookmark reminder on an upcoming contest for the authenticated user.
    """
    return toggle_contest_bookmark(user_id=current_user["id"], contest_id=contest_id)
