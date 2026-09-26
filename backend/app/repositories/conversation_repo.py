import uuid
import re
from datetime import datetime, timezone, date
from typing import Optional, List, Tuple, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
from app.models.conversation import Conversation
from app.models.message import Message


def _make_json_serializable(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, dict):
        return {str(k): _make_json_serializable(v) for k, v in val.items()}
    if isinstance(val, (list, tuple, set)):
        return [_make_json_serializable(item) for item in val]
    if hasattr(val, "model_dump"):
        return _make_json_serializable(val.model_dump(mode="json"))
    if hasattr(val, "dict"):
        return _make_json_serializable(val.dict())
    return val


def generate_title_from_text(text: str, max_length: int = 40) -> str:
    """Generates a clean, short deterministic title from the user's first query."""
    if not text:
        return "New Conversation"
    cleaned = re.sub(r"\s+", " ", text).strip()
    # Remove leading common prefixes
    for prefix in ["what is ", "explain ", "how to ", "search for ", "find ", "tell me about ", "can you "]:
        if cleaned.lower().startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
            break
    if len(cleaned) <= max_length:
        return cleaned.capitalize()
    # Cut at nearest word boundary
    truncated = cleaned[:max_length].rsplit(" ", 1)[0]
    return (truncated.strip() + "...").capitalize()


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_conversation(
        self,
        owner_id: uuid.UUID,
        title: str = "New Conversation",
        conversation_type: str = "rag",
    ) -> Conversation:
        conv = Conversation(
            id=uuid.uuid4(),
            owner_id=owner_id,
            title=title,
            conversation_type=conversation_type,
        )
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
        conversation_type: str = "rag",
    ) -> Conversation:
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        existing = self.db.scalars(stmt).first()
        if existing:
            if existing.owner_id != owner_id:
                from app.core.errors import AppSecurityException
                raise AppSecurityException("Conversation access denied")
            return existing

        conv = Conversation(
            id=conversation_id,
            owner_id=owner_id,
            title=title,
            conversation_type=conversation_type,
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def list_by_owner(
        self,
        owner_id: uuid.UUID,
        conversation_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Conversation], int]:
        filters = [Conversation.owner_id == owner_id]
        if conversation_type:
            filters.append(Conversation.conversation_type == conversation_type)

        count_stmt = select(func.count(Conversation.id)).where(*filters)
        total = self.db.scalar(count_stmt) or 0

        stmt = (
            select(Conversation)
            .where(*filters)
            .order_by(desc(Conversation.updated_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all()), total

    def update_title(
        self,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
        title: str,
    ) -> Optional[Conversation]:
        conv = self.get_by_id(conversation_id, owner_id)
        if not conv:
            return None
        conv.title = title.strip() or "Untitled Conversation"
        self.db.commit()
        self.db.refresh(conv)
        return conv

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
        sources: Optional[Any] = None,
        events: Optional[Any] = None,
    ) -> Message:
        msg = Message(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            owner_id=owner_id,
            role=role,
            content=content,
            sources=_make_json_serializable(sources) or [],
            events=_make_json_serializable(events) or [],
        )
        self.db.add(msg)
        
        # Touch conversation updated_at
        conv = self.db.get(Conversation, conversation_id)
        if conv and conv.owner_id == owner_id:
            # If title is default, update with generated title from first user message
            if conv.title in ("New Conversation", "Untitled Conversation") and role == "user":
                conv.title = generate_title_from_text(content)
            conv.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(msg)
        return msg

    def get_messages(
        self,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> List[Message]:
        # Verify conversation belongs to owner
        conv = self.get_by_id(conversation_id, owner_id)
        if not conv:
            return []

        stmt = (
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.owner_id == owner_id,
            )
            .order_by(Message.created_at.asc())
        )
        return list(self.db.scalars(stmt).all())
