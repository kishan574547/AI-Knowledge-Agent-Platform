import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.rag.pipeline.qa import (
    RAGQAPipeline,
    RAGQueryRequest,
    RAGQueryResponse,
)

router = APIRouter(prefix="/rag", tags=["RAG Document Q&A"])


@router.post("/query", response_model=RAGQueryResponse, status_code=status.HTTP_200_OK)
def query_documents(
    req: RAGQueryRequest,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Executes a grounded question-answering query against the authenticated user's documents:
    1. Embeds question using local embedding model
    2. Retrieves user-scoped top-K chunks from PostgreSQL pgvector
    3. Builds grounded context and queries Google Gemini
    4. Returns grounded answer with verified database document sources
    """
    pipeline = RAGQAPipeline(db)
    return pipeline.execute_query(
        question=req.question,
        owner_id=owner_id,
        document_ids=req.document_ids,
        conversation_id=req.conversation_id,
    )
