from datetime import datetime, timedelta, timezone, date
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import UpdateOne
from app.database.mongodb import get_database
from app.revisions.models import ProblemLogRequest

# Spaced Repetition interval definitions: (revision_number, days_to_add)
REVISION_INTERVALS = [
    (1, 1),    # +1 day
    (2, 3),    # +3 days
    (3, 7),    # +7 days
    (4, 21),   # +21 days
]


def schedule_spaced_repetition(
    user_id: str,
    problem_info: Dict[str, Any],
    completion_date: Optional[date] = None,
) -> int:
    """
    Schedules 4 spaced repetition events (+1, +3, +7, +21 days) in revision_events.
    Idempotent: will not duplicate revision numbers for the same problem and user.
    """
    db = get_database()
    revisions_col = db["revision_events"]

    base_date = completion_date or datetime.now(timezone.utc).date()
    track = problem_info.get("track", "DSA")
    position = problem_info.get("position")
    problem_id = problem_info.get("_id") or problem_info.get("problem_id")
    title = problem_info.get("title") or problem_info.get("problem_title", "Unknown Problem")
    topic = problem_info.get("topic", "General")
    difficulty = problem_info.get("difficulty", "Medium")
    url = problem_info.get("url")

    operations = []
    now = datetime.now(timezone.utc)

    for rev_num, days in REVISION_INTERVALS:
        rev_date = base_date + timedelta(days=days)
        filter_criteria = {
            "user_id": user_id,
            "track": track,
            "revision_number": rev_num,
        }
        if position is not None:
            filter_criteria["position"] = position
        else:
            filter_criteria["problem_title"] = title

        doc = {
            "user_id": user_id,
            "problem_id": problem_id,
            "track": track,
            "position": position,
            "problem_title": title,
            "topic": topic,
            "difficulty": difficulty,
            "url": url,
            "revision_number": rev_num,
            "scheduled_date": rev_date.isoformat(),
            "is_completed": False,
            "completed_at": None,
            "created_at": now,
        }

        operations.append(
            UpdateOne(
                filter_criteria,
                {"$setOnInsert": doc},
                upsert=True
            )
        )

    if operations:
        result = revisions_col.bulk_write(operations, ordered=False)
        return len(result.upserted_ids)
    return 0


def log_problem(user_id: str, req: ProblemLogRequest) -> Dict[str, Any]:
    """
    Logs a problem manually:
    1. Checks if problem matches a canonical A2Z problem (by URL or title).
    2. Links to canonical problem if match exists (no duplicate records).
    3. Saves structured notes to user_problem_progress.
    4. Automatically creates +1, +3, +7, +21 revision schedule if status is 'solved'.
    """
    db = get_database()
    problems_col = db["a2z_problems"]
    progress_col = db["user_problem_progress"]

    # 1. Check for canonical match in a2z_problems
    canonical = None
    clean_url = (req.url or "").strip().rstrip("/")
    if clean_url:
        # Match URL directly or with trailing slash
        canonical = problems_col.find_one({
            "url": {"$regex": f"^{clean_url}/?$", "$options": "i"}
        })

    if not canonical:
        # Match by exact title
        clean_title = req.title.strip()
        canonical = problems_col.find_one({
            "title": {"$regex": f"^{clean_title}$", "$options": "i"}
        })

    now = datetime.now(timezone.utc)
    notes_dict = req.notes.model_dump() if req.notes else {}

    # Parse completion date
    comp_date = None
    if req.date:
        try:
            comp_date = datetime.strptime(req.date, "%Y-%m-%d").date()
        except ValueError:
            comp_date = now.date()
    else:
        comp_date = now.date()

    if canonical:
        # Link directly to canonical A2Z problem
        position = canonical["position"]
        topic = canonical["topic"]
        difficulty = canonical["difficulty"]
        problem_id = canonical["_id"]
        title = canonical["title"]
        url = canonical.get("url") or req.url
        is_canonical = True
    else:
        # Non-canonical / custom problem
        position = None
        topic = req.topic or "Custom"
        difficulty = req.difficulty or "Medium"
        problem_id = None
        title = req.title.strip()
        url = req.url
        is_canonical = False

    is_solved = (req.status.lower() == "solved")

    # Update or insert user progress
    filter_criteria = {"user_id": user_id, "track": "DSA"}
    if position is not None:
        filter_criteria["position"] = position
    else:
        filter_criteria["custom_title"] = title

    progress_doc = {
        "user_id": user_id,
        "track": "DSA",
        "position": position,
        "custom_title": title if position is None else None,
        "problem_id": problem_id,
        "topic": topic,
        "difficulty": difficulty,
        "status": "solved" if is_solved else "attempted",
        "completed_at": now if is_solved else None,
        "source": "manual",
        "notes": notes_dict,
        "updated_at": now,
    }

    progress_col.update_one(
        filter_criteria,
        {"$set": progress_doc, "$setOnInsert": {"created_at": now}},
        upsert=True
    )

    # 4. Schedule spaced repetition if solved
    revisions_scheduled = 0
    if is_solved:
        problem_info = {
            "track": "DSA",
            "position": position,
            "problem_id": problem_id,
            "title": title,
            "topic": topic,
            "difficulty": difficulty,
            "url": url,
        }
        revisions_scheduled = schedule_spaced_repetition(user_id, problem_info, comp_date)

    return {
        "message": f"Successfully logged problem: '{title}'",
        "title": title,
        "topic": topic,
        "difficulty": difficulty,
        "position": position,
        "is_canonical": is_canonical,
        "status": "solved" if is_solved else "attempted",
        "revisions_scheduled": revisions_scheduled,
        "notes": notes_dict,
    }


