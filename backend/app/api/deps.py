import uuid
from typing import Generator
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import verify_supabase_jwt, AuthenticatedUser
from app.core.errors import AppAuthenticationException
from app.repositories.user_repo import UserRepository


def get_token_from_header(authorization: str = Header(None)) -> str:
    """
    Extracts Bearer token from Authorization header safely.
    """
    if not authorization:
        raise AppAuthenticationException("Authorization header missing")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AppAuthenticationException("Invalid Authorization header format. Expected 'Bearer <token>'")

    return parts[1]


def get_current_user(
    token: str = Depends(get_token_from_header),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """
    Authenticates request via Supabase JWT verification.
    Ensures user profile exists in database.
    """
    user = verify_supabase_jwt(token)
    try:
        user_uuid = uuid.UUID(user.id)
    except ValueError:
        raise AppAuthenticationException("Invalid user ID format in token")

    # Ensure profile row exists in local DB
    user_repo = UserRepository(db)
    user_repo.get_or_create_profile(
        user_id=user_uuid,
        email=user.email,
        full_name=user.user_metadata.get("full_name") or user.user_metadata.get("name"),
    )

    return user


def get_current_user_id(user: AuthenticatedUser = Depends(get_current_user)) -> uuid.UUID:
    """
    Returns the verified user UUID.
    """
    return uuid.UUID(user.id)
