"""
A2Z CSV Ingestion & Validation Script
=====================================
Reads Raj Vikramaditya's Striver A2Z 474-problem dataset from CSV, performs strict
two-phase validation (Phase A), and on 100% validation success, imports the normalized
records into MongoDB's `a2z_problems` collection (Phase B).

Key Architectural Guarantees:
1. Strict 1-indexed sequential ordering (positions 1 through 474).
2. Clean normalized `topic` mapping separate from raw step names.
3. Original `subtopic` preserved as metadata for filtering.
4. Missing `companies_count` preserved as null (never defaulted to 0).
5. Compound unique index on { track: 1, position: 1 } for multi-track coexistence.
6. Zero database writes if any validation rule fails.
"""

import os
import sys
import csv
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import PyMongoError

# Load environment variables (.env file in backend/ directory)
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "dsa_tracker")

# Canonical mapping from step_num to normalized clean Topic name
STEP_NUM_TO_TOPIC: Dict[int, str] = {
    1: "Basics",
    2: "Sorting",
    3: "Arrays",
    4: "Binary Search",
    5: "Strings",
    6: "Linked List",
    7: "Recursion",
    8: "Bit Manipulation",
    9: "Stacks & Queues",
    10: "Sliding Window & Two Pointers",
    11: "Heaps",
    12: "Greedy Algorithms",
    13: "Binary Trees",
    14: "Binary Search Trees",
    15: "Graphs",
    16: "Dynamic Programming",
    17: "Tries",
    18: "Strings",
}

VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}

PLATFORM_NORMALIZATION: Dict[str, str] = {
    "leetcode": "leetcode",
    "geeksforgeeks": "gfg",
    "takeuforward": "takeuforward",
    "crackedprep": "crackedprep",
}


def normalize_platform(raw_source: str, problem_url: str) -> Optional[str]:
    """
    Normalizes the platform identifier using the CSV's problem_source or problem_link URL.
    """
    s = (raw_source or "").strip().lower()
    u = (problem_url or "").strip().lower()

    if "leetcode" in s or "leetcode.com" in u:
        return "leetcode"
    if "geeksforgeeks" in s or "geeksforgeeks.org" in u or s == "gfg":
        return "gfg"
    if "takeuforward" in s or "takeuforward.org" in u:
        return "takeuforward"
    if "crackedprep" in s or "crackedprep.com" in u:
        return "crackedprep"

    return s if s else None


def parse_company_count(raw_val: str) -> Optional[int]:
    """
    Safely converts companies_count to an integer if present, or None if blank.
    Handles numeric strings with decimals (e.g. '22.0' -> 22).
    Never converts blank or unknown values into 0.
    """
    if raw_val is None:
        return None
    val = raw_val.strip()
    if not val:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def validate_and_normalize_row(
    row: Dict[str, str], position: int
) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    """
    Validates a single CSV row and transforms it into the canonical schema.
    Returns (normalized_doc, error_list).
    """
    errors: List[str] = []

    # 1. Step number validation
    step_num_raw = row.get("step_num", "").strip()
    if not step_num_raw:
        errors.append(f"Position {position}: Missing 'step_num'")
        step_num = None
    else:
        try:
            step_num = int(step_num_raw)
            if step_num not in STEP_NUM_TO_TOPIC:
                errors.append(f"Position {position}: Unknown step_num '{step_num}'")
        except ValueError:
            errors.append(f"Position {position}: Invalid non-integer step_num '{step_num_raw}'")
            step_num = None

    # 2. Problem title
    title = row.get("problem", "").strip()
    if not title:
        errors.append(f"Position {position}: Missing 'problem' title")

    # 3. Difficulty validation
    difficulty = row.get("difficulty", "").strip()
    if not difficulty:
        errors.append(f"Position {position}: Missing 'difficulty'")
    elif difficulty not in VALID_DIFFICULTIES:
        errors.append(f"Position {position}: Invalid difficulty '{difficulty}' (must be Easy, Medium, or Hard)")

    # 4. Topic and Subtopic
    raw_step_name = row.get("step_name", "").strip()
    topic = STEP_NUM_TO_TOPIC.get(step_num, raw_step_name) if step_num else raw_step_name
    subtopic = row.get("subtopic", "").strip()

    # 5. URLs and Platform
    problem_url = row.get("problem_link", "").strip() or None
    article_url = row.get("article_link", "").strip() or None
    video_url = row.get("video_link", "").strip() or None
    platform = normalize_platform(row.get("problem_source", ""), problem_url or "")

    # 6. Company count
    companies_count = parse_company_count(row.get("companies_count", ""))

    if errors:
        return None, errors

    doc: Dict[str, Any] = {
        "track": "DSA",
        "position": position,
        "step_num": step_num,
        "step_name_raw": raw_step_name,
        "topic": topic,
        "subtopic": subtopic,
        "title": title,
        "difficulty": difficulty,
        "url": problem_url,
        "platform": platform,
        "article_url": article_url,
        "video_url": video_url,
        "companies_count": companies_count,
        "source": "striver_a2z",
    }

    return doc, []


