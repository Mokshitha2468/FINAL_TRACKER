from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.todos.models import TodoCreateRequest, TodoUpdateRequest


def serialize_todo(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts MongoDB todo document into safe API response."""
    return {
        "id": str(doc["_id"]),
        "user_id": doc["user_id"],
        "title": doc["title"],
        "description": doc.get("description", ""),
        "due_date": doc.get("due_date"),
        "priority": doc.get("priority", "medium"),
        "completed": doc.get("completed", False),
        "completed_at": doc.get("completed_at"),
        "created_at": doc.get("created_at", datetime.now(timezone.utc)),
    }


def create_todo(user_id: str, req: TodoCreateRequest) -> Dict[str, Any]:
    """Creates a new user-private TODO task."""
    db = get_database()
    col = db["todos"]

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "title": req.title.strip(),
        "description": req.description.strip() if req.description else "",
        "due_date": req.due_date.strip() if req.due_date else None,
        "priority": req.priority.lower() if req.priority else "medium",
        "completed": False,
        "completed_at": None,
        "created_at": now,
        "updated_at": now,
    }

    result = col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_todo(doc)


def get_todos(
    user_id: str,
    completed: Optional[bool] = None,
    priority: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieves all tasks for the authenticated user with optional status and priority filters."""
    db = get_database()
    col = db["todos"]

    query: Dict[str, Any] = {"user_id": user_id}
    if completed is not None:
        query["completed"] = completed
    if priority:
        query["priority"] = priority.lower()

    # Sort: pending first, then by due_date ASC, created_at DESC
    cursor = col.find(query).sort([
        ("completed", 1),
        ("due_date", 1),
        ("created_at", -1)
    ])

    return [serialize_todo(d) for d in cursor]


def update_todo(user_id: str, todo_id: str, req: TodoUpdateRequest) -> Dict[str, Any]:
    """Updates an existing user-private task."""
    db = get_database()
    col = db["todos"]

    try:
        obj_id = ObjectId(todo_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TODO ID.")

    todo = col.find_one({"_id": obj_id, "user_id": user_id})
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}

    if req.title is not None:
        update_fields["title"] = req.title.strip()
    if req.description is not None:
        update_fields["description"] = req.description.strip()
    if req.due_date is not None:
        update_fields["due_date"] = req.due_date.strip() if req.due_date else None
    if req.priority is not None:
        update_fields["priority"] = req.priority.lower()

    if req.completed is not None:
        update_fields["completed"] = req.completed
        update_fields["completed_at"] = datetime.now(timezone.utc) if req.completed else None

    col.update_one({"_id": obj_id}, {"$set": update_fields})
    updated_doc = col.find_one({"_id": obj_id})
    return serialize_todo(updated_doc)


def delete_todo(user_id: str, todo_id: str) -> Dict[str, Any]:
    """Deletes an existing task for the authenticated user."""
    db = get_database()
    col = db["todos"]

    try:
        obj_id = ObjectId(todo_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid TODO ID.")

    result = col.delete_one({"_id": obj_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    return {"message": "Task successfully deleted.", "id": todo_id}
