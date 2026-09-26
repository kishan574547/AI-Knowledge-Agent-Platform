import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.repositories.conversation_repo import ConversationRepository
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationUpdateRequest,
    ConversationResponse,
    ConversationDetailResponse,
    ConversationListResponse,
    MessageResponse,
)

logger = logging.getLogger("rag_system.api.conversations")

router = APIRouter(prefix="/conversations", tags=["Conversations & History"])


@router.get(
    "",
    response_model=ConversationListResponse,
    summary="List conversations for authenticated user",
)
def list_conversations(
    conversation_type: Optional[str] = Query(None, description="'rag' | 'mcp' | 'multi_agent'"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Lists conversations owned by the user, optionally filtered by conversation_type."""
    repo = ConversationRepository(db)
    items, total = repo.list_by_owner(
        owner_id=current_user_id,
        conversation_type=conversation_type,
        skip=skip,
        limit=limit,
    )
    return ConversationListResponse(items=items, total=total)


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
)
def create_conversation(
    payload: ConversationCreateRequest,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Creates a fresh conversation for the user."""
    repo = ConversationRepository(db)
    conv = repo.create_conversation(
        owner_id=current_user_id,
        title=payload.title or "New Conversation",
        conversation_type=payload.conversation_type,
    )
    return conv


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get conversation and all its messages",
)
def get_conversation(
    conversation_id: uuid.UUID,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Retrieves conversation details and messages, strictly verifying owner_id."""
    repo = ConversationRepository(db)
    conv = repo.get_by_id(conversation_id=conversation_id, owner_id=current_user_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied",
        )
    messages = repo.get_messages(conversation_id=conversation_id, owner_id=current_user_id)
    return ConversationDetailResponse(
        id=conv.id,
        owner_id=conv.owner_id,
        title=conv.title,
        conversation_type=conv.conversation_type,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=messages,
    )


@router.patch(
    "/{conversation_id}",
    response_model=ConversationResponse,
    summary="Rename a conversation",
)
def update_conversation(
    conversation_id: uuid.UUID,
    payload: ConversationUpdateRequest,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Renames a conversation owned by the authenticated user."""
    repo = ConversationRepository(db)
    updated = repo.update_title(
        conversation_id=conversation_id,
        owner_id=current_user_id,
        title=payload.title,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied",
        )
    return updated


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
)
def delete_conversation(
    conversation_id: uuid.UUID,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Deletes a conversation and all its messages."""
    repo = ConversationRepository(db)
    deleted = repo.delete(conversation_id=conversation_id, owner_id=current_user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied",
        )
    return None


@router.get(
    "/{conversation_id}/messages",
    response_model=List[MessageResponse],
    summary="Get all messages in a conversation",
)
def get_conversation_messages(
    conversation_id: uuid.UUID,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Retrieves all messages in a conversation in chronological order."""
    repo = ConversationRepository(db)
    conv = repo.get_by_id(conversation_id=conversation_id, owner_id=current_user_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied",
        )
    return repo.get_messages(conversation_id=conversation_id, owner_id=current_user_id)
