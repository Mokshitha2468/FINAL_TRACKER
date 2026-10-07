from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.auth.security import decode_access_token
from app.auth.service import get_user_by_id

# HTTPBearer automatically inspects the Authorization header for 'Bearer <token>'
# and integrates cleanly with FastAPI's OpenAPI Swagger documentation.
security_scheme = HTTPBearer(auto_error=True)
security_scheme_optional = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and validates the JWT from Authorization header.
    1. Decodes JWT and validates signature + expiration (exp).
    2. Retrieves authenticated user document from MongoDB.
    3. Guarantees user isolation: Never trusts a client-supplied user_id.

    Returns the authenticated user dict: { 'id': '...', 'username': '...', 'email': '...' }
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exception

    user = get_user_by_id(user_id)
    if user is None:
        raise credentials_exception

    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme_optional)
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication dependency.
    Returns authenticated user if a valid Bearer token is provided, otherwise None.
    """
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return get_user_by_id(user_id)
    except Exception:
        return None

