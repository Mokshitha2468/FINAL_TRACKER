from datetime import datetime, timedelta, timezone, date
from typing import Any, Dict, List, Optional, Set
from fastapi import HTTPException, status
from pymongo import UpdateOne
from app.database.mongodb import get_database
from app.planner.models import (
    WeeklyHours,
    DifficultyEstimates,
    PlannerSettingsRequest,
    DailyScheduleSlot,
    ScheduledProblem,
    PlannerScheduleResponse,
)

DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def get_or_create_settings(user_id: str, track: str = "DSA") -> Dict[str, Any]:
    """Retrieves existing planner settings or initializes defaults."""
    db = get_database()
    col = db["planner_settings"]

    settings = col.find_one({"user_id": user_id, "track": track}, {"_id": 0})
    if not settings:
        default_weekly = WeeklyHours().model_dump()
        default_estimates = DifficultyEstimates().model_dump()
        doc = {
            "user_id": user_id,
            "track": track,
            "weekly_hours": default_weekly,
            "difficulty_estimates": default_estimates,
            "updated_at": datetime.now(timezone.utc),
        }
        col.insert_one(doc.copy())
        return doc
    return settings


def update_settings(user_id: str, req: PlannerSettingsRequest, track: str = "DSA") -> Dict[str, Any]:
    """Updates user weekly availability and difficulty time estimates."""
    db = get_database()
    col = db["planner_settings"]

    update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    if req.weekly_hours:
        update_fields["weekly_hours"] = req.weekly_hours.model_dump()
    if req.difficulty_estimates:
        update_fields["difficulty_estimates"] = req.difficulty_estimates.model_dump()

    col.update_one(
        {"user_id": user_id, "track": track},
        {"$set": update_fields},
        upsert=True
    )
    return get_or_create_settings(user_id, track)


def generate_schedule(user_id: str, track: str = "DSA") -> Dict[str, Any]:
    """
    Core Planly Algorithm:
    1. Fetches current unsolved problems in canonical order (position ASC).
    2. Reads weekly availability profile (Monday -> Sunday).
    3. Packs problems sequentially into upcoming daily calendar slots until 100% complete.
    4. Persists the schedule to MongoDB and returns summary metrics.
    """
    db = get_database()
    problems_col = db["a2z_problems"]
    progress_col = db["user_problem_progress"]
    schedule_col = db["planner_schedule"]

    # 1. User settings
    settings = get_or_create_settings(user_id, track)
    weekly_hours: Dict[str, float] = settings.get("weekly_hours", WeeklyHours().model_dump())
    estimates: Dict[str, int] = settings.get("difficulty_estimates", DifficultyEstimates().model_dump())

    weekly_capacity_hours = sum(weekly_hours.values())
    if weekly_capacity_hours <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Weekly study hours must be greater than 0 to generate a schedule."
        )

    # 2. Solved problem positions
    solved_positions: Set[int] = set()
    cursor = progress_col.find(
        {"user_id": user_id, "track": track, "status": "solved"},
        {"position": 1, "_id": 0}
    )
    for doc in cursor:
        solved_positions.add(doc["position"])

    # 3. Unsolved problems sorted strictly by position ASC (skipping introductory 'Basics' syntax)
    unsolved_problems = list(
        problems_col.find(
            {"track": track, "position": {"$nin": list(solved_positions)}, "topic": {"$ne": "Basics"}},
            {"_id": 0, "position": 1, "title": 1, "difficulty": 1, "topic": 1, "url": 1}
        ).sort([("position", 1)])
    )

    total_unsolved = len(unsolved_problems)
    total_remaining_minutes = sum(estimates.get(p["difficulty"], 30) for p in unsolved_problems)
    total_remaining_hours = round(total_remaining_minutes / 60.0, 1)

    if total_unsolved == 0:
        # All problems solved!
        schedule_col.delete_many({"user_id": user_id, "track": track})
        return {
            "track": track,
            "total_remaining_problems": 0,
            "total_remaining_hours": 0.0,
            "weekly_available_hours": weekly_capacity_hours,
            "estimated_days_needed": 0,
            "target_completion_date": None,
            "schedule": [],
        }

    # 4. Schedule Packing Loop
    current_date = datetime.now(timezone.utc).date()
    prob_idx = 0
    generated_slots: List[Dict[str, Any]] = []

    # Limit search to at most 730 days (2 years)
    for day_offset in range(730):
        if prob_idx >= total_unsolved:
            break

        slot_date = current_date + timedelta(days=day_offset)
        day_name = slot_date.strftime("%A").lower()
        avail_hours = weekly_hours.get(day_name, 0.0)
        avail_mins = int(avail_hours * 60)

        if avail_mins <= 0:
            continue

        allocated_mins = 0
        slot_items: List[Dict[str, Any]] = []

        while prob_idx < total_unsolved:
            p = unsolved_problems[prob_idx]
            est = estimates.get(p["difficulty"], 30)

            # Check if this problem fits in today's slot
            # Allow at least 1 problem if day has time even if it slightly exceeds
            if (allocated_mins + est <= avail_mins) or (len(slot_items) == 0 and est <= avail_mins * 1.5):
                slot_items.append({
                    "position": p["position"],
                    "title": p["title"],
                    "difficulty": p["difficulty"],
                    "topic": p["topic"],
                    "estimated_minutes": est,
                    "is_completed": False,
                    "url": p.get("url"),
                })
                allocated_mins += est
                prob_idx += 1
            else:
                break

        if slot_items:
            slot_doc = {
                "user_id": user_id,
                "track": track,
                "date": slot_date.isoformat(),
                "day_of_week": slot_date.strftime("%A"),
                "available_minutes": avail_mins,
                "allocated_minutes": allocated_mins,
                "items": slot_items,
                "created_at": datetime.now(timezone.utc),
            }
            generated_slots.append(slot_doc)

    # 5. Overwrite user's future schedule in MongoDB
    schedule_col.delete_many({"user_id": user_id, "track": track})
    if generated_slots:
        # Insert copies so generated_slots does not have ObjectId attached to it
        schedule_col.insert_many([s.copy() for s in generated_slots])
        for s in generated_slots:
            s.pop("_id", None)

    target_date = generated_slots[-1]["date"] if generated_slots else None

    return {
        "track": track,
        "total_remaining_problems": total_unsolved,
        "total_remaining_hours": total_remaining_hours,
        "weekly_available_hours": weekly_capacity_hours,
        "estimated_days_needed": len(generated_slots),
        "target_completion_date": target_date,
        "schedule": generated_slots,
    }


