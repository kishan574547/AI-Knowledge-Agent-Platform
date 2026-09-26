import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    conversation_type: str = Field("rag", description="'rag' | 'mcp' | 'multi_agent'")


class ConversationUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    events: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    conversation_type: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []


class ConversationListResponse(BaseModel):
    items: List[ConversationResponse]
    total: int
