from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from app.database.mongodb import get_database


def generate_upcoming_contests() -> List[Dict[str, Any]]:
    """
    Generates realistic, active upcoming contests for major CP platforms
    anchored to the current week's calendar.
    """
    now = datetime.now(timezone.utc)
    base_date = now.replace(minute=0, second=0, microsecond=0)

    # Calculate upcoming dates for scheduled platforms
    # 1. LeetCode Weekly Contest (Next Sunday 02:30 UTC)
    days_to_sun = (6 - base_date.weekday()) % 7
    if days_to_sun == 0 and base_date.hour >= 4:
        days_to_sun = 7
    lc_weekly_start = (base_date + timedelta(days=days_to_sun)).replace(hour=2, minute=30)

    # 2. LeetCode Biweekly Contest (Next Saturday 14:30 UTC)
    days_to_sat = (5 - base_date.weekday()) % 7
    if days_to_sat == 0 and base_date.hour >= 16:
        days_to_sat = 7
    lc_biweekly_start = (base_date + timedelta(days=days_to_sat)).replace(hour=14, minute=30)

    # 3. Codeforces Div. 2 (Next Friday 14:35 UTC)
    days_to_fri = (4 - base_date.weekday()) % 7
    if days_to_fri == 0 and base_date.hour >= 17:
        days_to_fri = 7
    cf_div2_start = (base_date + timedelta(days=days_to_fri)).replace(hour=14, minute=35)

    # 4. CodeChef Starters (Next Wednesday 14:30 UTC)
    days_to_wed = (2 - base_date.weekday()) % 7
    if days_to_wed == 0 and base_date.hour >= 17:
        days_to_wed = 7
    cc_start = (base_date + timedelta(days=days_to_wed)).replace(hour=14, minute=30)

    # 5. AtCoder Beginner Contest (Next Saturday 12:00 UTC)
    atcoder_start = (base_date + timedelta(days=days_to_sat)).replace(hour=12, minute=0)

    contests = [
        {
            "id": "lc-weekly-418",
            "name": "Weekly Contest 418",
            "platform": "LeetCode",
            "start_time": lc_weekly_start.strftime("%Y-%m-%d %H:%M UTC"),
            "duration_minutes": 90,
            "url": "https://leetcode.com/contest/",
        },
        {
            "id": "lc-biweekly-140",
            "name": "Biweekly Contest 140",
            "platform": "LeetCode",
            "start_time": lc_biweekly_start.strftime("%Y-%m-%d %H:%M UTC"),
            "duration_minutes": 90,
            "url": "https://leetcode.com/contest/",
        },
        {
            "id": "cf-round-980-div2",
            "name": "Codeforces Round 980 (Div. 2)",
            "platform": "Codeforces",
            "start_time": cf_div2_start.strftime("%Y-%m-%d %H:%M UTC"),
            "duration_minutes": 120,
            "url": "https://codeforces.com/contests",
        },
        {
            "id": "cc-starters-155",
            "name": "Starters 155 (Rated till 6-Star)",
            "platform": "CodeChef",
            "start_time": cc_start.strftime("%Y-%m-%d %H:%M UTC"),
            "duration_minutes": 120,
            "url": "https://www.codechef.com/contests",
        },
        {
            "id": "abc-372",
            "name": "AtCoder Beginner Contest 372",
            "platform": "AtCoder",
            "start_time": atcoder_start.strftime("%Y-%m-%d %H:%M UTC"),
            "duration_minutes": 100,
            "url": "https://atcoder.jp/contests/",
        },
    ]

    # Sort contests chronologically by start_time
    contests.sort(key=lambda x: x["start_time"])
    return contests


def get_contests_for_user(user_id: Optional[str] = None, platform: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns upcoming contests filtered by platform, with user bookmarks populated.
    """
    db = get_database()
    bookmarked_ids = set()

    if user_id:
        bookmarks = db["contest_bookmarks"].find({"user_id": user_id})
        bookmarked_ids = {b["contest_id"] for b in bookmarks}

    contests = generate_upcoming_contests()

    if platform and platform.lower() != "all":
        contests = [c for c in contests if c["platform"].lower() == platform.lower()]

    for c in contests:
        c["is_bookmarked"] = c["id"] in bookmarked_ids

    return contests


def toggle_contest_bookmark(user_id: str, contest_id: str) -> Dict[str, Any]:
    """
    Toggles a bookmark on a contest for the user.
    """
    db = get_database()
    existing = db["contest_bookmarks"].find_one({"user_id": user_id, "contest_id": contest_id})

    if existing:
        db["contest_bookmarks"].delete_one({"_id": existing["_id"]})
        return {
            "contest_id": contest_id,
            "is_bookmarked": False,
            "message": "Contest bookmark removed.",
        }
    else:
        db["contest_bookmarks"].insert_one({
            "user_id": user_id,
            "contest_id": contest_id,
            "created_at": datetime.now(),
        })
        return {
            "contest_id": contest_id,
            "is_bookmarked": True,
            "message": "Contest bookmarked successfully.",
        }
