import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Text, String, DateTime, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utc_now


class ResearchSession(Base):
    """
    Stores multi-agent research sessions and execution state.
    Strictly scoped to owner_id.
    """
    __tablename__ = "research_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False, index=True
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False, index=True
    )

    # Execution artifacts
    plan: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    retrieved_sources: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    analysis: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    verification: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    final_report: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    # Observability & failure tracking
    failed_agent: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_log: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return f"<ResearchSession {self.id} status={self.status} owner={self.owner_id}>"
