import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import Text, String, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, utc_now


class Task(Base):
    """
    Task table — strictly scoped to owner_id.
    Every mutation must verify owner_id server-side.
    """
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False, index=True
    )  # pending | completed | cancelled
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