def get_user_revisions(
    user_id: str,
    filter_type: Optional[str] = None,  # "due_today", "upcoming", "completed"
) -> Dict[str, Any]:
    """
    Returns user revisions sorted by scheduled_date ASC and revision_number ASC.
    """
    db = get_database()
    revisions_col = db["revision_events"]

    today_str = datetime.now(timezone.utc).date().isoformat()

    query: Dict[str, Any] = {"user_id": user_id, "track": "DSA"}

    if filter_type == "due_today":
        query["scheduled_date"] = {"$lte": today_str}
        query["is_completed"] = False
    elif filter_type == "upcoming":
        query["scheduled_date"] = {"$gt": today_str}
        query["is_completed"] = False
    elif filter_type == "completed":
        query["is_completed"] = True

    events = list(
        revisions_col.find(query).sort([("scheduled_date", 1), ("revision_number", 1)])
    )

    # Compute overall stats for badge counters
    total = revisions_col.count_documents({"user_id": user_id, "track": "DSA"})
    due_today = revisions_col.count_documents({
        "user_id": user_id,
        "track": "DSA",
        "scheduled_date": {"$lte": today_str},
        "is_completed": False
    })
    upcoming = revisions_col.count_documents({
        "user_id": user_id,
        "track": "DSA",
        "scheduled_date": {"$gt": today_str},
        "is_completed": False
    })
    completed = revisions_col.count_documents({
        "user_id": user_id,
        "track": "DSA",
        "is_completed": True
    })

    serialized = []
    for ev in events:
        is_due = (ev["scheduled_date"] <= today_str) and not ev["is_completed"]
        serialized.append({
            "id": str(ev["_id"]),
            "user_id": ev["user_id"],
            "track": ev.get("track", "DSA"),
            "position": ev.get("position"),
            "problem_title": ev.get("problem_title", "Unknown"),
            "topic": ev.get("topic", "General"),
            "difficulty": ev.get("difficulty", "Medium"),
            "url": ev.get("url"),
            "revision_number": ev.get("revision_number", 1),
            "scheduled_date": ev.get("scheduled_date"),
            "is_completed": ev.get("is_completed", False),
            "completed_at": ev.get("completed_at"),
            "is_due": is_due,
        })

    return {
        "stats": {
            "due_today": due_today,
            "upcoming": upcoming,
            "completed": completed,
            "total": total,
        },
        "revisions": serialized,
    }


def complete_revision(user_id: str, revision_id: str) -> Dict[str, Any]:
    """Marks a revision completed for the authenticated user."""
    db = get_database()
    revisions_col = db["revision_events"]

    try:
        obj_id = ObjectId(revision_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid revision ID.")

    rev = revisions_col.find_one({"_id": obj_id, "user_id": user_id})
    if not rev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Revision record not found.")

    now = datetime.now(timezone.utc)
    revisions_col.update_one(
        {"_id": obj_id},
        {"$set": {"is_completed": True, "completed_at": now}}
    )

    return {
        "id": revision_id,
        "is_completed": True,
        "completed_at": now,
        "message": f"Revision #{rev.get('revision_number')} marked as completed!"
    }
