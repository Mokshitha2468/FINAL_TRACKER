from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from bson import ObjectId
from fastapi import HTTPException, status
from app.database.mongodb import get_database


def get_topic_summaries(user_id: Optional[str] = None, track: str = "DSA") -> Dict[str, Any]:
    """
    Computes overall and per-topic progress summaries.
    1. Reads canonical problems grouped by topic and difficulty.
    2. Reads authenticated user's solved positions from user_problem_progress.
    3. Merges total counts with user solved counts.
    """
    db = get_database()
    problems_col = db["a2z_problems"]
    progress_col = db["user_problem_progress"]

    # 1. Fetch user solved positions if user is authenticated
    solved_positions: Set[int] = set()
    if user_id:
        cursor = progress_col.find(
            {"user_id": user_id, "track": track, "status": "solved"},
            {"position": 1, "_id": 0}
        )
        for doc in cursor:
            solved_positions.add(doc["position"])

    # 2. Fetch all problems in track sorted by position
    problems = list(problems_col.find({"track": track}, {"_id": 0}).sort([("position", 1)]))
    total_problems = len(problems)

    # 3. Aggregate totals and solved per topic and difficulty
    topics_order: List[str] = []
    topics_data: Dict[str, Dict[str, Any]] = {}

    for p in problems:
        t = p["topic"]
        d = p["difficulty"]
        pos = p["position"]
        step = p.get("step_num")

        if t not in topics_data:
            topics_order.append(t)
            topics_data[t] = {
                "topic": t,
                "step_num": step,
                "total": 0,
                "solved": 0,
                "difficulties": {
                    "Easy": {"total": 0, "solved": 0},
                    "Medium": {"total": 0, "solved": 0},
                    "Hard": {"total": 0, "solved": 0},
                },
            }

        topics_data[t]["total"] += 1
        if d in topics_data[t]["difficulties"]:
            topics_data[t]["difficulties"][d]["total"] += 1

        if pos in solved_positions:
            topics_data[t]["solved"] += 1
            if d in topics_data[t]["difficulties"]:
                topics_data[t]["difficulties"][d]["solved"] += 1

    summary_topics = [topics_data[t] for t in topics_order]

    return {
        "track": track,
        "total_problems": total_problems,
        "total_solved": len(solved_positions),
        "topics": summary_topics,
    }


def get_problems(
    track: str = "DSA",
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    subtopic: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetches problems based on Topic -> Difficulty -> Problems hierarchy with optional filtering.
    Always orders results strictly by position ASC (1 -> 474).
    """
    db = get_database()
    problems_col = db["a2z_problems"]
    progress_col = db["user_problem_progress"]

    query: Dict[str, Any] = {"track": track}

    if topic:
        query["topic"] = topic
    if difficulty:
        query["difficulty"] = difficulty
    if subtopic:
        query["subtopic"] = subtopic
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"subtopic": {"$regex": search, "$options": "i"}},
        ]

    # Query canonical problems sorted strictly by position ASC
    canonical_problems = list(problems_col.find(query).sort([("position", 1)]))

    # Fetch progress for these positions if user is logged in
    user_progress: Dict[int, Dict[str, Any]] = {}
    if user_id and canonical_problems:
        positions = [p["position"] for p in canonical_problems]
        cursor = progress_col.find({
            "user_id": user_id,
            "track": track,
            "position": {"$in": positions}
        })
        for prog in cursor:
            user_progress[prog["position"]] = prog

    results: List[Dict[str, Any]] = []
    for p in canonical_problems:
        pos = p["position"]
        prog = user_progress.get(pos)
        is_solved = bool(prog and prog.get("status") == "solved")
        completed_at = prog.get("completed_at") if prog else None

        # Filter by status if requested
        if status_filter == "solved" and not is_solved:
            continue
        if status_filter == "unsolved" and is_solved:
            continue

        results.append({
            "id": str(p["_id"]),
            "track": p.get("track", "DSA"),
            "position": p["position"],
            "step_num": p.get("step_num"),
            "topic": p["topic"],
            "subtopic": p.get("subtopic", ""),
            "title": p["title"],
            "difficulty": p["difficulty"],
            "url": p.get("url"),
            "platform": p.get("platform"),
            "article_url": p.get("article_url"),
            "video_url": p.get("video_url"),
            "companies_count": p.get("companies_count"),
            "is_solved": is_solved,
            "completed_at": completed_at,
        })

    return results


def toggle_problem_progress(
    user_id: str,
    position: int,
    track: str = "DSA",
) -> Dict[str, Any]:
    """
    Toggles solved / unsolved status for the authenticated user.
    Never modifies the global a2z_problems document.
    """
    db = get_database()
    problems_col = db["a2z_problems"]
    progress_col = db["user_problem_progress"]

    # Verify problem exists
    problem = problems_col.find_one({"track": track, "position": position})
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem with position {position} in track '{track}' not found."
        )

    # Check current progress
    current = progress_col.find_one({
        "user_id": user_id,
        "track": track,
        "position": position,
    })

    now = datetime.now(timezone.utc)
    if current and current.get("status") == "solved":
        # Toggle to unsolved
        progress_col.update_one(
            {"_id": current["_id"]},
            {"$set": {"status": "unsolved", "completed_at": None, "updated_at": now}}
        )
        return {
            "track": track,
            "position": position,
            "is_solved": False,
            "completed_at": None,
            "message": f"Problem #{position} marked as unsolved."
        }
    else:
        # Toggle to solved
        progress_col.update_one(
            {"user_id": user_id, "track": track, "position": position},
            {
                "$set": {
                    "problem_id": problem["_id"],
                    "status": "solved",
                    "completed_at": now,
                    "source": "manual",
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                }
            },
            upsert=True
        )

        # Trigger automatic +1, +3, +7, +21 spaced repetition revisions
        try:
            from app.revisions.service import schedule_spaced_repetition
            schedule_spaced_repetition(
                user_id=user_id,
                problem_info={
                    "track": track,
                    "position": position,
                    "problem_id": problem["_id"],
                    "title": problem["title"],
                    "topic": problem["topic"],
                    "difficulty": problem["difficulty"],
                    "url": problem.get("url"),
                },
                completion_date=now.date(),
            )
        except Exception:
            pass  # Do not block solve if revision event scheduling encounters an issue

        return {
            "track": track,
            "position": position,
            "is_solved": True,
            "completed_at": now,
            "message": f"Problem #{position} marked as solved."
        }
