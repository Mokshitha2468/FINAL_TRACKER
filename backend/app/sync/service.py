import re
import json
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from app.database.mongodb import get_database


def extract_slug_from_url(url: Optional[str]) -> Optional[str]:
    """Extracts LeetCode problem slug from URL like https://leetcode.com/problems/two-sum/."""
    if not url:
        return None
    match = re.search(r"leetcode\.com/problems/([a-zA-Z0-9\-]+)", url)
    if match:
        return match.group(1).lower()
    return None


def slugify_title(title: str) -> str:
    """Fallback slugify for title matching."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s\-]", "", title).strip()
    return re.sub(r"[\s\-]+", "-", cleaned).lower()


def fetch_leetcode_data(username: str, session_cookie: Optional[str] = None) -> Dict[str, Any]:
    """
    Queries LeetCode GraphQL API for:
    1. User validation, avatar, ranking, and submit stats
    2. Recent accepted submissions
    3. Recent all submissions (to detect failed attempts / errors)
    Supports optional session_cookie for accounts with private submissions.
    """
    graphql_url = "https://leetcode.com/graphql"
    query = """
    query userSubmissionsData($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum { difficulty count submissions }
          totalSubmissionNum { difficulty count submissions }
        }
      }
      recentAcSubmissionList(username: $username, limit: 100) {
        id
        title
        titleSlug
        timestamp
      }
      recentSubmissionList(username: $username, limit: 100) {
        id
        title
        titleSlug
        status
        statusDisplay
        lang
        time
        timestamp
      }
    }
    """
    payload = {
        "query": query,
        "variables": {"username": username},
    }

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"https://leetcode.com/{username}/",
    }
    if session_cookie and session_cookie.strip():
        c_val = session_cookie.strip()
        if not c_val.startswith("LEETCODE_SESSION="):
            c_val = f"LEETCODE_SESSION={c_val}"
        headers["Cookie"] = c_val

    req = urllib.request.Request(
        graphql_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            data = res_data.get("data")
            if not data or not data.get("matchedUser"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"LeetCode user '{username}' not found. Please verify spelling.",
                )
            return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to LeetCode GraphQL API: {str(e)}",
        )


def save_leetcode_username(user_id: str, username: str) -> Dict[str, Any]:
    """Saves the user's LeetCode username once on their profile."""
    clean_username = username.strip()
    if not clean_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty.")

    db = get_database()
    try:
        db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"leetcode_username": clean_username}},
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database update error: {str(e)}")

    return {"message": "LeetCode username saved successfully.", "username": clean_username}


def is_submission_today(dt: Optional[datetime]) -> bool:
    """
    Checks if a submission datetime falls on today (in local user day or UTC day).
    """
    if not dt:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    now_utc = datetime.now(timezone.utc)
    now_local = datetime.now().astimezone()

    sub_utc_date = dt.astimezone(timezone.utc).date()
    sub_local_date = dt.astimezone().date()

    return (sub_utc_date == now_utc.date()) or (sub_local_date == now_local.date())


def get_leetcode_profile(user_id: str) -> Dict[str, Any]:
    """Retrieves saved LeetCode profile info and sync statistics."""
    db = get_database()
    user_doc = None
    try:
        user_doc = db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        pass

    username = user_doc.get("leetcode_username") if user_doc else None
    last_sync = user_doc.get("last_leetcode_sync") if user_doc else None

    total_synced = db["user_leetcode_problems"].count_documents({"user_id": user_id})
    needs_revision_count = db["user_leetcode_problems"].count_documents({"user_id": user_id, "needs_revision": True})

    # Count problems solved today
    all_user_lc = list(db["user_leetcode_problems"].find({"user_id": user_id}, {"last_submitted_at": 1}))
    today_synced = sum(1 for doc in all_user_lc if is_submission_today(doc.get("last_submitted_at")))

    return {
        "username": username,
        "last_synced_at": last_sync.isoformat() if isinstance(last_sync, datetime) else str(last_sync) if last_sync else None,
        "total_synced": total_synced,
        "today_synced": today_synced,
        "needs_revision_count": needs_revision_count,
        "leetcode_total_solved": user_doc.get("leetcode_total_solved") if user_doc else None,
        "leetcode_easy_solved": user_doc.get("leetcode_easy_solved") if user_doc else None,
        "leetcode_medium_solved": user_doc.get("leetcode_medium_solved") if user_doc else None,
        "leetcode_hard_solved": user_doc.get("leetcode_hard_solved") if user_doc else None,
        "leetcode_ranking": user_doc.get("leetcode_ranking") if user_doc else None,
        "leetcode_avatar": user_doc.get("leetcode_avatar") if user_doc else None,
        "is_submissions_private": user_doc.get("leetcode_submissions_private") if user_doc else None,
    }


