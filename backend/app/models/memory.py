import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy import Text, String, Float, ForeignKey, Uuid, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base, utc_now
from app.core.config import settings


class Memory(Base):
    """
    Long-Term Memory table for persistent user context across conversations.
    Strictly scoped to owner_id.
    """
    __tablename__ = "memories"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    memory_type: Mapped[str] = mapped_column(
        String(50),
        default="fact",
        nullable=False,
        index=True,
    )  # preference, goal, skill, project, personal_context, instruction, fact
    embedding: Mapped[Optional[Any]] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSIONS),
        nullable=True,
    )
    importance: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
    )
    source_conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Relationships
    owner: Mapped[Optional["Profile"]] = relationship(
        "Profile",
        primaryjoin="foreign(Memory.owner_id)==Profile.id",
    )
    conversation: Mapped[Optional["Conversation"]] = relationship("Conversation")
    message: Mapped[Optional["Message"]] = relationship("Message")
