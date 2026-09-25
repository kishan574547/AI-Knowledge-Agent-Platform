import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    filename: str
    storage_path: str
    # The DB column is mime_type; expose as file_type for frontend compatibility
    file_type: Optional[str] = Field(None, alias="mime_type")
    file_size: Optional[int] = None
    status: str
    chunk_count: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int


class DocumentChunkResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    owner_id: uuid.UUID
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    chunk_metadata: Dict[str, Any] = Field(default_factory=dict, alias="chunk_metadata")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DocumentDetailResponse(DocumentResponse):
    chunks_count: int = 0
