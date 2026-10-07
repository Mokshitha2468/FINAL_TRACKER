from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.whiteboard.models import (
    WhiteboardCreateRequest,
    WhiteboardUpdateRequest,
    WhiteboardSummaryResponse,
    WhiteboardDetailResponse,
)


def list_whiteboards(user_id: str) -> List[WhiteboardSummaryResponse]:
    """
    Returns list of whiteboards belonging to authenticated user.
    If user has 0 whiteboards, automatically provisions a default board.
    """
    db = get_database()
    col = db["whiteboards"]
    boards = list(col.find({"user_id": user_id}).sort("updated_at", -1))

    if not boards:
        # Create initial default board
        now = datetime.now(timezone.utc)
        default_doc = {
            "user_id": user_id,
            "title": "Weekly Study Notes",
            "elements": [],
            "viewport": {"panX": 0, "panY": 0, "zoom": 1.0},
            "thumbnail": None,
            "created_at": now,
            "updated_at": now,
        }
        res = col.insert_one(default_doc)
        default_doc["_id"] = res.inserted_id
        boards = [default_doc]

    return [
        WhiteboardSummaryResponse(
            id=str(b["_id"]),
            title=b.get("title", "Untitled Whiteboard"),
            element_count=len(b.get("elements", [])),
            created_at=b.get("created_at", datetime.now(timezone.utc)),
            updated_at=b.get("updated_at", datetime.now(timezone.utc)),
        )
        for b in boards
    ]


def create_whiteboard(user_id: str, req: WhiteboardCreateRequest) -> WhiteboardDetailResponse:
    """Creates a new independent whiteboard for the authenticated user."""
    db = get_database()
    col = db["whiteboards"]
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_id,
        "title": req.title.strip() or "Untitled Whiteboard",
        "elements": [],
        "viewport": {"panX": 0, "panY": 0, "zoom": 1.0},
        "thumbnail": None,
        "created_at": now,
        "updated_at": now,
    }

    result = col.insert_one(doc)
    doc["_id"] = result.inserted_id

    return WhiteboardDetailResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        elements=doc["elements"],
        viewport=doc["viewport"],
        thumbnail=doc.get("thumbnail"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def get_whiteboard(user_id: str, board_id: str) -> WhiteboardDetailResponse:
    """Retrieves full whiteboard state by ID with user isolation."""
    db = get_database()
    col = db["whiteboards"]

    try:
        oid = ObjectId(board_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid whiteboard ID format.")

    board = col.find_one({"_id": oid, "user_id": user_id})
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Whiteboard not found.")

    return WhiteboardDetailResponse(
        id=str(board["_id"]),
        title=board.get("title", "Untitled Whiteboard"),
        elements=board.get("elements", []),
        viewport=board.get("viewport", {"panX": 0, "panY": 0, "zoom": 1.0}),
        thumbnail=board.get("thumbnail"),
        created_at=board.get("created_at", datetime.now(timezone.utc)),
        updated_at=board.get("updated_at", datetime.now(timezone.utc)),
    )


def update_whiteboard(user_id: str, board_id: str, req: WhiteboardUpdateRequest) -> WhiteboardDetailResponse:
    """Saves canvas elements, viewport, or title for the whiteboard."""
    db = get_database()
    col = db["whiteboards"]

    try:
        oid = ObjectId(board_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid whiteboard ID format.")

    updates: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    if req.title is not None:
        updates["title"] = req.title.strip() or "Untitled Whiteboard"
    if req.elements is not None:
        updates["elements"] = req.elements
    if req.viewport is not None:
        updates["viewport"] = req.viewport
    if req.thumbnail is not None:
        updates["thumbnail"] = req.thumbnail

    board = col.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {"$set": updates},
        return_document=True,
    )

    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Whiteboard not found.")

    return WhiteboardDetailResponse(
        id=str(board["_id"]),
        title=board.get("title", "Untitled Whiteboard"),
        elements=board.get("elements", []),
        viewport=board.get("viewport", {"panX": 0, "panY": 0, "zoom": 1.0}),
        thumbnail=board.get("thumbnail"),
        created_at=board.get("created_at", datetime.now(timezone.utc)),
        updated_at=board.get("updated_at", datetime.now(timezone.utc)),
    )


def delete_whiteboard(user_id: str, board_id: str) -> Dict[str, Any]:
    """Deletes a whiteboard owned by the user."""
    db = get_database()
    col = db["whiteboards"]

    try:
        oid = ObjectId(board_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid whiteboard ID format.")

    res = col.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Whiteboard not found.")

    return {"message": "Whiteboard deleted successfully", "id": board_id}