def run_ingestion(csv_path: str, dry_run: bool = False) -> bool:
    """
    Two-phase ingestion runner:
    Phase A: Complete file read, strict validation, statistics generation.
    Phase B: Mongo upsert (only if Phase A produces 0 blocking errors).
    """
    print(f"Reading CSV from: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"ERROR: CSV file not found at {csv_path}", file=sys.stderr)
        return False

    raw_rows: List[Dict[str, str]] = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            raw_rows.append(r)

    total_rows = len(raw_rows)
    all_errors: List[str] = []
    normalized_records: List[Dict[str, Any]] = []

    # Statistics tracking
    difficulty_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
    topic_counts: Dict[str, int] = {}
    platform_counts: Dict[str, int] = {}
    missing_problem_urls = 0
    missing_article_urls = 0
    missing_video_urls = 0
    seen_titles: Set[str] = set()
    duplicate_titles: List[str] = []

    # Phase A: Row-by-row validation & normalization
    for idx, row in enumerate(raw_rows, start=1):
        position = idx  # 1-indexed sequential position
        doc, errors = validate_and_normalize_row(row, position)
        if errors:
            all_errors.extend(errors)
        else:
            normalized_records.append(doc)
            # Track difficulty
            difficulty_counts[doc["difficulty"]] += 1
            # Track topic
            topic_counts[doc["topic"]] = topic_counts.get(doc["topic"], 0) + 1
            # Track platform
            plat = doc["platform"] or "unspecified"
            platform_counts[plat] = platform_counts.get(plat, 0) + 1
            # Track resources
            if not doc["url"]:
                missing_problem_urls += 1
            if not doc["article_url"]:
                missing_article_urls += 1
            if not doc["video_url"]:
                missing_video_urls += 1
            # Track duplicate titles
            if doc["title"].lower() in seen_titles:
                duplicate_titles.append(f"Position {position}: '{doc['title']}'")
            else:
                seen_titles.add(doc["title"].lower())

    # Position continuity verification
    positions = [doc["position"] for doc in normalized_records]
    expected_positions = list(range(1, total_rows + 1))
    duplicate_positions = len(positions) - len(set(positions))
    missing_positions = [p for p in expected_positions if p not in set(positions)]

    if total_rows != 474:
        all_errors.append(f"Row count mismatch: Expected exactly 474 rows, but got {total_rows}")

    if duplicate_positions > 0:
        all_errors.append(f"Duplicate positions detected: {duplicate_positions}")

    if missing_positions:
        all_errors.append(f"Missing continuous positions: {missing_positions[:10]}...")

    # Display Comprehensive Validation Report
    print("\n" + "=" * 62)
    print("              A2Z CSV VALIDATION REPORT")
    print("=" * 62)
    print(f"File:                      {os.path.basename(csv_path)}")
    print(f"Total Rows Read:           {total_rows}")
    print(f"Valid Problem Records:     {len(normalized_records)}")
    print(f"Invalid Rows:              {len(all_errors)}")
    print(f"Duplicate Positions:       {duplicate_positions}")
    print(f"Missing Positions:         {len(missing_positions)}")
    print(f"Duplicate Titles Noted:    {len(duplicate_titles)}")

    print("\n--- DIFFICULTY BREAKDOWN ---")
    for diff, count in difficulty_counts.items():
        print(f"  {diff:<8}: {count:>4} problems ({count / total_rows * 100:.1f}%)")

    print("\n--- URL & RESOURCE COMPLETION ---")
    print(f"  Problems with URL:       {total_rows - missing_problem_urls:>4} / {total_rows} (Missing: {missing_problem_urls})")
    print(f"  Problems with Article:   {total_rows - missing_article_urls:>4} / {total_rows} (Missing: {missing_article_urls})")
    print(f"  Problems with Video:     {total_rows - missing_video_urls:>4} / {total_rows} (Missing: {missing_video_urls})")

    print("\n--- PLATFORM BREAKDOWN ---")
    for plat, count in sorted(platform_counts.items(), key=lambda x: -x[1]):
        print(f"  {plat:<15}: {count:>4}")

    print("\n--- TOPIC BREAKDOWN (Canonical UI Topics) ---")
    for topic, count in sorted(topic_counts.items(), key=lambda x: x[0]):
        print(f"  {topic:<30}: {count:>3} problems")
    print("=" * 62)

    if all_errors:
        print("\n[FATAL] VALIDATION FAILED! The following errors must be resolved:")
        for err in all_errors[:20]:
            print(f"  - {err}")
        if len(all_errors) > 20:
            print(f"  ... and {len(all_errors) - 20} more errors.")
        print("\nABORTING: No data was written to MongoDB.", file=sys.stderr)
        return False

    print("\nSTATUS: 100% VALIDATION PASSED.")

    if dry_run:
        print("Dry run requested. Skipping database writes.")
        return True

    # Phase B: Write to MongoDB
    print(f"\nConnecting to MongoDB at: {MONGODB_URI}")
    print(f"Target Database: '{DB_NAME}', Collection: 'a2z_problems'")

    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Ping the server to check connectivity
        client.admin.command("ping")
        db = client[DB_NAME]
        collection = db["a2z_problems"]

        # Ensure indexes
        # 1. Compound unique index on (track, position)
        collection.create_index([("track", 1), ("position", 1)], unique=True, name="track_position_unique")
        # 2. Compound index for dashboard queries (track, topic, difficulty, position)
        collection.create_index(
            [("track", 1), ("topic", 1), ("difficulty", 1), ("position", 1)],
            name="track_topic_diff_pos_idx",
        )
        # 3. Index for external matching by problem URL
        collection.create_index([("url", 1)], name="problem_url_idx")

        # Perform idempotent bulk upserts
        operations = [
            UpdateOne(
                {"track": doc["track"], "position": doc["position"]},
                {"$set": doc},
                upsert=True,
            )
            for doc in normalized_records
        ]

        result = collection.bulk_write(operations, ordered=True)
        print("\n--- MONGODB IMPORT SUCCESS ---")
        print(f"Matched count:     {result.matched_count}")
        print(f"Upserted count:    {len(result.upserted_ids)}")
        print(f"Modified count:    {result.modified_count}")
        print(f"Total in collection: {collection.count_documents({'track': 'DSA'})}")
        print("=" * 62)
        return True

    except PyMongoError as e:
        print(f"\n[ERROR] MongoDB operation failed: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    # Resolve CSV path (check data/ first, then root folder)
    base_dir = Path(__file__).resolve().parent.parent.parent
    data_csv = base_dir / "data" / "striver_a2z_complete_474.csv"
    if not data_csv.exists():
        data_csv = base_dir / "striver_a2z_complete_474.csv"

    success = run_ingestion(str(data_csv))
    sys.exit(0 if success else 1)
