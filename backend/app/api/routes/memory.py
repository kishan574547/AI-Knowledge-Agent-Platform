import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemoryListResponse,
    MemoryStatsResponse,
    RetrievedMemory,
    MemoryType,
)
from app.services.memory_service import MemoryService
from app.rag.memory.extractor import MemoryCandidate

router = APIRouter(prefix="/memory", tags=["Long-Term Memory"])


@router.get("", response_model=MemoryListResponse, status_code=status.HTTP_200_OK)
def list_memories(
    memory_type: Optional[MemoryType] = Query(default=None, description="Filter by category"),
    search: Optional[str] = Query(default=None, description="Keyword search in memory content"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    List long-term memories for the authenticated user with optional category filter and search.
    """
    service = MemoryService(db)
    memories, total = service.list_memories(
        owner_id=owner_id,
        memory_type=memory_type.value if memory_type else None,
        search_query=search,
        skip=skip,
        limit=limit,
    )
    return MemoryListResponse(
        items=[MemoryResponse.model_validate(m) for m in memories],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/stats", response_model=MemoryStatsResponse, status_code=status.HTTP_200_OK)
def get_memory_stats(
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Get summary statistics and category breakdown of stored memories for the authenticated user.
    """
    service = MemoryService(db)
    return service.get_stats(owner_id=owner_id)


@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    req: MemoryCreate,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Manually create a long-term memory for the authenticated user.
    Automatically generates embedding vector and stores in pgvector.
    """
    service = MemoryService(db)
    memory = service.create_memory(owner_id=owner_id, data=req)
    return MemoryResponse.model_validate(memory)


@router.post("/extract", response_model=List[MemoryResponse], status_code=status.HTTP_200_OK)
def extract_memories(
    text: str = Query(..., min_length=1, max_length=5000),
    save: bool = Query(default=True, description="Whether to automatically persist extracted memories"),
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Analyze text snippet, conservatively extract key user facts/preferences/goals, and optionally save them.
    """
    service = MemoryService(db)
    if save:
        created = service.extract_and_save_from_text(owner_id=owner_id, text=text)
        return [MemoryResponse.model_validate(m) for m in created]
    else:
        candidates = service.extract_candidates(text)
        # return dummy responses or empty
        return []


@router.get("/{memory_id}", response_model=MemoryResponse, status_code=status.HTTP_200_OK)
def get_memory(
    memory_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific memory by ID. Strictly scoped to authenticated owner.
    """
    service = MemoryService(db)
    memory = service.get_memory(memory_id=memory_id, owner_id=owner_id)
    return MemoryResponse.model_validate(memory)


@router.patch("/{memory_id}", response_model=MemoryResponse, status_code=status.HTTP_200_OK)
def update_memory(
    memory_id: uuid.UUID,
    req: MemoryUpdate,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update memory content, type, or importance. Updates embedding if content changes.
    """
    service = MemoryService(db)
    memory = service.update_memory(memory_id=memory_id, owner_id=owner_id, data=req)
    return MemoryResponse.model_validate(memory)


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(
    memory_id: uuid.UUID,
    owner_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Permanently delete a memory. Strictly scoped to authenticated owner.
    """
    service = MemoryService(db)
    service.delete_memory(memory_id=memory_id, owner_id=owner_id)
    return None
