from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (min 6 chars)")


class UserLoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=3, description="Username or email address")
    password: str = Field(..., min_length=1, description="Password")


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
