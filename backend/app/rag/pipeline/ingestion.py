import uuid
import logging
import time
from typing import Optional
from sqlalchemy.orm import Session
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.rag.extractors import get_extractor
from app.rag.chunking import TextChunker
from app.rag.embeddings import embedding_service
from app.repositories.document_repo import DocumentRepository

logger = logging.getLogger("rag.pipeline.ingestion")


class DocumentIngestionPipeline:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DocumentRepository(db)
        self.chunker = TextChunker()

    def process_document(
        self,
        document_id: uuid.UUID,
        owner_id: uuid.UUID,
        file_bytes: bytes,
    ) -> bool:
        """
        Executes complete ingestion pipeline:
        1. Transitions document status to 'processing'
        2. Extracts text & page structure
        3. Cleans and chunks text
        4. Generates local 384-dim embeddings
        5. Persists chunks to PostgreSQL pgvector
        6. Transitions document status to 'ready' (or 'failed' on error)
        """
        doc = self.repo.get_by_id(document_id=document_id, owner_id=owner_id)
        if not doc:
            logger.error("Ingestion failed: Document %s not found for owner %s", str(document_id), str(owner_id))
            return False

        start_time = time.time()
        logger.info("Starting ingestion for document %s (%s)", str(doc.id), doc.filename)

        try:
            # 1. Update status to processing
            doc.status = "processing"
            self.db.commit()

            # 2. Extract content
            extractor = get_extractor(doc.filename)
            extracted = extractor.extract(file_bytes=file_bytes, filename=doc.filename)

            if not extracted.text or not extracted.text.strip():
                logger.warning("No text extracted from document %s", str(doc.id))
                doc.status = "failed"
                self.db.commit()
                return False

            # 3. Chunk content
            chunks = self.chunker.chunk_document(extracted, filename=doc.filename)
            if not chunks:
                logger.warning("Chunking yielded 0 chunks for document %s", str(doc.id))
                doc.status = "failed"
                self.db.commit()
                return False

            chunk_texts = [c.content for c in chunks]

            # 4. Generate local embeddings
            t_emb = time.time()
            embeddings = embedding_service.embed_documents(chunk_texts)
            logger.info(
                "Generated %d embeddings for doc %s in %.2fs",
                len(embeddings),
                str(doc.id),
                time.time() - t_emb,
            )

            # 5. Persist chunks in DB with owner_id
            for chunk_item, emb in zip(chunks, embeddings):
                meta = {
                    "filename": doc.filename,
                    "page": chunk_item.page,
                    "char_count": chunk_item.char_count,
                    "word_count": chunk_item.word_count,
                }
                self.repo.create_chunk(
                    document_id=doc.id,
                    owner_id=owner_id,
                    chunk_index=chunk_item.chunk_index,
                    content=chunk_item.content,
                    embedding=emb,
                    chunk_metadata=meta,
                )

            # 6. Mark document as ready and record chunk count
            doc.status = "ready"
            doc.chunk_count = len(chunks)
            self.db.commit()

            total_duration = time.time() - start_time
            logger.info(
                "Document %s ingestion completed successfully (%d chunks, total time: %.2fs)",
                str(doc.id),
                len(chunks),
                total_duration,
            )
            return True

        except Exception as e:
            logger.error(
                "Ingestion error for document %s: %s",
                str(document_id),
                type(e).__name__,
            )
            self.db.rollback()
            try:
                # Attempt to mark status as failed
                failed_doc = self.repo.get_by_id(document_id=document_id, owner_id=owner_id)
                if failed_doc:
                    failed_doc.status = "failed"
                    self.db.commit()
            except Exception:
                pass
            return False
