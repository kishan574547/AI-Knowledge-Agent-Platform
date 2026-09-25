import uuid
from typing import Optional, List
from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimeStampedModel


class Conversation(TimeStampedModel):
    __tablename__ = "conversations"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), default="New Conversation", nullable=False)

    # Relationships
    owner: Mapped[Optional["Profile"]] = relationship(
        "Profile",
        back_populates="conversations",
        primaryjoin="foreign(Conversation.owner_id)==Profile.id",
    )
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )
