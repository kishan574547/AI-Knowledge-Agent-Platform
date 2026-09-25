import logging
import uuid
from typing import Tuple, List, Optional
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from app.repositories.document_repo import DocumentRepository
from app.services.storage_service import storage_service
from app.utils.file_validation import validate_uploaded_file
from app.models.document import Document
from app.core.errors import ResourceNotFoundException, AppSecurityException

logger = logging.getLogger("document_service")


def run_background_ingestion(doc_id: uuid.UUID, owner_id: uuid.UUID, file_bytes: bytes):
    from app.database.session import SessionLocal
    from app.rag.pipeline.ingestion import DocumentIngestionPipeline

    db = SessionLocal()
    try:
        pipeline = DocumentIngestionPipeline(db)
        pipeline.process_document(
            document_id=doc_id,
            owner_id=owner_id,
            file_bytes=file_bytes,
        )
    except Exception as e:
        logger.error("Background ingestion failed for document %s: %s", str(doc_id), str(e))
    finally:
        db.close()


class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DocumentRepository(db)

    async def process_and_upload(
        self,
        file: UploadFile,
        owner_id: uuid.UUID,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> Document:
        """
        Validates file, uploads to private storage, and saves document record.
        Runs heavy chunking and embedding generation asynchronously in background tasks.
        """
        # Validate file
        content, safe_filename, mime_type, file_size = await validate_uploaded_file(file)

        # Generate unique document ID upfront for storage path
        doc_id = uuid.uuid4()
        storage_path = storage_service.get_storage_path(owner_id, doc_id, safe_filename)

        # Upload to Storage
        storage_service.upload_file(
            storage_path=storage_path,
            file_bytes=content,
            content_type=mime_type,
        )

        # Save initial document record to DB with status 'processing'
        doc = Document(
            id=doc_id,
            owner_id=owner_id,
            filename=safe_filename,
            storage_path=storage_path,
            mime_type=mime_type,
            file_size=file_size,
            status="processing",
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)

        if background_tasks:
            background_tasks.add_task(run_background_ingestion, doc_id, owner_id, content)
            logger.info("Queued background ingestion for document %s (%s)", str(doc.id), doc.filename)
        else:
            run_background_ingestion(doc_id, owner_id, content)
            self.db.refresh(doc)

        return doc


    def list_documents(
        self,
        owner_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Document], int]:
        return self.repo.list_by_owner(owner_id=owner_id, skip=skip, limit=limit)

    def get_document(self, document_id: uuid.UUID, owner_id: uuid.UUID) -> Document:
        doc = self.repo.get_by_id(document_id=document_id, owner_id=owner_id)
        if not doc:
            raise ResourceNotFoundException("Document not found or access denied")
        return doc

    def delete_document(self, document_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        doc = self.get_document(document_id=document_id, owner_id=owner_id)
        storage_path = doc.storage_path

        # Delete from DB
        deleted = self.repo.delete(document_id=document_id, owner_id=owner_id)
        if deleted and storage_path:
            storage_service.delete_file(storage_path)

        return deleted

    def get_download_url(self, document_id: uuid.UUID, owner_id: uuid.UUID, expires_in: int = 60) -> str:
        """
        Generates a short-lived signed URL for downloading a document after strictly verifying ownership.
        """
        doc = self.get_document(document_id=document_id, owner_id=owner_id)
        signed_url = storage_service.create_signed_url(doc.storage_path, expires_in=expires_in)
        if not signed_url:
            raise ResourceNotFoundException("Could not generate download URL for document")
        return signed_url

