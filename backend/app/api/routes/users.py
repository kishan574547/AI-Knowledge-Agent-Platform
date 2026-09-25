import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_current_user_id
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.repositories.user_repo import UserRepository
from app.schemas.user import ProfileResponse, ProfileUpdateRequest
from app.core.errors import ResourceNotFoundException

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=ProfileResponse)
def get_current_user_profile(
    user_id: uuid.UUID = Depends(get_current_user_id),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the authenticated user's profile.
    """
    user_repo = UserRepository(db)
    profile = user_repo.get_by_user_id(user_id)
    if not profile:
        profile = user_repo.get_or_create_profile(
            user_id=user_id,
            email=current_user.email,
            full_name=current_user.user_metadata.get("full_name"),
        )
    return profile


@router.patch("/me", response_model=ProfileResponse)
def update_current_user_profile(
    req: ProfileUpdateRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Updates the authenticated user's profile.
    """
    user_repo = UserRepository(db)
    profile = user_repo.update_profile(user_id=user_id, full_name=req.full_name)
    if not profile:
        raise ResourceNotFoundException("Profile not found")
    return profile
