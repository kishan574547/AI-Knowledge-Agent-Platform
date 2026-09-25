import uuid
from typing import Optional, List
from sqlalchemy import String, Uuid, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from sqlalchemy import DateTime
from app.models.base import Base, utc_now


class Profile(Base):
    """
    One profile per Supabase Auth user.
    'id' IS the auth.users.id — no separate user_id column.
    Schema: profiles.id UUID PK REFERENCES auth.users(id)
    """
    __tablename__ = "profiles"

    # id = auth user ID (primary key, no separate user_id)
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Convenience property so existing code using profile.user_id still works
    @property
    def user_id(self) -> uuid.UUID:
        return self.id

    # Relationships
    documents: Mapped[List["Document"]] = relationship(
        "Document",
        back_populates="owner",
        cascade="all, delete-orphan",
        primaryjoin="Profile.id==foreign(Document.owner_id)",
    )
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation",
        back_populates="owner",
        cascade="all, delete-orphan",
        primaryjoin="Profile.id==foreign(Conversation.owner_id)",
    )