def sync_user_with_leetcode(
    user_id: str,
    username: Optional[str] = None,
    session_cookie: Optional[str] = None,
    today_only: bool = True,
) -> Dict[str, Any]:
    """
    Core LeetCode Sync Engine:
    1. Validates username (uses provided or saved).
    2. Queries LeetCode GraphQL for submissions & attempts (supporting session_cookie).
    3. When today_only=True, strictly filters accepted submissions completed today.
    4. Calculates failed attempts. If attempts > 4 or failed >= 3, automatically sets needs_revision = True.
    5. Automatically adds high-error problems into Spaced Repetition (revision_events).
    6. Synchronizes matched A2Z problems in user_problem_progress and POTD for today.
    """
    db = get_database()

    # Determine username
    clean_username = (username or "").strip()
    if not clean_username:
        # Check user profile
        try:
            user_doc = db["users"].find_one({"_id": ObjectId(user_id)})
            clean_username = (user_doc.get("leetcode_username") or "").strip() if user_doc else ""
        except Exception:
            pass

    if not clean_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No LeetCode username provided or connected. Please enter your username.",
        )

    # 1. Fetch LeetCode submissions & error metrics
    data = fetch_leetcode_data(clean_username, session_cookie=session_cookie)
    matched_user = data.get("matchedUser") or {}
    user_profile = matched_user.get("profile") or {}
    submit_stats = matched_user.get("submitStats") or {}
    ac_sub_nums = submit_stats.get("acSubmissionNum") or []

    lc_total_solved = 0
    lc_easy_solved = 0
    lc_medium_solved = 0
    lc_hard_solved = 0
    for ac in ac_sub_nums:
        d = ac.get("difficulty")
        c = ac.get("count", 0)
        if d == "All":
            lc_total_solved = c
        elif d == "Easy":
            lc_easy_solved = c
        elif d == "Medium":
            lc_medium_solved = c
        elif d == "Hard":
            lc_hard_solved = c

    lc_avatar = user_profile.get("userAvatar")
    lc_ranking = user_profile.get("ranking")

    all_submissions = data.get("recentSubmissionList") or []
    ac_list = data.get("recentAcSubmissionList") or []

    # Map timestamps by slug from recentAcSubmissionList if missing in recentSubmissionList
    slug_to_ac_timestamp: Dict[str, str] = {}
    for ac in ac_list:
        s_slug = (ac.get("titleSlug") or "").lower()
        if s_slug and ac.get("timestamp"):
            slug_to_ac_timestamp[s_slug] = str(ac.get("timestamp"))

    # AlgoPulse approach: filter recent submissions where statusDisplay == "Accepted"
    accepted_submissions = []
    seen_ac_slugs = set()

    for s in all_submissions:
        if (s.get("statusDisplay") or "").strip().lower() == "accepted":
            slug = (s.get("titleSlug") or "").lower()
            if not slug or slug in seen_ac_slugs:
                continue
            if not s.get("timestamp") and slug in slug_to_ac_timestamp:
                s["timestamp"] = slug_to_ac_timestamp[slug]
            accepted_submissions.append(s)
            seen_ac_slugs.add(slug)

    for ac in ac_list:
        slug = (ac.get("titleSlug") or "").lower()
        if slug and slug not in seen_ac_slugs:
            accepted_submissions.append(ac)
            seen_ac_slugs.add(slug)

    # Filter for today's submissions only if today_only is requested
    if today_only:
        filtered_accepted = []
        for s in accepted_submissions:
            ts = s.get("timestamp")
            if ts:
                sub_time = datetime.fromtimestamp(int(ts), tz=timezone.utc)
                if is_submission_today(sub_time):
                    filtered_accepted.append(s)
        accepted_submissions = filtered_accepted

    # Check if recent submissions are private
    is_submissions_private = (lc_total_solved > 0 and len(accepted_submissions) == 0 and not all_submissions)

    # Update profile with username, timestamp, and leetcode stats
    now = datetime.now(timezone.utc)
    try:
        db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "leetcode_username": clean_username,
                    "last_leetcode_sync": now,
                    "leetcode_total_solved": lc_total_solved,
                    "leetcode_easy_solved": lc_easy_solved,
                    "leetcode_medium_solved": lc_medium_solved,
                    "leetcode_hard_solved": lc_hard_solved,
                    "leetcode_ranking": lc_ranking,
                    "leetcode_avatar": lc_avatar,
                    "leetcode_submissions_private": is_submissions_private,
                }
            },
        )
    except Exception:
        pass

    # 2. Build attempt count and error metrics per problem slug
    attempt_stats: Dict[str, Dict[str, int]] = {}
    for sub in all_submissions:
        s_slug = (sub.get("titleSlug") or "").lower()
        if not s_slug:
            continue
        if s_slug not in attempt_stats:
            attempt_stats[s_slug] = {"total_attempts": 0, "failed_attempts": 0}
        attempt_stats[s_slug]["total_attempts"] += 1
        status_disp = (sub.get("statusDisplay") or "").lower()
        if status_disp != "accepted":
            attempt_stats[s_slug]["failed_attempts"] += 1

    # 3. Create slug map for canonical A2Z curriculum
    all_a2z = list(db["a2z_problems"].find({"track": "DSA"}))
    slug_to_a2z: Dict[str, Dict[str, Any]] = {}
    title_to_a2z: Dict[str, Dict[str, Any]] = {}

    for prob in all_a2z:
        u_slug = extract_slug_from_url(prob.get("url"))
        if u_slug:
            slug_to_a2z[u_slug] = prob
        t_slug = slugify_title(prob.get("title", ""))
        if t_slug:
            title_to_a2z[t_slug] = prob

    # Already solved positions in curriculum
    already_solved_positions = set(
        db["user_problem_progress"].distinct(
            "position",
            {"user_id": user_id, "track": "DSA", "status": "solved"},
        )
    )

    newly_solved_a2z = []
    already_solved_a2z = 0
    synced_slugs = set()
    needs_revision_counter = 0

    # 4. Upsert problems into user_leetcode_problems & update user_problem_progress
    for sub in accepted_submissions:
        title_slug = (sub.get("titleSlug") or "").lower()
        title = sub.get("title") or title_slug
        if not title_slug or title_slug in synced_slugs:
            continue
        synced_slugs.add(title_slug)

        # Matched A2Z problem?
        matched_a2z = slug_to_a2z.get(title_slug) or title_to_a2z.get(slugify_title(title))
        matched_pos = matched_a2z["position"] if matched_a2z else None
        difficulty = matched_a2z["difficulty"] if matched_a2z else "Medium"

        # Calculate attempts and errors
        stats = attempt_stats.get(title_slug, {"total_attempts": 1, "failed_attempts": 0})
        attempts = max(1, stats["total_attempts"])
        failed = stats["failed_attempts"]

        # AUTO-REVISION CRITERIA:
        # If user took > 4 attempts or had >= 3 errors -> Needs Revision!
        auto_needs_revision = attempts > 4 or failed >= 3

        # Parse timestamp
        ts = sub.get("timestamp")
        sub_time = datetime.fromtimestamp(int(ts), tz=timezone.utc) if ts else now

        # Existing saved note?
        existing_doc = db["user_leetcode_problems"].find_one({"user_id": user_id, "title_slug": title_slug})
        existing_notes = existing_doc.get("notes") if existing_doc else None
        existing_needs_rev = existing_doc.get("needs_revision", False) if existing_doc else False

        final_needs_revision = existing_needs_rev or auto_needs_revision
        if final_needs_revision:
            needs_revision_counter += 1

        db["user_leetcode_problems"].update_one(
            {"user_id": user_id, "title_slug": title_slug},
            {
                "$set": {
                    "title": title,
                    "difficulty": difficulty,
                    "attempt_count": attempts,
                    "failed_attempts": failed,
                    "needs_revision": final_needs_revision,
                    "notes": existing_notes,
                    "last_submitted_at": sub_time,
                    "matched_a2z_position": matched_pos,
                    "url": f"https://leetcode.com/problems/{title_slug}/",
                    "updated_at": now,
                }
            },
            upsert=True,
        )

        # 5. Push to Spaced Repetition revision_events if needs revision
        if final_needs_revision:
            scheduled_date = (now.date() + timedelta(days=1)).isoformat()
            rev_filter = {"user_id": user_id, "revision_number": 1}
            if matched_pos:
                rev_filter["position"] = matched_pos
            else:
                rev_filter["problem_title"] = title

            db["revision_events"].update_one(
                rev_filter,
                {
                    "$set": {
                        "user_id": user_id,
                        "track": "DSA",
                        "position": matched_pos,
                        "problem_title": title,
                        "topic": matched_a2z.get("topic", "LeetCode Vault") if matched_a2z else "LeetCode Vault",
                        "difficulty": difficulty,
                        "url": f"https://leetcode.com/problems/{title_slug}/",
                        "notes": f"High error count ({attempts} attempts, {failed} errors). Auto-flagged for spaced revision.",
                        "scheduled_date": scheduled_date,
                        "revision_number": 1,
                        "is_completed": False,
                    }
                },
                upsert=True,
            )

        # 6. Synchronize with curriculum progress
        if matched_pos:
            if matched_pos in already_solved_positions:
                already_solved_a2z += 1
            else:
                db["user_problem_progress"].update_one(
                    {"user_id": user_id, "track": "DSA", "position": matched_pos},
                    {"$set": {"status": "solved", "completed_at": sub_time}},
                    upsert=True,
                )
                newly_solved_a2z.append({
                    "position": matched_pos,
                    "title": title,
                    "difficulty": difficulty,
                    "slug": title_slug,
                })

            # Check if this matched problem corresponds to today's POTD
            try:
                from app.potd.service import get_daily_position
                today_str = now.date().isoformat()
                if matched_pos == get_daily_position(today_str):
                    db["potd_completions"].update_one(
                        {"user_id": user_id, "date": today_str},
                        {"$set": {"completed_at": sub_time, "position": matched_pos}},
                        upsert=True,
                    )
            except Exception:
                pass

    today_count = len(synced_slugs)
    if is_submissions_private:
        rank_str = f"{lc_ranking:,}" if lc_ranking else "N/A"
        message = (
            f"Connected to @{clean_username} ({lc_total_solved} solved, Rank #{rank_str}). "
            f"NOTE: Your 'Recent Submissions' are set to Private on LeetCode. "
            f"To sync your solved problems, open LeetCode Settings > Privacy and turn on 'Show recent submissions' (or paste your session cookie)."
        )
    elif today_only:
        if today_count > 0:
            message = f"Synced {today_count} problem(s) solved today on LeetCode ({len(newly_solved_a2z)} new A2Z sheet solves)."
        else:
            message = f"Checked LeetCode for @{clean_username}: No problems solved today yet (0 solved today). Solve problems on LeetCode and click Sync!"
    else:
        message = f"Synced {today_count} LeetCode problems ({needs_revision_counter} flagged for revision, {len(newly_solved_a2z)} new A2Z solves)."

    return {
        "username": clean_username,
        "total_accepted_submissions_found": len(all_submissions),
        "today_solved_count": today_count,
        "matched_a2z_problems": len(synced_slugs),
        "newly_solved": len(newly_solved_a2z),
        "already_solved": already_solved_a2z,
        "needs_revision_count": needs_revision_counter,
        "synced_problems": newly_solved_a2z,
        "message": message,
    }


