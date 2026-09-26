"""
MCP Tool-Calling Agent API Routes.

Endpoints:
  POST /agent/chat        — New agent message
  POST /agent/confirm     — Confirm or cancel a pending WRITE action
  GET  /agent/tools       — List available tools

Security:
  - All routes require authentication
  - owner_id is always from the authenticated user (get_current_user_id)
  - Pending confirmations are stored server-side in memory cache (per session_id)
  - Session IDs are UUIDs generated server-side
"""
import uuid
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.agents.tool_calling_agent import ToolCallingAgent
from app.tools.registry import ToolRegistry
from app.schemas.agent import (
    AgentChatRequest,
    AgentChatResponse,
    ConfirmationRequest,
    AgentEventOut,
    ToolInfoOut,
)

router = APIRouter(prefix="/agent", tags=["MCP Tool-Calling Agent"])
logger = logging.getLogger("api.agent")

# In-process confirmation store: {session_id: {owner_id, pending_data}}
# Production: use Redis or database. For now, process-level store is safe
# because each pending is tied to the authenticated owner_id.
_pending_confirmations: Dict[str, Dict[str, Any]] = {}
_MAX_PENDING = 500  # Prevent unbounded growth


def _store_pending(session_id: str, owner_id: uuid.UUID, pending: Dict[str, Any]) -> None:
    global _pending_confirmations
    if len(_pending_confirmations) >= _MAX_PENDING:
        # Evict oldest half
        keys = list(_pending_confirmations.keys())
        for k in keys[:_MAX_PENDING // 2]:
            _pending_confirmations.pop(k, None)
    _pending_confirmations[session_id] = {
        "owner_id": str(owner_id),
        "pending": pending,
    }


def _pop_pending(session_id: str, owner_id: uuid.UUID) -> Dict[str, Any]:
    """Retrieves and removes a pending confirmation, verifying owner."""
    entry = _pending_confirmations.pop(session_id, None)
    if not entry:
        return None
    # Security: verify the same user is confirming
    if entry["owner_id"] != str(owner_id):
        logger.warning("Cross-user confirmation attempt: session %s, user %s", session_id, owner_id)
        return None
    return entry["pending"]


from app.repositories.conversation_repo import ConversationRepository

@router.post("/chat", response_model=AgentChatResponse, status_code=status.HTTP_200_OK)
def agent_chat(
    req: AgentChatRequest,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Send a message to the MCP Tool-Calling Agent.
    The agent decides whether to call tools or respond directly.
    If a WRITE tool is needed, returns requires_confirmation=True.
    Persists user & agent messages to the database.
    """
    logger.info("Agent chat from user %s: %s", owner_id, req.message[:80])

    conv_repo = ConversationRepository(db)
    conv_id = None
    if req.session_id:
        try:
            parsed_id = uuid.UUID(req.session_id)
            conv = conv_repo.get_or_create(
                conversation_id=parsed_id,
                owner_id=owner_id,
                title="New Conversation",
                conversation_type="mcp",
            )
            conv_id = conv.id
        except Exception:
            conv = conv_repo.create_conversation(owner_id=owner_id, title="New Conversation", conversation_type="mcp")
            conv_id = conv.id
    else:
        conv = conv_repo.create_conversation(owner_id=owner_id, title="New Conversation", conversation_type="mcp")
        conv_id = conv.id

    session_id = str(conv_id)

    # 1. Save user message
    conv_repo.create_message(
        conversation_id=conv_id,
        owner_id=owner_id,
        role="user",
        content=req.message,
    )

    # 2. Run agent
    agent = ToolCallingAgent(db=db, owner_id=owner_id)
    response = agent.chat(user_message=req.message)

    if response.requires_confirmation and response.pending_confirmation:
        _store_pending(
            session_id=session_id,
            owner_id=owner_id,
            pending=response.pending_confirmation,
        )

    events_out = [
        AgentEventOut(
            type=e.type.value,
            tool_name=e.tool_name,
            arguments=e.arguments,
            success=e.success,
            summary=e.summary,
            content=e.content,
        )
        for e in response.events
    ]

    # 3. Save assistant message with tool events
    conv_repo.create_message(
        conversation_id=conv_id,
        owner_id=owner_id,
        role="assistant",
        content=response.final_answer,
        events=[e.model_dump() for e in events_out],
    )

    return AgentChatResponse(
        answer=response.final_answer,
        events=events_out,
        requires_confirmation=response.requires_confirmation,
        pending_action=response.pending_confirmation.get("action") if response.pending_confirmation else None,
        session_id=session_id,
        tool_calls_made=response.tool_calls_made,
    )


@router.post("/confirm", response_model=AgentChatResponse, status_code=status.HTTP_200_OK)
def agent_confirm(
    req: ConfirmationRequest,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Confirm or cancel a pending WRITE tool action.
    The session_id must match a pending confirmation for this authenticated user.
    """
    pending = _pop_pending(session_id=req.session_id, owner_id=owner_id)

    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending confirmation not found or expired. Please retry your request.",
        )

    conv_repo = ConversationRepository(db)
    try:
        conv_id = uuid.UUID(req.session_id)
    except Exception:
        conv_id = None

    if not req.confirmed:
        if conv_id:
            conv_repo.create_message(
                conversation_id=conv_id,
                owner_id=owner_id,
                role="user",
                content="Cancelled action.",
            )
            conv_repo.create_message(
                conversation_id=conv_id,
                owner_id=owner_id,
                role="assistant",
                content="Action cancelled. No changes were made.",
            )
        return AgentChatResponse(
            answer="Action cancelled. No changes were made.",
            session_id=req.session_id,
        )

    if conv_id:
        conv_repo.create_message(
            conversation_id=conv_id,
            owner_id=owner_id,
            role="user",
            content=f"Confirmed action: {pending.get('action') or 'Tool execution'}",
        )

    agent = ToolCallingAgent(db=db, owner_id=owner_id)
    response = agent.confirm_and_execute(pending=pending, user_message="confirmed")

    events_out = [
        AgentEventOut(
            type=e.type.value,
            tool_name=e.tool_name,
            arguments=e.arguments,
            success=e.success,
            summary=e.summary,
            content=e.content,
        )
        for e in response.events
    ]

    if conv_id:
        conv_repo.create_message(
            conversation_id=conv_id,
            owner_id=owner_id,
            role="assistant",
            content=response.final_answer,
            events=[e.model_dump() for e in events_out],
        )

    return AgentChatResponse(
        answer=response.final_answer,
        events=events_out,
        session_id=req.session_id,
        tool_calls_made=response.tool_calls_made,
    )


@router.get("/tools", response_model=list[ToolInfoOut], status_code=status.HTTP_200_OK)
def list_tools(
    owner_id: uuid.UUID = Depends(get_current_user_id),
):
    """
    Lists all available MCP tools with their descriptions, permission levels, and schemas.
    """
    registry = ToolRegistry.get()
    return [
        ToolInfoOut(
            name=tool.schema.name,
            description=tool.schema.description,
            permission_level=tool.schema.permission_level.value,
            emoji=tool.schema.emoji,
            input_schema=tool.schema.input_schema,
        )
        for tool in registry.all_tools().values()
    ]
