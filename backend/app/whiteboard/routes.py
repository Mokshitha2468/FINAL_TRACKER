from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from app.auth.dependencies import get_current_user
from app.whiteboard.models import (
    WhiteboardCreateRequest,
    WhiteboardUpdateRequest,
    WhiteboardSummaryResponse,
    WhiteboardDetailResponse,
)
from app.whiteboard.service import (
    list_whiteboards,
    create_whiteboard,
    get_whiteboard,
    update_whiteboard,
    delete_whiteboard,
)

router = APIRouter(prefix="/whiteboard", tags=["Infinite Whiteboard"])


@router.get("", response_model=List[WhiteboardSummaryResponse])
def get_user_whiteboards(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lists all whiteboards owned by the authenticated user."""
    return list_whiteboards(user_id=current_user["id"])


@router.post("", response_model=WhiteboardDetailResponse, status_code=status.HTTP_201_CREATED)
def create_new_whiteboard(
    req: WhiteboardCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Creates a new independent whiteboard."""
    return create_whiteboard(user_id=current_user["id"], req=req)


@router.get("/{board_id}", response_model=WhiteboardDetailResponse)
def get_single_whiteboard(
    board_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Gets complete canvas state and elements of a whiteboard."""
    return get_whiteboard(user_id=current_user["id"], board_id=board_id)


@router.put("/{board_id}", response_model=WhiteboardDetailResponse)
def save_whiteboard_state(
    board_id: str,
    req: WhiteboardUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Saves canvas elements, viewport, and title."""
    return update_whiteboard(user_id=current_user["id"], board_id=board_id, req=req)


@router.delete("/{board_id}")
def remove_whiteboard(
    board_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Deletes a whiteboard."""
    return delete_whiteboard(user_id=current_user["id"], board_id=board_id)