def get_schedule(user_id: str, track: str = "DSA") -> Dict[str, Any]:
    """Retrieves the schedule, generating it if none currently exists."""
    db = get_database()
    schedule_col = db["planner_schedule"]

    slots = list(
        schedule_col.find({"user_id": user_id, "track": track}, {"_id": 0}).sort([("date", 1)])
    )

    if not slots:
        return generate_schedule(user_id, track)

    settings = get_or_create_settings(user_id, track)
    weekly_hours = settings.get("weekly_hours", WeeklyHours().model_dump())
    weekly_capacity = sum(weekly_hours.values())

    total_unsolved = sum(len(slot["items"]) for slot in slots)
    total_mins = sum(slot["allocated_minutes"] for slot in slots)
    total_hours = round(total_mins / 60.0, 1)
    target_date = slots[-1]["date"] if slots else None

    return {
        "track": track,
        "total_remaining_problems": total_unsolved,
        "total_remaining_hours": total_hours,
        "weekly_available_hours": weekly_capacity,
        "estimated_days_needed": len(slots),
        "target_completion_date": target_date,
        "schedule": slots,
    }


def get_today_schedule(user_id: str, track: str = "DSA") -> Optional[Dict[str, Any]]:
    """Returns today's specific study slot."""
    db = get_database()
    today_str = datetime.now(timezone.utc).date().isoformat()
    slot = db["planner_schedule"].find_one(
        {"user_id": user_id, "track": track, "date": today_str},
        {"_id": 0}
    )
    return slot


def get_next_unsolved(
    user_id: str,
    limit: int = 10,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    track: str = "DSA",
) -> List[Dict[str, Any]]:
    """
    Returns the next N unsolved problems following canonical position ASC order.
    Supports filtering by Topic and Difficulty.
    """
    db = get_database()
    problems_col = db["a2z_problems"]
    progress_col = db["user_problem_progress"]

    # Solved problem positions
    cursor = progress_col.find(
        {"user_id": user_id, "track": track, "status": "solved"},
        {"position": 1, "_id": 0}
    )
    solved = {doc["position"] for doc in cursor}

    query: Dict[str, Any] = {
        "track": track,
        "position": {"$nin": list(solved)},
    }
    if topic:
        query["topic"] = topic
    else:
        query["topic"] = {"$ne": "Basics"}
    if difficulty:
        query["difficulty"] = difficulty

    problems = list(
        problems_col.find(query, {"_id": 0}).sort([("position", 1)]).limit(limit)
    )
    return problems
