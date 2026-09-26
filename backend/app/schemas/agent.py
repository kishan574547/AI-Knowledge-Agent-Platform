import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None  # optional conversation continuity key


class ConfirmationRequest(BaseModel):
    session_id: str = Field(..., description="Session ID returned from previous requires_confirmation response")
    confirmed: bool = Field(..., description="True = proceed, False = cancel")


class AgentEventOut(BaseModel):
    type: str
    tool_name: Optional[str] = None
    arguments: Optional[Dict[str, Any]] = None
    success: Optional[bool] = None
    summary: Optional[str] = None
    content: Optional[Any] = None


class AgentChatResponse(BaseModel):
    answer: str
    events: List[AgentEventOut] = []
    requires_confirmation: bool = False
    pending_action: Optional[str] = None   # human-readable description
    session_id: Optional[str] = None       # for confirmation flow
    tool_calls_made: int = 0


class ToolInfoOut(BaseModel):
    name: str
    description: str
    permission_level: str
    emoji: str
    input_schema: Dict[str, Any]


class ToolExecutionLogOut(BaseModel):
    tool_name: str
    success: bool
    summary: Optional[str] = None
    duration_ms: float
