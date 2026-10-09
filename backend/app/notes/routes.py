from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, status
from app.auth.dependencies import get_current_user
from app.notes.models import NoteCreateRequest, NoteUpdateRequest, NoteResponse
from app.notes.service import (
    create_note,
    get_notes,
    get_note_by_id,
    update_note,
    delete_note,
)

router = APIRouter(prefix="/notes", tags=["Permanent Notepad Engine"])


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def add_note(
    req: NoteCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Creates a new persistent note (DSA or AI category)."""
    return create_note(user_id=current_user["id"], req=req)


@router.get("", response_model=List[NoteResponse])
def list_notes(
    category: Optional[str] = Query(None, description="Filter by category: DSA or AI"),
    search: Optional[str] = Query(None, description="Search by title, content, or tag"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves all user notes, optionally filtered by category (DSA or AI)."""
    return get_notes(user_id=current_user["id"], category=category, search=search)


@router.get("/{note_id}", response_model=NoteResponse)
def fetch_note(
    note_id: str = Path(..., description="Note ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves a specific note."""
    return get_note_by_id(user_id=current_user["id"], note_id=note_id)


@router.put("/{note_id}", response_model=NoteResponse)
def modify_note(
    req: NoteUpdateRequest,
    note_id: str = Path(..., description="Note ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Updates an existing note."""
    return update_note(user_id=current_user["id"], note_id=note_id, req=req)


@router.delete("/{note_id}")
def remove_note(
    note_id: str = Path(..., description="Note ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Deletes a note."""
    return delete_note(user_id=current_user["id"], note_id=note_id)
