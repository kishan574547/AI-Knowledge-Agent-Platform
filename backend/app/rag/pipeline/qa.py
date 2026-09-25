import uuid
import logging
import time
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppSecurityException, ResourceNotFoundException, FileValidationException
from app.repositories.document_repo import DocumentRepository
from app.repositories.conversation_repo import ConversationRepository
from app.rag.embeddings import embedding_service
from app.rag.retrieval import VectorRetriever, RetrievedChunk
from app.rag.generation import gemini_client

logger = logging.getLogger("rag.pipeline.qa")


class SourceItem(BaseModel):
    document_id: uuid.UUID
    filename: str
    chunk_id: uuid.UUID
    chunk_index: int
    page: Optional[int] = None
    similarity: float


class RAGQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=settings.MAX_QUESTION_LENGTH)
    document_ids: Optional[List[uuid.UUID]] = Field(default=None, max_length=settings.MAX_RAG_DOCUMENT_IDS)
    conversation_id: Optional[uuid.UUID] = None


class RAGQueryResponse(BaseModel):
    answer: str
    sources: List[SourceItem]
    conversation_id: Optional[uuid.UUID] = None


class RAGQAPipeline:
    def __init__(self, db: Session):
        self.db = db
        self.doc_repo = DocumentRepository(db)
        self.conv_repo = ConversationRepository(db)
        self.retriever = VectorRetriever(db)

    def execute_query(
        self,
        question: str,
        owner_id: uuid.UUID,
        document_ids: Optional[List[uuid.UUID]] = None,
        conversation_id: Optional[uuid.UUID] = None,
    ) -> RAGQueryResponse:
        """
        Executes end-to-end RAG question answering:
        1. Validates inputs & document ownership
        2. Embeds question using local embedding model
        3. Retrieves user-scoped chunks from pgvector
        4. If no relevant chunks: returns safe no-result response
        5. Constructs context string within MAX_CONTEXT_CHARS
        6. Calls Gemini with grounded system prompt & prompt injection barriers
        7. Constructs DB-verified source metadata
        8. Records question/answer in conversation history
        """
        start_time = time.time()
        cleaned_question = question.strip()
        if not cleaned_question:
            raise FileValidationException("Question cannot be empty")

        if len(cleaned_question) > settings.MAX_QUESTION_LENGTH:
            raise FileValidationException(
                f"Question exceeds maximum allowed length of {settings.MAX_QUESTION_LENGTH} characters"
            )

        # 1. Document ownership verification if document_ids provided
        if document_ids:
            if len(document_ids) > settings.MAX_RAG_DOCUMENT_IDS:
                raise FileValidationException(
                    f"Too many document IDs specified (maximum {settings.MAX_RAG_DOCUMENT_IDS})"
                )
            for doc_id in document_ids:
                doc = self.doc_repo.get_by_id(document_id=doc_id, owner_id=owner_id)
                if not doc:
                    # Do not leak document existence
                    raise ResourceNotFoundException("One or more specified documents not found or access denied")

        # 2. Conversation ownership verification / creation if conversation_id provided
        active_conversation_id = None
        if conversation_id:
            conv = self.conv_repo.get_or_create(
                conversation_id=conversation_id,
                owner_id=owner_id,
                title=cleaned_question[:60],
            )
            active_conversation_id = conv.id

        # 3. Generate question embedding
        t_embed = time.time()
        query_vector = embedding_service.embed_query(cleaned_question)
        logger.info("Question embedded in %.3fs for user %s", time.time() - t_embed, str(owner_id))

        # 4. Retrieve user-scoped vector chunks
        t_ret = time.time()
        retrieved_chunks = self.retriever.search_similar_chunks(
            query_vector=query_vector,
            owner_id=owner_id,
            document_ids=document_ids,
            top_k=settings.RAG_TOP_K,
            similarity_threshold=settings.RAG_SIMILARITY_THRESHOLD,
        )
        logger.info(
            "Retrieved %d chunks in %.3fs (threshold: %.2f, top_k: %d)",
            len(retrieved_chunks),
            time.time() - t_ret,
            settings.RAG_SIMILARITY_THRESHOLD,
            settings.RAG_TOP_K,
        )

        # 5. Handle no relevant chunks
        if not retrieved_chunks:
            return RAGQueryResponse(
                answer="I couldn't find relevant information in your documents.",
                sources=[],
                conversation_id=active_conversation_id,
            )

        # 6. Build context string respecting MAX_CONTEXT_CHARS
        context_parts: List[str] = []
        sources: List[SourceItem] = []
        total_chars = 0

        for idx, chunk in enumerate(retrieved_chunks):
            chunk_header = f"[Source {idx + 1}] Document: {chunk.filename}"
            if chunk.page is not None:
                chunk_header += f" | Page: {chunk.page}"
            chunk_header += f" | Chunk: {chunk.chunk_index}"

            chunk_block = f"{chunk_header}\nContent:\n{chunk.content}\n"

            if total_chars + len(chunk_block) > settings.MAX_CONTEXT_CHARS:
                break

            context_parts.append(chunk_block)
            total_chars += len(chunk_block)

            sources.append(
                SourceItem(
                    document_id=chunk.document_id,
                    filename=chunk.filename,
                    chunk_id=chunk.chunk_id,
                    chunk_index=chunk.chunk_index,
                    page=chunk.page,
                    similarity=round(chunk.similarity, 4),
                )
            )

        full_context = "\n".join(context_parts)

        # 7. Generate grounded answer via Gemini
        t_gen = time.time()
        answer = gemini_client.generate_grounded_answer(
            question=cleaned_question,
            context_str=full_context,
        )
        logger.info("Gemini generated answer in %.2fs", time.time() - t_gen)

        # 8. Persist conversation history if requested
        if active_conversation_id:
            try:
                self.conv_repo.create_message(
                    conversation_id=active_conversation_id,
                    owner_id=owner_id,
                    role="user",
                    content=cleaned_question,
                )
                self.conv_repo.create_message(
                    conversation_id=active_conversation_id,
                    owner_id=owner_id,
                    role="assistant",
                    content=answer,
                )
            except Exception as e:
                logger.warning("Failed to persist conversation message: %s", str(e))

        logger.info("Total RAG Q&A pipeline duration: %.2fs", time.time() - start_time)
        return RAGQueryResponse(
            answer=answer,
            sources=sources,
            conversation_id=active_conversation_id,
        )
