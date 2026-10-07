from datetime import datetime, timezone
from typing import Any, Dict, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError
from app.database.mongodb import get_database
from app.auth.models import UserRegisterRequest, UserLoginRequest
from app.auth.security import hash_password, verify_password


def serialize_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts MongoDB user document into a safe API response dictionary."""
    return {
        "id": str(doc["_id"]),
        "username": doc["username"],
        "email": doc["email"],
        "created_at": doc.get("created_at", datetime.now(timezone.utc)),
    }


def register_user(req: UserRegisterRequest) -> Dict[str, Any]:
    """
    Registers a new user in MongoDB:
    1. Validates uniqueness of email and username.
    2. Hashes password with bcrypt.
    3. Saves user with metadata.
    """
    db = get_database()
    users_col = db["users"]

    # Check if username or email already exists
    normalized_email = req.email.strip().lower()
    normalized_username = req.username.strip().lower()

    if users_col.find_one({"email": normalized_email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    if users_col.find_one({"username": normalized_username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this username already exists."
        )

    hashed_pw = hash_password(req.password)
    user_doc = {
        "username": normalized_username,
        "email": normalized_email,
        "hashed_password": hashed_pw,
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }

    try:
        result = users_col.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        return serialize_user(user_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered."
        )


def authenticate_user(req: UserLoginRequest) -> Dict[str, Any]:
    """
    Verifies user credentials:
    1. Finds user by username or email.
    2. Compares plain password with bcrypt hash.
    Returns the user document or raises HTTP 401.
    """
    db = get_database()
    users_col = db["users"]

    identifier = req.username_or_email.strip().lower()

    # Search by email or username
    user = users_col.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier}
        ]
    })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled."
        )

    return serialize_user(user)


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves active user by ObjectId string."""
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        return None

    db = get_database()
    user = db["users"].find_one({"_id": obj_id})
    if user and user.get("is_active", True):
        return serialize_user(user)
    return None
