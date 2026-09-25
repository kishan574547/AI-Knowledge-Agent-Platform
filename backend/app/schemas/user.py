import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: Optional[str] = None
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
