import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class MemoryType(str, Enum):
    PREFERENCE = "preference"
    GOAL = "goal"
    SKILL = "skill"
    PROJECT = "project"
    PERSONAL_CONTEXT = "personal_context"
    INSTRUCTION = "instruction"
    FACT = "fact"


class MemoryCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000, description="Durable memory content")
    memory_type: MemoryType = Field(default=MemoryType.FACT, description="Category of the memory")
    importance: float = Field(default=1.0, ge=0.1, le=5.0, description="Importance rating from 0.1 to 5.0")
    source_conversation_id: Optional[uuid.UUID] = None
    source_message_id: Optional[uuid.UUID] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MemoryUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    memory_type: Optional[MemoryType] = None
    importance: Optional[float] = Field(None, ge=0.1, le=5.0)
    metadata: Optional[Dict[str, Any]] = None


class MemoryResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    content: str
    memory_type: str
    importance: float
    source_conversation_id: Optional[uuid.UUID] = None
    source_message_id: Optional[uuid.UUID] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="metadata_json")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MemoryListResponse(BaseModel):
    items: List[MemoryResponse]
    total: int


class RetrievedMemory(BaseModel):
    id: uuid.UUID
    content: str
    memory_type: str
    similarity: float
    importance: float


class MemoryStatsResponse(BaseModel):
    total: int
    by_type: Dict[str, int]
