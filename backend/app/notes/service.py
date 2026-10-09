from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.notes.models import NoteCreateRequest, NoteUpdateRequest


def create_note(user_id: str, req: NoteCreateRequest) -> Dict[str, Any]:
    """Creates a persistent note under AI or DSA workspace."""
    db = get_database()
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_id,
        "category": req.category.strip().upper() if req.category else "DSA",
        "title": req.title.strip() or "Untitled Note",
        "content": req.content,
        "tags": req.tags or [],
        "urls": req.urls or [],
        "images": req.images or [],
        "is_pinned": req.is_pinned or False,
        "created_at": now,
        "updated_at": now,
    }

    result = db["user_notes"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


def get_notes(user_id: str, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all notes for the authenticated user, optionally filtered by category (AI / DSA)."""
    db = get_database()
    query: Dict[str, Any] = {"user_id": user_id}

    if category and category.strip():
        query["category"] = category.strip().upper()

    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"title": {"$regex": term, "$options": "i"}},
            {"content": {"$regex": term, "$options": "i"}},
            {"tags": {"$in": [term]}},
        ]

    # Pinned first, then newest updated
    cursor = db["user_notes"].find(query).sort([("is_pinned", -1), ("updated_at", -1)])
    notes = []
    for doc in cursor:
        notes.append({
            "id": str(doc["_id"]),
            "user_id": doc["user_id"],
            "category": doc.get("category", "DSA"),
            "title": doc.get("title", "Untitled Note"),
            "content": doc.get("content", ""),
            "tags": doc.get("tags", []),
            "urls": doc.get("urls", []),
            "images": doc.get("images", []),
            "is_pinned": doc.get("is_pinned", False),
            "created_at": doc.get("created_at", datetime.now(timezone.utc)),
            "updated_at": doc.get("updated_at", datetime.now(timezone.utc)),
        })
    return notes


def get_note_by_id(user_id: str, note_id: str) -> Dict[str, Any]:
    """Retrieves a single note by ID with user isolation."""
    db = get_database()
    try:
        doc = db["user_notes"].find_one({"_id": ObjectId(note_id), "user_id": user_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid note ID format.")

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    return {
        "id": str(doc["_id"]),
        "user_id": doc["user_id"],
        "category": doc.get("category", "DSA"),
        "title": doc.get("title", "Untitled Note"),
        "content": doc.get("content", ""),
        "tags": doc.get("tags", []),
        "urls": doc.get("urls", []),
        "images": doc.get("images", []),
        "is_pinned": doc.get("is_pinned", False),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def update_note(user_id: str, note_id: str, req: NoteUpdateRequest) -> Dict[str, Any]:
    """Updates an existing note."""
    db = get_database()
    now = datetime.now(timezone.utc)
    update_fields: Dict[str, Any] = {"updated_at": now}

    if req.category is not None:
        update_fields["category"] = req.category.strip().upper()
    if req.title is not None:
        update_fields["title"] = req.title.strip() or "Untitled Note"
    if req.content is not None:
        update_fields["content"] = req.content
    if req.tags is not None:
        update_fields["tags"] = req.tags
    if req.urls is not None:
        update_fields["urls"] = req.urls
    if req.images is not None:
        update_fields["images"] = req.images
    if req.is_pinned is not None:
        update_fields["is_pinned"] = req.is_pinned

    try:
        res = db["user_notes"].update_one(
            {"_id": ObjectId(note_id), "user_id": user_id},
            {"$set": update_fields}
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid note ID format.")

    if res.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    return get_note_by_id(user_id, note_id)


def delete_note(user_id: str, note_id: str) -> Dict[str, Any]:
    """Deletes a note."""
    db = get_database()
    try:
        res = db["user_notes"].delete_one({"_id": ObjectId(note_id), "user_id": user_id})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid note ID format.")

    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    return {"message": "Note deleted successfully", "id": note_id}
