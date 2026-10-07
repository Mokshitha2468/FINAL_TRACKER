from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from app.auth.dependencies import get_current_user
from app.sync.models import (
    SaveUsernameRequest,
    LeetCodeSyncRequest,
    LeetCodeSyncResponse,
    LeetCodeProfileResponse,
    LeetCodeProblemListResponse,
    UpdateProblemNoteRequest,
)
from app.sync.service import (
    save_leetcode_username,
    get_leetcode_profile,
    sync_user_with_leetcode,
    get_synced_leetcode_problems,
    update_leetcode_problem_note,
)

router = APIRouter(prefix="/sync/leetcode", tags=["LeetCode Vault & Sync"])


@router.get("/profile", response_model=LeetCodeProfileResponse)
def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves the user's saved LeetCode profile and sync metrics."""
    return get_leetcode_profile(user_id=current_user["id"])


@router.post("/username")
def save_username(
    req: SaveUsernameRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Saves the user's LeetCode username once on their account."""
    return save_leetcode_username(user_id=current_user["id"], username=req.username)


@router.post("/sync", response_model=LeetCodeSyncResponse)
def run_sync(
    req: LeetCodeSyncRequest = LeetCodeSyncRequest(),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Triggers LeetCode sync, calculates attempt errors,
    auto-flags problems taking >4 attempts for revision, and syncs progress.
    Defaults to syncing problems solved today.
    """
    return sync_user_with_leetcode(
        user_id=current_user["id"],
        username=req.username,
        session_cookie=req.session_cookie,
        today_only=req.today_only,
    )


@router.get("/problems", response_model=LeetCodeProblemListResponse)
def list_problems(
    needs_revision: Optional[bool] = Query(None, description="Filter problems needing revision"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty: Easy, Medium, Hard"),
    search: Optional[str] = Query(None, description="Search by problem title"),
    today_only: Optional[bool] = Query(None, description="Filter problems solved today"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lists all synced LeetCode problems with attempt metrics and revision flags."""
    return get_synced_leetcode_problems(
        user_id=current_user["id"],
        needs_revision=needs_revision,
        difficulty=difficulty,
        search=search,
        today_only=today_only,
    )



@router.put("/problems/{title_slug}")
def update_problem(
    req: UpdateProblemNoteRequest,
    title_slug: str = Path(..., description="Problem title slug"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Updates personal notes and/or toggles revision status for a problem."""
    return update_leetcode_problem_note(
        user_id=current_user["id"],
        title_slug=title_slug,
        notes=req.notes,
        needs_revision=req.needs_revision,
    )
