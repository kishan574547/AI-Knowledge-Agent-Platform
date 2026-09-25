import uuid
import logging
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.repositories.memory_repo import MemoryRepository
from app.schemas.memory import MemoryCreate, MemoryUpdate, RetrievedMemory
from app.models.memory import Memory
from app.rag.embeddings import embedding_service
from app.rag.memory.extractor import memory_extractor
from app.core.errors import ResourceNotFoundException, AppSecurityException

logger = logging.getLogger("memory_service")


class MemoryService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MemoryRepository(db)

    def create_memory(self, owner_id: uuid.UUID, data: MemoryCreate) -> Memory:
        """
        Creates a new memory for the authenticated user and computes its 384-dimensional vector embedding.
        """
        if not memory_extractor.is_safe_content(data.content):
            raise AppSecurityException("Memory content rejected by safety and prompt-injection filters.")

        # Generate embedding
        embedding = embedding_service.embed_query(data.content)

        return self.repo.create(
            owner_id=owner_id,
            content=data.content.strip(),
            memory_type=data.memory_type.value if hasattr(data.memory_type, "value") else str(data.memory_type),
            embedding=embedding,
            importance=data.importance,
            source_conversation_id=data.source_conversation_id,
            source_message_id=data.source_message_id,
            metadata=data.metadata,
        )

    def get_memory(self, memory_id: uuid.UUID, owner_id: uuid.UUID) -> Memory:
        memory = self.repo.get_by_id(memory_id, owner_id)
        if not memory:
            raise ResourceNotFoundException("Memory not found or access denied")
        return memory

    def list_memories(
        self,
        owner_id: uuid.UUID,
        memory_type: Optional[str] = None,
        search_query: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Memory], int]:
        q = search_query or search
        return self.repo.list_by_owner(
            owner_id=owner_id,
            memory_type=memory_type,
            search_query=q,
            skip=skip,
            limit=limit,
        )

    def get_stats(self, owner_id: uuid.UUID) -> Dict[str, Any]:
        return self.repo.get_stats_by_owner(owner_id)

    def update_memory(
        self,
        memory_id: uuid.UUID,
        owner_id: uuid.UUID,
        update_data: Optional[MemoryUpdate] = None,
        data: Optional[MemoryUpdate] = None,
    ) -> Memory:
        u_data = update_data or data
        if not u_data:
            raise ValueError("Update payload must be provided")

        memory = self.get_memory(memory_id, owner_id)

        new_embedding = None
        new_content = None
        if u_data.content is not None:
            new_content = u_data.content.strip()
            if not memory_extractor.is_safe_content(new_content):
                raise AppSecurityException("Updated memory content rejected by safety filters.")
            new_embedding = embedding_service.embed_query(new_content)

        memory_type_str = None
        if u_data.memory_type is not None:
            memory_type_str = (
                u_data.memory_type.value
                if hasattr(u_data.memory_type, "value")
                else str(u_data.memory_type)
            )

        return self.repo.update(
            memory=memory,
            content=new_content,
            memory_type=memory_type_str,
            importance=u_data.importance,
            embedding=new_embedding,
            metadata=u_data.metadata,
        )

    def delete_memory(self, memory_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        deleted = self.repo.delete(memory_id, owner_id)
        if not deleted:
            raise ResourceNotFoundException("Memory not found or access denied")
        return True

    def retrieve_relevant_memories(
        self,
        owner_id: uuid.UUID,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.35,
        threshold: Optional[float] = None,
    ) -> List[RetrievedMemory]:
        """
        Retrieves user-scoped memories relevant to the given query.
        """
        sim_th = threshold if threshold is not None else similarity_threshold
        query_vector = embedding_service.embed_query(query)
        return self.repo.search_similar_memories(
            owner_id=owner_id,
            query_vector=query_vector,
            top_k=top_k,
            similarity_threshold=sim_th,
        )

    def extract_and_save_from_text(
        self,
        owner_id: uuid.UUID,
        text: str,
        conversation_id: Optional[uuid.UUID] = None,
        message_id: Optional[uuid.UUID] = None,
    ) -> List[Memory]:
        """
        Extracts durable candidate memories and persists them if not already remembered.
        """
        candidates = memory_extractor.extract_from_text(text)
        saved_memories: List[Memory] = []

        for candidate in candidates:
            # Check for existing near-duplicate to avoid duplicate spam
            existing_similar = self.retrieve_relevant_memories(
                owner_id=owner_id,
                query=candidate["content"],
                top_k=1,
                similarity_threshold=0.88,
            )
            if existing_similar:
                logger.info("Skipped memory extraction: near-duplicate already exists (%s)", candidate["content"][:40])
                continue

            emb = embedding_service.embed_query(candidate["content"])
            mem = self.repo.create(
                owner_id=owner_id,
                content=candidate["content"],
                memory_type=candidate["memory_type"],
                embedding=emb,
                importance=candidate["importance"],
                source_conversation_id=conversation_id,
                source_message_id=message_id,
            )
            saved_memories.append(mem)
            logger.info("Extracted and saved new memory for user %s: [%s] %s", str(owner_id), mem.memory_type, mem.content[:50])

        return saved_memories