def get_synced_leetcode_problems(
    user_id: str,
    needs_revision: Optional[bool] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    today_only: Optional[bool] = None,
) -> Dict[str, Any]:
    """Retrieves synced problems from user_leetcode_problems collection."""
    db = get_database()
    query: Dict[str, Any] = {"user_id": user_id}

    if needs_revision is not None:
        query["needs_revision"] = needs_revision
    if difficulty and difficulty.lower() != "all":
        query["difficulty"] = difficulty
    if search:
        query["title"] = {"$regex": re.escape(search), "$options": "i"}

    cursor = db["user_leetcode_problems"].find(query).sort("last_submitted_at", -1)

    problems = []
    for doc in cursor:
        sub_at = doc.get("last_submitted_at")
        is_today = is_submission_today(sub_at) if isinstance(sub_at, datetime) else False
        if today_only is True and not is_today:
            continue
        problems.append({
            "title_slug": doc["title_slug"],
            "title": doc.get("title", doc["title_slug"]),
            "difficulty": doc.get("difficulty", "Medium"),
            "attempt_count": doc.get("attempt_count", 1),
            "failed_attempts": doc.get("failed_attempts", 0),
            "needs_revision": doc.get("needs_revision", False),
            "notes": doc.get("notes"),
            "last_submitted_at": sub_at.strftime("%Y-%m-%d %H:%M") if isinstance(sub_at, datetime) else str(sub_at) if sub_at else None,
            "matched_a2z_position": doc.get("matched_a2z_position"),
            "url": doc.get("url") or f"https://leetcode.com/problems/{doc['title_slug']}/",
            "is_today": is_today,
        })

    profile = get_leetcode_profile(user_id)
    return {
        "profile": profile,
        "problems": problems,
    }



