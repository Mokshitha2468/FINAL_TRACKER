from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from app.auth.models import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    MessageResponse,
)
from app.auth.service import register_user, authenticate_user
from app.auth.security import create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest):
    """
    Registers a new user account.
    - Validates email format and password length.
    - Hashes password using bcrypt.
    - Enforces uniqueness on email and username.
    """
    user = register_user(req)
    return user


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest):
    """
    Authenticates user and returns a signed, expiring JWT access token.
    """
    user = authenticate_user(req)
    access_token = create_access_token(data={"sub": user["id"], "username": user["username"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile.
    Requires Bearer token in Authorization header.
    """
    return current_user


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Stateless logout confirmation.
    The client invalidates/discards the JWT token locally.
    """
    return {"message": "Successfully logged out."}
