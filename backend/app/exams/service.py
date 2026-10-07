import random
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.exams.models import ExamCreateRequest, ExamSubmitRequest


def sample_problems_for_exam(user_id: str, preset: str, topic: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Selects curriculum problems matching the difficulty preset and optional topic.
    Prioritizes unsolved problems for the user.
    """
    db = get_database()

    # Determine difficulty quota
    if preset == "drill":
        quota = [("Medium", 2)]
    elif preset == "hardcore":
        quota = [("Medium", 2), ("Hard", 2)]
    elif preset == "easy_start":
        quota = [("Easy", 3), ("Medium", 1)]
    else:  # "standard"
        quota = [("Easy", 1), ("Medium", 2), ("Hard", 1)]

    # Fetch user's solved positions to prioritize unsolved
    solved_positions = set(
        db["user_problem_progress"].distinct(
            "position", {"user_id": user_id, "track": "DSA", "status": "solved"}
        )
    )

    selected_problems = []

    for diff, count in quota:
        query: Dict[str, Any] = {"track": "DSA", "difficulty": diff}
        if topic:
            query["topic"] = topic

        all_matching = list(db["a2z_problems"].find(query, {"_id": 0}))
        if not all_matching:
            # Fallback without topic constraint if topic had no matching problems
            all_matching = list(db["a2z_problems"].find({"track": "DSA", "difficulty": diff}, {"_id": 0}))

        # Separate unsolved vs solved
        unsolved = [p for p in all_matching if p["position"] not in solved_positions]
        candidates = unsolved if len(unsolved) >= count else all_matching

        sample_size = min(count, len(candidates))
        chosen = random.sample(candidates, sample_size) if sample_size > 0 else []
        for p in chosen:
            selected_problems.append({
                "position": p["position"],
                "title": p["title"],
                "topic": p["topic"],
                "difficulty": p["difficulty"],
                "url": p.get("url"),
                "is_solved": False,
            })

    # Sort problems by canonical position ASC
    selected_problems.sort(key=lambda x: x["position"])
    return selected_problems


def serialize_exam(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to convert MongoDB ObjectId and format fields."""
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", "Timed Mock Assessment"),
        "duration_minutes": doc.get("duration_minutes", 60),
        "started_at": doc.get("started_at").isoformat() if isinstance(doc.get("started_at"), datetime) else str(doc.get("started_at")),
        "expires_at": doc.get("expires_at").isoformat() if isinstance(doc.get("expires_at"), datetime) else str(doc.get("expires_at")),
        "status": doc.get("status", "in_progress"),
        "problems": doc.get("problems", []),
        "score": doc.get("score"),
        "total_problems": len(doc.get("problems", [])),
        "solved_count": doc.get("solved_count", 0),
        "time_spent_seconds": doc.get("time_spent_seconds"),
        "completed_at": doc.get("completed_at").isoformat() if isinstance(doc.get("completed_at"), datetime) else None,
    }


def create_exam_session(user_id: str, req: ExamCreateRequest) -> Dict[str, Any]:
    """
    Creates a new timed mock assessment.
    Marks any existing 'in_progress' exam as abandoned.
    """
    db = get_database()

    # Abandon any currently active exam
    db["mock_exams"].update_many(
        {"user_id": user_id, "status": "in_progress"},
        {"$set": {"status": "abandoned"}}
    )

    problems = sample_problems_for_exam(user_id, req.difficulty_preset, req.topic)
    if not problems:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to sample problems for this preset."
        )

    now = datetime.now()
    expires_at = now + timedelta(minutes=req.duration_minutes)

    exam_doc = {
        "user_id": user_id,
        "title": req.title or "Timed Mock Assessment",
        "duration_minutes": req.duration_minutes,
        "difficulty_preset": req.difficulty_preset,
        "topic": req.topic,
        "started_at": now,
        "expires_at": expires_at,
        "status": "in_progress",
        "problems": problems,
        "created_at": now,
    }

    result = db["mock_exams"].insert_one(exam_doc)
    exam_doc["_id"] = result.inserted_id
    return serialize_exam(exam_doc)


def get_active_exam(user_id: str) -> Optional[Dict[str, Any]]:
    """Returns the user's currently active exam if one exists."""
    db = get_database()
    doc = db["mock_exams"].find_one({"user_id": user_id, "status": "in_progress"})
    if not doc:
        return None
    return serialize_exam(doc)


def submit_exam_session(user_id: str, exam_id: str, req: ExamSubmitRequest) -> Dict[str, Any]:
    """
    Finalizes and scores the mock exam session.
    Synchronizes solved problems to the user's canonical curriculum progress.
    """
    db = get_database()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid exam ID.")

    exam = db["mock_exams"].find_one({"_id": oid, "user_id": user_id})
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found.")

    now = datetime.now()
    started_at = exam.get("started_at")
    if started_at:
        if getattr(started_at, "tzinfo", None) is not None:
            started_at = started_at.replace(tzinfo=None)
        if getattr(now, "tzinfo", None) is not None:
            now = now.replace(tzinfo=None)
        time_spent_seconds = max(0, int((now - started_at).total_seconds()))
    else:
        time_spent_seconds = 0

    problems = exam.get("problems", [])
    solved_set = set(req.solved_positions)

    # Update problems with solved state
    for p in problems:
        if p["position"] in solved_set:
            p["is_solved"] = True
            # Sync with user_problem_progress
            db["user_problem_progress"].update_one(
                {"user_id": user_id, "track": "DSA", "position": p["position"]},
                {"$set": {"status": "solved", "completed_at": now}},
                upsert=True,
            )

    solved_count = len(solved_set)
    total_count = len(problems)
    score_pct = round((solved_count / total_count) * 100, 1) if total_count > 0 else 0.0

    update_fields = {
        "status": "completed",
        "problems": problems,
        "solved_count": solved_count,
        "score": score_pct,
        "time_spent_seconds": time_spent_seconds,
        "completed_at": now,
        "notes": req.notes,
    }

    db["mock_exams"].update_one({"_id": oid}, {"$set": update_fields})
    exam.update(update_fields)
    return serialize_exam(exam)


def get_exam_history(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves past completed exams for the user."""
    db = get_database()
    cursor = db["mock_exams"].find(
        {"user_id": user_id, "status": "completed"}
    ).sort("completed_at", -1).limit(20)

    history = []
    for doc in cursor:
        history.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", "Mock Assessment"),
            "duration_minutes": doc.get("duration_minutes", 60),
            "started_at": doc.get("started_at").isoformat() if isinstance(doc.get("started_at"), datetime) else str(doc.get("started_at")),
            "completed_at": doc.get("completed_at").isoformat() if isinstance(doc.get("completed_at"), datetime) else None,
            "status": doc.get("status"),
            "total_problems": len(doc.get("problems", [])),
            "solved_count": doc.get("solved_count", 0),
            "score": doc.get("score", 0.0),
        })

    return history
