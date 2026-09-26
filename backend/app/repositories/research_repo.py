import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.research import ResearchSession


class ResearchRepository:
    """
    Data access layer for research sessions.
    Strictly scopes every query and mutation to the authenticated owner_id.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_session(
        self,
        owner_id: uuid.UUID,
        query: str,
    ) -> ResearchSession:
        session = ResearchSession(
            id=uuid.uuid4(),
            owner_id=owner_id,
            query=query,
            status="pending",
            execution_log=[
                {
                    "agent": "System",
                    "status": "initialized",
                    "timestamp": datetime.utcnow().isoformat(),
                    "details": "Research session created"
                }
            ]
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session_by_id(
        self,
        session_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> Optional[ResearchSession]:
        return (
            self.db.query(ResearchSession)
            .filter(
                ResearchSession.id == session_id,
                ResearchSession.owner_id == owner_id,
            )
            .first()
        )

    def list_sessions(
        self,
        owner_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ResearchSession]:
        return (
            self.db.query(ResearchSession)
            .filter(ResearchSession.owner_id == owner_id)
            .order_by(desc(ResearchSession.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_status(
        self,
        session_id: uuid.UUID,
        owner_id: uuid.UUID,
        status: str,
        agent_name: Optional[str] = None,
        log_detail: Optional[str] = None,
    ) -> Optional[ResearchSession]:
        session = self.get_session_by_id(session_id, owner_id)
        if not session:
            return None

        session.status = status
        if agent_name:
            logs = list(session.execution_log or [])
            logs.append({
                "agent": agent_name,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                "details": log_detail or f"Agent {agent_name} {status}"
            })
            session.execution_log = logs

        self.db.commit()
        self.db.refresh(session)
        return session

    def update_session_artifacts(
        self,
        session_id: uuid.UUID,
        owner_id: uuid.UUID,
        plan: Optional[List[Dict[str, Any]]] = None,
        retrieved_sources: Optional[List[Dict[str, Any]]] = None,
        analysis: Optional[Dict[str, Any]] = None,
        verification: Optional[Dict[str, Any]] = None,
        final_report: Optional[Dict[str, Any]] = None,
        status: Optional[str] = None,
        failed_agent: Optional[str] = None,
        error_message: Optional[str] = None,
        log_entry: Optional[Dict[str, Any]] = None,
    ) -> Optional[ResearchSession]:
        session = self.get_session_by_id(session_id, owner_id)
        if not session:
            return None

        if plan is not None:
            session.plan = plan
        if retrieved_sources is not None:
            session.retrieved_sources = retrieved_sources
        if analysis is not None:
            session.analysis = analysis
        if verification is not None:
            session.verification = verification
        if final_report is not None:
            session.final_report = final_report
        if status is not None:
            session.status = status
        if failed_agent is not None:
            session.failed_agent = failed_agent
        if error_message is not None:
            session.error_message = error_message
        if log_entry is not None:
            logs = list(session.execution_log or [])
            logs.append(log_entry)
            session.execution_log = logs

        self.db.commit()
        self.db.refresh(session)
        return session

    def delete_session(
        self,
        session_id: uuid.UUID,
        owner_id: uuid.UUID,
    ) -> bool:
        session = self.get_session_by_id(session_id, owner_id)
        if not session:
            return False
        self.db.delete(session)
        self.db.commit()
        return True
