import hashlib
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from app.database.mongodb import get_database


def get_daily_position(date_str: str, total_problems: int = 474) -> int:
    """
    Deterministically computes a 1-indexed problem position (1..474)
    for any given date string (YYYY-MM-DD) via MD5 hashing.
    """
    h = hashlib.md5(date_str.encode("utf-8")).hexdigest()
    return (int(h, 16) % total_problems) + 1


def calculate_user_streak(user_id: str, today_str: str, db) -> int:
    """
    Calculates consecutive days streak for a user.
    Counts backwards from today (if solved) or yesterday (if today not solved yet).
    """
    if not user_id:
        return 0

    today_dt = datetime.strptime(today_str, "%Y-%m-%d").date()
    today_completed = bool(
        db["potd_completions"].find_one({"user_id": user_id, "date": today_str})
    )

    streak = 0
    start_dt = today_dt if today_completed else (today_dt - timedelta(days=1))

    # Check backwards up to 365 days
    current_dt = start_dt
    while True:
        d_str = current_dt.isoformat()
        found = db["potd_completions"].find_one({"user_id": user_id, "date": d_str})
        if found:
            streak += 1
            current_dt -= timedelta(days=1)
        else:
            break

    return streak


def get_recent_history(user_id: Optional[str], today_str: str, db, days: int = 7) -> List[Dict[str, Any]]:
    """
    Returns the past `days` status strip up to and including today.
    """
    today_dt = datetime.strptime(today_str, "%Y-%m-%d").date()
    history = []

    for i in range(days - 1, -1, -1):
        d = today_dt - timedelta(days=i)
        d_str = d.isoformat()
        is_solved = False
        if user_id:
            is_solved = bool(
                db["potd_completions"].find_one({"user_id": user_id, "date": d_str})
            )
        history.append({
            "date": d_str,
            "day_name": d.strftime("%a"),
            "is_solved": is_solved,
        })

    return history


def get_potd_for_user(user_id: Optional[str] = None, target_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves the deterministic Problem of the Day for target_date (defaults to today).
    Includes the problem info, user's solve status, streak, and recent history.
    """
    db = get_database()
    today_str = target_date or date.today().isoformat()

    position = get_daily_position(today_str)

    problem_doc = db["a2z_problems"].find_one(
        {"track": "DSA", "position": position},
        {"_id": 0}
    )

    if not problem_doc:
        # Fallback to position 1 if problem document not found
        problem_doc = db["a2z_problems"].find_one({"track": "DSA", "position": 1}, {"_id": 0})
        if not problem_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No problems found in curriculum."
            )

    is_solved = False
    solved_at = None

    if user_id:
        potd_entry = db["potd_completions"].find_one({"user_id": user_id, "date": today_str})
        if potd_entry:
            is_solved = True
            solved_at = potd_entry.get("completed_at", "").isoformat() if isinstance(potd_entry.get("completed_at"), datetime) else None
        else:
            # Also check if already solved via problem tracker
            prog = db["user_problem_progress"].find_one(
                {"user_id": user_id, "track": "DSA", "position": position, "status": "solved"}
            )
            if prog:
                is_solved = True
                solved_at = prog.get("completed_at", "").isoformat() if isinstance(prog.get("completed_at"), datetime) else None

    streak = calculate_user_streak(user_id, today_str, db) if user_id else 0
    history = get_recent_history(user_id, today_str, db, days=7)

    return {
        "date": today_str,
        "problem": {
            "position": problem_doc.get("position"),
            "title": problem_doc.get("title"),
            "topic": problem_doc.get("topic"),
            "difficulty": problem_doc.get("difficulty"),
            "subtopic": problem_doc.get("subtopic"),
            "url": problem_doc.get("url"),
        },
        "is_solved": is_solved,
        "solved_at": solved_at,
        "streak": streak,
        "history": history,
    }


def complete_potd(user_id: str, target_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Marks the POTD for target_date as completed.
    Synchronizes both `potd_completions` and `user_problem_progress`.
    """
    db = get_database()
    today_str = target_date or date.today().isoformat()
    position = get_daily_position(today_str)
    now = datetime.now()

    # 1. Upsert potd_completions
    db["potd_completions"].update_one(
        {"user_id": user_id, "date": today_str},
        {"$set": {"completed_at": now, "position": position}},
        upsert=True,
    )

    # 2. Sync to user_problem_progress
    db["user_problem_progress"].update_one(
        {"user_id": user_id, "track": "DSA", "position": position},
        {"$set": {"status": "solved", "completed_at": now}},
        upsert=True,
    )

    streak = calculate_user_streak(user_id, today_str, db)

    return {
        "message": "Problem of the Day completed successfully!",
        "date": today_str,
        "is_solved": True,
        "streak": streak,
        "position": position,
    }
