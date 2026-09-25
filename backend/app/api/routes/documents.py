import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentDetailResponse,
)
from app.services.document_service import DocumentService
from app.repositories.document_repo import DocumentRepository
from app.services.storage_service import storage_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Uploads a document for the authenticated user:
    1. Validates MIME type, extension, magic byte signatures, and file size.
    2. Uploads file to private Supabase Storage bucket.
    3. Records metadata in PostgreSQL database.
    4. Queues chunking and embedding generation asynchronously in background tasks.
    """
    service = DocumentService(db)
    return await service.process_and_upload(
        file=file,
        owner_id=owner_id,
        background_tasks=background_tasks,
    )


@router.get("", response_model=DocumentListResponse)
def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Retrieves a paginated list of documents owned exclusively by the authenticated user.
    """
    service = DocumentService(db)
    items, total = service.list_documents(owner_id=owner_id, skip=skip, limit=limit)
    return DocumentListResponse(items=items, total=total)


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Retrieves document details owned by the authenticated user.
    Returns 404 if not found or if owned by another user.
    """
    service = DocumentService(db)
    doc = service.get_document(document_id=document_id, owner_id=owner_id)
    repo = DocumentRepository(db)
    chunks_count = repo.count_chunks(document_id=document_id, owner_id=owner_id)
    
    return DocumentDetailResponse(
        id=doc.id,
        owner_id=doc.owner_id,
        filename=doc.filename,
        storage_path=doc.storage_path,
        file_type=doc.file_type,
        file_size=doc.file_size,
        status=doc.status,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        chunks_count=chunks_count,
    )


@router.get("/{document_id}/download-url")
def get_document_download_url(
    document_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Generates a time-limited signed URL to download a document owned by the authenticated user.
    """
    service = DocumentService(db)
    download_url = service.get_download_url(document_id=document_id, owner_id=owner_id, expires_in=60)
    return {"download_url": download_url, "expires_in": 60}


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Deletes a document and its storage object owned by the authenticated user.
    """
    service = DocumentService(db)
    service.delete_document(document_id=document_id, owner_id=owner_id)
    return None

