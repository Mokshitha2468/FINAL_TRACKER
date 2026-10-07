import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from app.config import settings

logger = logging.getLogger(__name__)

_mongo_client: Optional[MongoClient] = None


def get_client() -> MongoClient:
    """Returns or creates the MongoClient singleton instance."""
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    return _mongo_client


def get_database() -> Database:
    """Returns the application MongoDB database instance."""
    client = get_client()
    return client[settings.DB_NAME]


def init_db_indexes() -> None:
    """
    Initializes critical database indexes on application startup.
    1. Users collection: unique 'email' and unique 'username'.
    2. A2Z Problems collection: compound unique 'track' + 'position'.
    """
    db = get_database()

    # Users collection indexes
    users_col = db["users"]
    users_col.create_index([("email", 1)], unique=True, name="user_email_unique")
    users_col.create_index([("username", 1)], unique=True, name="user_username_unique")

    # Canonical Problems collection indexes
    problems_col = db["a2z_problems"]
    problems_col.create_index([("track", 1), ("position", 1)], unique=True, name="track_position_unique")
    problems_col.create_index(
        [("track", 1), ("topic", 1), ("difficulty", 1), ("position", 1)],
        name="track_topic_diff_pos_idx",
    )
    problems_col.create_index([("url", 1)], name="problem_url_idx")

    # User Problem Progress collection indexes
    progress_col = db["user_problem_progress"]
    progress_col.create_index(
        [("user_id", 1), ("track", 1), ("position", 1)],
        unique=True,
        name="user_track_pos_unique"
    )
    progress_col.create_index(
        [("user_id", 1), ("track", 1), ("status", 1)],
        name="user_track_status_idx"
    )

    # Revision Events collection indexes
    revisions_col = db["revision_events"]
    revisions_col.create_index(
        [("user_id", 1), ("scheduled_date", 1), ("is_completed", 1)],
        name="user_revision_date_idx"
    )
    revisions_col.create_index(
        [("user_id", 1), ("position", 1), ("revision_number", 1)],
        unique=True,
        name="user_pos_rev_unique",
        partialFilterExpression={"position": {"$gt": 0}},
    )
    # Planner collections indexes
    db["planner_settings"].create_index(
        [("user_id", 1), ("track", 1)],
        unique=True,
        name="user_track_planner_unique"
    )
    db["planner_schedule"].create_index(
        [("user_id", 1), ("track", 1), ("date", 1)],
        unique=True,
        name="user_track_date_schedule_unique",
    )
    # TODO collection indexes
    db["todos"].create_index(
        [("user_id", 1), ("completed", 1), ("due_date", 1)],
        name="user_todo_idx",
    )
    # POTD Completions index
    db["potd_completions"].create_index(
        [("user_id", 1), ("date", 1)],
        unique=True,
        name="user_potd_date_unique",
    )
    # Contest bookmarks index
    db["contest_bookmarks"].create_index(
        [("user_id", 1), ("contest_id", 1)],
        unique=True,
        name="user_contest_bookmark_unique",
    )
    # Mock Exams indexes
    db["mock_exams"].create_index(
        [("user_id", 1), ("status", 1)],
        name="user_mock_exam_status_idx",
    )
    db["mock_exams"].create_index(
        [("user_id", 1), ("created_at", -1)],
        name="user_mock_exam_time_idx",
    )
    # User LeetCode Synced Problems index
    db["user_leetcode_problems"].create_index(
        [("user_id", 1), ("title_slug", 1)],
        unique=True,
        name="user_leetcode_slug_unique",
    )
    db["user_leetcode_problems"].create_index(
        [("user_id", 1), ("needs_revision", 1)],
        name="user_leetcode_revision_idx",
    )

    # Infinite Whiteboards index
    db["whiteboards"].create_index(
        [("user_id", 1), ("updated_at", -1)],
        name="user_whiteboards_updated_idx",
    )

    logger.info("MongoDB indexes verified/created successfully.")


def close_db_connection() -> None:
    """Closes the MongoDB client connection cleanly."""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        logger.info("MongoDB connection closed.")
