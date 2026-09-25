import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.conversation import Conversation
from app.models.message import Message


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_conversation(self, owner_id: uuid.UUID, title: str = "New Conversation") -> Conversation:
        conv = Conversation(owner_id=owner_id, title=title)
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def get_by_id(self, conversation_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[Conversation]:
        stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.owner_id == owner_id,
        )
        return self.db.scalars(stmt).first()

    def get_or_create(
        self,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
        title: str = "New Conversation",
    ) -> Conversation:
        # Check if conversation already exists by ID
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        existing = self.db.scalars(stmt).first()
        if existing:
            if existing.owner_id != owner_id:
                from app.core.errors import AppSecurityException
                raise AppSecurityException("Conversation access denied")
            return existing

        # Create new conversation with the client-provided UUID
        conv = Conversation(id=conversation_id, owner_id=owner_id, title=title)
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def list_by_owner(
        self,
        owner_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Conversation], int]:
        count_stmt = select(func.count(Conversation.id)).where(Conversation.owner_id == owner_id)
        total = self.db.scalar(count_stmt) or 0

        stmt = (
            select(Conversation)
            .where(Conversation.owner_id == owner_id)
            .order_by(Conversation.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all()), total

    def delete(self, conversation_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        conv = self.get_by_id(conversation_id, owner_id)
        if not conv:
            return False
        self.db.delete(conv)
        self.db.commit()
        return True

    def create_message(
        self,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
        role: str,
        content: str,
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            owner_id=owner_id,
            role=role,
            content=content,
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def get_messages(
        self,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> List[Message]:
        stmt = (
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.owner_id == owner_id,
            )
            .order_by(Message.created_at.asc())
        )
        return list(self.db.scalars(stmt).all())
