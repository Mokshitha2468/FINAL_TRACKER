from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from app.auth.dependencies import get_current_user
from app.todos.models import TodoCreateRequest, TodoUpdateRequest, TodoItemResponse
from app.todos.service import create_todo, get_todos, update_todo, delete_todo

router = APIRouter(prefix="/todos", tags=["TODO System"])


@router.post("", response_model=TodoItemResponse, status_code=status.HTTP_201_CREATED)
def add_todo(
    req: TodoCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Creates a new user-private TODO task."""
    return create_todo(user_id=current_user["id"], req=req)


@router.get("", response_model=List[TodoItemResponse])
def list_todos(
    completed: Optional[bool] = Query(None, description="Filter by completed status"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves all tasks for the authenticated user."""
    return get_todos(user_id=current_user["id"], completed=completed, priority=priority)


@router.put("/{todo_id}", response_model=TodoItemResponse)
def modify_todo(
    req: TodoUpdateRequest,
    todo_id: str = Path(..., description="TODO ObjectId string"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Updates task details or toggles completion status."""
    return update_todo(user_id=current_user["id"], todo_id=todo_id, req=req)


@router.delete("/{todo_id}")
def remove_todo(
    todo_id: str = Path(..., description="TODO ObjectId string"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Deletes a task for the authenticated user."""
    return delete_todo(user_id=current_user["id"], todo_id=todo_id)
