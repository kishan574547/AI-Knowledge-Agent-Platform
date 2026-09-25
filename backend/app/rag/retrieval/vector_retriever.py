import uuid
import logging
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.core.config import settings

logger = logging.getLogger("rag.retrieval")


class RetrievedChunk(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    page: Optional[int] = None
    content: str
    similarity: float


def cosine_similarity_np(vec_a: List[float], vec_b: List[float]) -> float:
    """Fallback cosine similarity computation for tests / in-memory SQLite"""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class VectorRetriever:
    def __init__(self, db: Session):
        self.db = db

    def search_similar_chunks(
        self,
        query_vector: List[float],
        owner_id: uuid.UUID,
        document_ids: Optional[List[uuid.UUID]] = None,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None,
    ) -> List[RetrievedChunk]:
        """
        Executes a user-scoped vector similarity search against pgvector.
        Enforces owner_id = authenticated_user_id directly in the database query.
        """
        k = top_k or settings.RAG_TOP_K
        threshold = similarity_threshold if similarity_threshold is not None else settings.RAG_SIMILARITY_THRESHOLD

        bind = self.db.get_bind()
        is_postgres = bind.dialect.name == "postgresql"

        if is_postgres:
            # Native PostgreSQL pgvector cosine similarity search
            # Cosine distance operator is <=> (0 = identical, 2 = opposite)
            # Cosine similarity = 1 - (embedding <=> query_vector)
            vector_str = "[" + ",".join(str(f) for f in query_vector) + "]"

            doc_filter_sql = ""
            params = {
                "owner_id": owner_id,
                "query_vector": vector_str,
                "top_k": k,
                "threshold": threshold,
            }

            if document_ids:
                doc_filter_sql = "AND c.document_id = ANY(:doc_ids)"
                params["doc_ids"] = [d for d in document_ids]

            sql = text(f"""
                SELECT 
                    c.id AS chunk_id,
                    c.document_id AS document_id,
                    d.filename AS filename,
                    c.chunk_index AS chunk_index,
                    c.page_number AS page,
                    c.content AS content,
                    (1 - (c.embedding <=> CAST(:query_vector AS vector))) AS similarity
                FROM document_chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE c.owner_id = :owner_id
                  AND d.owner_id = :owner_id
                  {doc_filter_sql}
                  AND c.embedding IS NOT NULL
                  AND (1 - (c.embedding <=> CAST(:query_vector AS vector))) >= :threshold
                ORDER BY similarity DESC
                LIMIT :top_k
            """)

            result = self.db.execute(sql, params)
            rows = result.fetchall()

            retrieved: List[RetrievedChunk] = []
            for row in rows:
                retrieved.append(
                    RetrievedChunk(
                        chunk_id=row.chunk_id,
                        document_id=row.document_id,
                        filename=row.filename,
                        chunk_index=row.chunk_index,
                        page=row.page,
                        content=row.content,
                        similarity=float(row.similarity),
                    )
                )
            return retrieved

        else:
            # SQLite / Test Harness Fallback
            stmt = (
                select(DocumentChunk, Document.filename)
                .join(Document, Document.id == DocumentChunk.document_id)
                .where(
                    DocumentChunk.owner_id == owner_id,
                    Document.owner_id == owner_id,
                )
            )
            if document_ids:
                stmt = stmt.where(DocumentChunk.document_id.in_(document_ids))

            rows = self.db.execute(stmt).all()
            scored: List[RetrievedChunk] = []

            for chunk, filename in rows:
                if chunk.embedding is not None:
                    sim = cosine_similarity_np(query_vector, chunk.embedding)
                    if sim >= threshold:
                        page = chunk.chunk_metadata.get("page") if chunk.chunk_metadata else None
                        scored.append(
                            RetrievedChunk(
                                chunk_id=chunk.id,
                                document_id=chunk.document_id,
                                filename=filename,
                                chunk_index=chunk.chunk_index,
                                page=int(page) if page is not None else None,
                                content=chunk.content,
                                similarity=float(sim),
                            )
                        )

            scored.sort(key=lambda x: x.similarity, reverse=True)
            return scored[:k]
