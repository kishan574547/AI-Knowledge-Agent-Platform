import uuid
from typing import Optional, List
from sqlalchemy import String, BigInteger, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimeStampedModel


class Document(TimeStampedModel):
    """
    Schema (matches Supabase SQL):
      - mime_type  (was file_type)
      - file_size  BIGINT
      - chunk_count INTEGER
      - error_message TEXT
      - status with CHECK constraint
    """
    __tablename__ = "documents"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)

    # New schema uses mime_type; expose file_type as alias for backward compat
    mime_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), default="uploaded", nullable=False, index=True
    )
    chunk_count: Mapped[int] = mapped_column(default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Backward-compat property: code that uses doc.file_type still works
    @property
    def file_type(self) -> Optional[str]:
        return self.mime_type

    # Relationships
    owner: Mapped[Optional["Profile"]] = relationship(
        "Profile",
        back_populates="documents",
        primaryjoin="foreign(Document.owner_id)==Profile.id",
    )
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
