import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, delete
from app.models.document import Document
from app.models.document_chunk import DocumentChunk


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        owner_id: uuid.UUID,
        filename: str,
        storage_path: str,
        file_type: str,
        file_size: int,
        status: str = "uploaded",
    ) -> Document:
        doc = Document(
            owner_id=owner_id,
            filename=filename,
            storage_path=storage_path,
            file_type=file_type,
            file_size=file_size,
            status=status,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def get_by_id(self, document_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[Document]:
        """
        Retrieves a document strictly scoped to the owner_id.
        """
        stmt = select(Document).where(
            Document.id == document_id,
            Document.owner_id == owner_id,
        )
        return self.db.scalars(stmt).first()

    def list_by_owner(
        self,
        owner_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Document], int]:
        """
        Lists documents owned by owner_id with pagination.
        """
        count_stmt = select(func.count(Document.id)).where(Document.owner_id == owner_id)
        total = self.db.scalar(count_stmt) or 0

        stmt = (
            select(Document)
            .where(Document.owner_id == owner_id)
            .order_by(Document.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(self.db.scalars(stmt).all())
        return items, total

    def delete(self, document_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        """
        Deletes a document strictly scoped to the owner_id.
        """
        doc = self.get_by_id(document_id=document_id, owner_id=owner_id)
        if not doc:
            return False
        self.db.delete(doc)
        self.db.commit()
        return True

    def count_chunks(self, document_id: uuid.UUID, owner_id: uuid.UUID) -> int:
        stmt = select(func.count(DocumentChunk.id)).where(
            DocumentChunk.document_id == document_id,
            DocumentChunk.owner_id == owner_id,
        )
        return self.db.scalar(stmt) or 0

    def get_chunks_by_document(
        self,
        document_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> List[DocumentChunk]:
        stmt = (
            select(DocumentChunk)
            .where(
                DocumentChunk.document_id == document_id,
                DocumentChunk.owner_id == owner_id,
            )
            .order_by(DocumentChunk.chunk_index.asc())
        )
        return list(self.db.scalars(stmt).all())

    def create_chunk(
        self,
        document_id: uuid.UUID,
        owner_id: uuid.UUID,
        chunk_index: int,
        content: str,
        embedding: Optional[List[float]] = None,
        chunk_metadata: Optional[dict] = None,
    ) -> DocumentChunk:
        meta = chunk_metadata or {}
        page_num = meta.get("page")
        chunk = DocumentChunk(
            document_id=document_id,
            owner_id=owner_id,
            chunk_index=chunk_index,
            content=content,
            page_number=int(page_num) if page_num is not None else None,
            embedding=embedding,
            chunk_metadata=meta,
        )
        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)
        return chunk