def update_leetcode_problem_note(
    user_id: str,
    title_slug: str,
    notes: Optional[str] = None,
    needs_revision: Optional[bool] = None,
) -> Dict[str, Any]:
    """Updates reflection note and/or toggles revision status for a synced problem."""
    db = get_database()
    update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}

    if notes is not None:
        update_fields["notes"] = notes
    if needs_revision is not None:
        update_fields["needs_revision"] = needs_revision

    result = db["user_leetcode_problems"].update_one(
        {"user_id": user_id, "title_slug": title_slug},
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found in your LeetCode vault.")

    # Also add or update revision_events if needs_revision is true, or remove if unflagged
    doc = db["user_leetcode_problems"].find_one({"user_id": user_id, "title_slug": title_slug})
    if doc:
        title = doc.get("title", title_slug)
        matched_pos = doc.get("matched_a2z_position")

        if needs_revision is True:
            now = datetime.now(timezone.utc)
            scheduled_date = (now.date() + timedelta(days=1)).isoformat()
            rev_filter = {"user_id": user_id, "revision_number": 1}
            if matched_pos:
                rev_filter["position"] = matched_pos
            else:
                rev_filter["problem_title"] = title

            db["revision_events"].update_one(
                rev_filter,
                {
                    "$set": {
                        "user_id": user_id,
                        "track": "DSA",
                        "position": matched_pos,
                        "problem_title": title,
                        "topic": "LeetCode Vault",
                        "difficulty": doc.get("difficulty", "Medium"),
                        "url": doc.get("url"),
                        "notes": notes or doc.get("notes") or "Flagged from LeetCode Vault",
                        "scheduled_date": scheduled_date,
                        "revision_number": 1,
                        "is_completed": False,
                    }
                },
                upsert=True,
            )
        elif needs_revision is False:
            del_filter = {"user_id": user_id, "revision_number": 1, "is_completed": False}
            if matched_pos:
                del_filter["position"] = matched_pos
            else:
                del_filter["problem_title"] = title
            db["revision_events"].delete_many(del_filter)

    return {
        "message": "Problem updated successfully.",
        "title_slug": title_slug,
        "notes": notes,
        "needs_revision": needs_revision,
    }
