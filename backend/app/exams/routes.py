from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Path, status
from app.auth.dependencies import get_current_user
from app.exams.models import (
    ExamCreateRequest,
    ExamSubmitRequest,
    ExamSessionResponse,
    ExamHistoryItem,
)
from app.exams.service import (
    create_exam_session,
    get_active_exam,
    submit_exam_session,
    get_exam_history,
)

router = APIRouter(prefix="/exams", tags=["Mock Exams"])


@router.post("", response_model=ExamSessionResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    req: ExamCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Generates a new timed mock assessment session."""
    return create_exam_session(user_id=current_user["id"], req=req)


@router.get("/active", response_model=Optional[ExamSessionResponse])
def get_current_active_exam(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves the user's ongoing mock exam session if one exists."""
    return get_active_exam(user_id=current_user["id"])


@router.post("/{exam_id}/submit", response_model=ExamSessionResponse)
def submit_exam(
    req: ExamSubmitRequest,
    exam_id: str = Path(..., description="Exam session ObjectId string"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Finalizes and scores the mock assessment, synchronizing solved problems."""
    return submit_exam_session(user_id=current_user["id"], exam_id=exam_id, req=req)


@router.get("/history", response_model=List[ExamHistoryItem])
def list_exam_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves past completed mock assessments for the user."""
    return get_exam_history(user_id=current_user["id"])
