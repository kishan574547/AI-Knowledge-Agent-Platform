import uuid
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.profile import Profile


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: uuid.UUID) -> Optional[Profile]:
        stmt = select(Profile).where(Profile.id == user_id)
        return self.db.scalars(stmt).first()

    def get_or_create_profile(
        self,
        user_id: uuid.UUID,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
    ) -> Profile:
        profile = self.get_by_user_id(user_id)
        if not profile:
            profile = Profile(
                id=user_id,
                email=email,
                full_name=full_name,
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
        return profile

    def update_profile(
        self,
        user_id: uuid.UUID,
        full_name: Optional[str] = None,
    ) -> Optional[Profile]:
        profile = self.get_by_user_id(user_id)
        if profile and full_name is not None:
            profile.full_name = full_name
            self.db.commit()
            self.db.refresh(profile)
        return profile
