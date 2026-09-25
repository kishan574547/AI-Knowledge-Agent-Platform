import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.message import MessageResponse


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = Field("New Conversation", max_length=255)


class ConversationResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    items: List[ConversationResponse]
    total: int
