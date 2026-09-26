import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.repositories.research_repo import ResearchRepository
from app.research.workflow import ResearchOrchestrator
from app.schemas.research import (
    StartResearchRequest,
    ResearchSessionResponse,
    ResearchSessionListResponse,
)

logger = logging.getLogger("rag_system.api.research")

router = APIRouter(prefix="/research", tags=["Multi-Agent Research"])


@router.post(
    "/start",
    response_model=ResearchSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a Multi-Agent Research workflow",
)
def start_research_session(
    payload: StartResearchRequest,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Initiates a 5-agent research pipeline:
    1. Research Planner -> breaks down problem into sub-tasks
    2. Retrieval Agent -> fetches semantic document chunks & long-term memories
    3. Analysis Agent -> separates FACTS, INFERENCES, and INSUFFICIENT INFO
    4. Verification Agent -> checks factual groundness of claims
    5. Report Writer -> synthesizes authoritative structured brief
    """
    query_text = payload.query.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Research query cannot be empty",
        )

    repo = ResearchRepository(db)
    session = repo.create_session(owner_id=current_user_id, query=query_text)

    # Run the orchestrator
    orchestrator = ResearchOrchestrator(db)
    try:
        orchestrator.run_research(
            session_id=session.id,
            owner_id=current_user_id,
            query=query_text,
        )
        db.refresh(session)
        return session
    except Exception as e:
        logger.error(f"Error during research execution for session {session.id}: {e}", exc_info=True)
        repo.update_session_artifacts(
            session_id=session.id,
            owner_id=current_user_id,
            status="failed",
            error_message=str(e),
            log_entry={"agent": "Orchestrator", "status": "failed", "details": str(e)}
        )
        db.refresh(session)
        return session


@router.get(
    "/sessions",
    response_model=ResearchSessionListResponse,
    summary="List past research sessions",
)
def list_research_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """List research sessions owned by the authenticated user."""
    repo = ResearchRepository(db)
    sessions = repo.list_sessions(owner_id=current_user_id, skip=skip, limit=limit)
    return ResearchSessionListResponse(items=sessions, total=len(sessions))


@router.get(
    "/sessions/{session_id}",
    response_model=ResearchSessionResponse,
    summary="Get research session details",
)
def get_research_session(
    session_id: uuid.UUID,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Retrieve full research session including plan, sources, analysis, verification, and report."""
    repo = ResearchRepository(db)
    session = repo.get_session_by_id(session_id=session_id, owner_id=current_user_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found or access denied",
        )
    return session


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a research session",
)
def delete_research_session(
    session_id: uuid.UUID,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a research session."""
    repo = ResearchRepository(db)
    deleted = repo.delete_session(session_id=session_id, owner_id=current_user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found or access denied",
        )
    return None
