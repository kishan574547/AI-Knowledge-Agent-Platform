import uuid
import logging
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, text, desc, or_
from app.models.memory import Memory
from app.schemas.memory import RetrievedMemory

logger = logging.getLogger("memory_repo")


def cosine_similarity_np(vec_a: List[float], vec_b: List[float]) -> float:
    """Fallback cosine similarity computation for tests / in-memory SQLite"""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class MemoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        owner_id: uuid.UUID,
        content: str,
        memory_type: str = "fact",
        embedding: Optional[List[float]] = None,
        importance: float = 1.0,
        source_conversation_id: Optional[uuid.UUID] = None,
        source_message_id: Optional[uuid.UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Memory:
        memory = Memory(
            owner_id=owner_id,
            content=content,
            memory_type=memory_type,
            embedding=embedding,
            importance=importance,
            source_conversation_id=source_conversation_id,
            source_message_id=source_message_id,
            metadata_json=metadata or {},
        )
        self.db.add(memory)
        self.db.commit()
        self.db.refresh(memory)
        return memory

    def get_by_id(self, memory_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[Memory]:
        stmt = select(Memory).where(
            Memory.id == memory_id,
            Memory.owner_id == owner_id,
        )
        return self.db.scalars(stmt).first()

    def list_by_owner(
        self,
        owner_id: uuid.UUID,
        memory_type: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Memory], int]:
        base_stmt = select(Memory).where(Memory.owner_id == owner_id)
        count_stmt = select(func.count(Memory.id)).where(Memory.owner_id == owner_id)

        if memory_type:
            base_stmt = base_stmt.where(Memory.memory_type == memory_type)
            count_stmt = count_stmt.where(Memory.memory_type == memory_type)

        if search_query:
            pattern = f"%{search_query}%"
            base_stmt = base_stmt.where(Memory.content.ilike(pattern))
            count_stmt = count_stmt.where(Memory.content.ilike(pattern))

        total = self.db.scalar(count_stmt) or 0

        stmt = (
            base_stmt.order_by(desc(Memory.importance), desc(Memory.created_at))
            .offset(skip)
            .limit(limit)
        )
        items = list(self.db.scalars(stmt).all())
        return items, total

    def get_stats_by_owner(self, owner_id: uuid.UUID) -> Dict[str, Any]:
        count_stmt = select(func.count(Memory.id)).where(Memory.owner_id == owner_id)
        total = self.db.scalar(count_stmt) or 0

        type_stmt = (
            select(Memory.memory_type, func.count(Memory.id))
            .where(Memory.owner_id == owner_id)
            .group_by(Memory.memory_type)
        )
        rows = self.db.execute(type_stmt).fetchall()
        by_type = {row[0]: row[1] for row in rows}

        return {"total": total, "by_type": by_type}

    def update(
        self,
        memory: Memory,
        content: Optional[str] = None,
        memory_type: Optional[str] = None,
        importance: Optional[float] = None,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Memory:
        if content is not None:
            memory.content = content
        if memory_type is not None:
            memory.memory_type = memory_type
        if importance is not None:
            memory.importance = importance
        if embedding is not None:
            memory.embedding = embedding
        if metadata is not None:
            memory.metadata_json = metadata

        self.db.commit()
        self.db.refresh(memory)
        return memory

    def delete(self, memory_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        memory = self.get_by_id(memory_id, owner_id)
        if not memory:
            return False
        self.db.delete(memory)
        self.db.commit()
        return True

    def search_similar_memories(
        self,
        owner_id: uuid.UUID,
        query_vector: List[float],
        top_k: int = 5,
        similarity_threshold: float = 0.35,
        memory_types: Optional[List[str]] = None,
    ) -> List[RetrievedMemory]:
        """
        Executes a strictly user-scoped vector similarity search against memories table.
        Enforces owner_id = :owner_id directly in SQL query.
        """
        bind = self.db.get_bind()
        is_postgres = bind.dialect.name == "postgresql"

        if is_postgres:
            vector_str = "[" + ",".join(str(f) for f in query_vector) + "]"
            type_filter_sql = ""
            params: Dict[str, Any] = {
                "owner_id": owner_id,
                "query_vector": vector_str,
                "top_k": top_k,
                "threshold": similarity_threshold,
            }

            if memory_types:
                type_filter_sql = "AND memory_type = ANY(:mem_types)"
                params["mem_types"] = memory_types

            sql = text(f"""
                SELECT 
                    id,
                    content,
                    memory_type,
                    importance,
                    (1 - (embedding <=> CAST(:query_vector AS vector))) AS similarity
                FROM memories
                WHERE owner_id = :owner_id
                  AND embedding IS NOT NULL
                  {type_filter_sql}
                  AND (1 - (embedding <=> CAST(:query_vector AS vector))) >= :threshold
                ORDER BY (similarity * (0.8 + (importance * 0.1))) DESC
                LIMIT :top_k
            """)

            result = self.db.execute(sql, params)
            rows = result.fetchall()

            memories: List[RetrievedMemory] = []
            for row in rows:
                memories.append(
                    RetrievedMemory(
                        id=row[0],
                        content=row[1],
                        memory_type=row[2],
                        importance=float(row[3]),
                        similarity=round(float(row[4]), 4),
                    )
                )
            return memories
        else:
            # Fallback for SQLite in-memory tests
            stmt = select(Memory).where(
                Memory.owner_id == owner_id,
                Memory.embedding.isnot(None),
            )
            if memory_types:
                stmt = stmt.where(Memory.memory_type.in_(memory_types))

            all_memories = list(self.db.scalars(stmt).all())
            scored: List[Tuple[Memory, float]] = []

            for mem in all_memories:
                raw_emb = mem.embedding
                if isinstance(raw_emb, list):
                    sim = cosine_similarity_np(query_vector, raw_emb)
                    if sim >= similarity_threshold:
                        # Rank by combination of similarity and importance
                        score = sim * (0.8 + (mem.importance * 0.1))
                        scored.append((mem, sim))

            scored.sort(key=lambda x: x[1] * (0.8 + (x[0].importance * 0.1)), reverse=True)
            top_matches = scored[:top_k]

            return [
                RetrievedMemory(
                    id=m.id,
                    content=m.content,
                    memory_type=m.memory_type,
                    importance=float(m.importance),
                    similarity=round(sim, 4),
                )
                for m, sim in top_matches
            ]
