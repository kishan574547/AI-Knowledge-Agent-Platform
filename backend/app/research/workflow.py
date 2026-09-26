import logging
import uuid
from typing import Any, Dict, Optional
from langgraph.graph import StateGraph, START, END
from sqlalchemy.orm import Session

from app.research.state import ResearchState
from app.research.agents.planner import plan_research
from app.research.agents.retriever import retrieve_research_sources
from app.research.agents.analyzer import analyze_evidence
from app.research.agents.verifier import verify_findings
from app.research.agents.writer import write_research_report
from app.repositories.research_repo import ResearchRepository

logger = logging.getLogger("rag_system.research.workflow")


def build_research_graph():
    """
    Constructs the LangGraph StateGraph for multi-agent research orchestration.
    Workflow:
      START -> Planner -> Retriever -> Analyzer -> Verifier -> Writer -> END
    """
    builder = StateGraph(ResearchState)

    # Node wrappers
    def planner_node(state: ResearchState) -> Dict[str, Any]:
        logger.info("Executing Planner Node")
        return plan_research(state)

    def retriever_node(state: ResearchState) -> Dict[str, Any]:
        logger.info("Executing Retriever Node")
        return retrieve_research_sources(state)

    def analyzer_node(state: ResearchState) -> Dict[str, Any]:
        logger.info("Executing Analyzer Node")
        return analyze_evidence(state)

    def verifier_node(state: ResearchState) -> Dict[str, Any]:
        logger.info("Executing Verifier Node")
        return verify_findings(state)

    def writer_node(state: ResearchState) -> Dict[str, Any]:
        logger.info("Executing Writer Node")
        return write_research_report(state)

    # Register nodes
    builder.add_node("planner", planner_node)
    builder.add_node("retriever", retriever_node)
    builder.add_node("analyzer", analyzer_node)
    builder.add_node("verifier", verifier_node)
    builder.add_node("writer", writer_node)

    # Define linear execution flow
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "retriever")
    builder.add_edge("retriever", "analyzer")
    builder.add_edge("analyzer", "verifier")
    builder.add_edge("verifier", "writer")
    builder.add_edge("writer", END)

    return builder.compile()


# Compiled singleton graph
research_app = build_research_graph()


class ResearchOrchestrator:
    """
    Coordinates execution of the multi-agent research graph and persists
    intermediate artifacts to the database for live UI updates.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = ResearchRepository(db)

    def run_research(
        self,
        session_id: uuid.UUID,
        owner_id: uuid.UUID,
        query: str,
    ) -> ResearchState:
        """
        Executes the 5-agent research pipeline step-by-step with state persistence.
        """
        logger.info(f"Starting Multi-Agent Research run for session {session_id} (owner={owner_id})")

        initial_state: ResearchState = {
            "session_id": str(session_id),
            "owner_id": str(owner_id),
            "query": query,
            "tasks": [],
            "sources": [],
            "facts": [],
            "inferences": [],
            "insufficient_info": [],
            "verified_claims": [],
            "agent_statuses": {
                "planner": "pending",
                "retriever": "pending",
                "analyzer": "pending",
                "verifier": "pending",
                "writer": "pending",
            },
            "execution_log": [],
        }

        current_state = dict(initial_state)

        # ── Step 1: Research Planner ──
        try:
            self._update_agent_progress(session_id, owner_id, "planner", "planning", "Generating research plan and search queries")
            planner_result = plan_research(current_state)
            current_state.update(planner_result)
            self.repo.update_session_artifacts(
                session_id=session_id,
                owner_id=owner_id,
                plan=current_state.get("tasks"),
                log_entry={"agent": "Research Planner", "status": "completed", "details": f"Generated {len(current_state.get('tasks', []))} tasks"}
            )
        except Exception as e:
            logger.error(f"Planner failed: {e}", exc_info=True)
            self._record_failure(session_id, owner_id, "Research Planner", str(e))
            current_state["failed_agent"] = "Research Planner"
            current_state["error"] = str(e)

        # ── Step 2: Retrieval Agent ──
        try:
            self._update_agent_progress(session_id, owner_id, "retriever", "retrieving", "Querying vector database and long-term memory")
            retriever_result = retrieve_research_sources(current_state, db=self.db)
            current_state.update(retriever_result)
            self.repo.update_session_artifacts(
                session_id=session_id,
                owner_id=owner_id,
                retrieved_sources=current_state.get("sources"),
                log_entry={"agent": "Retrieval Agent", "status": "completed", "details": f"Retrieved {len(current_state.get('sources', []))} sources"}
            )
        except Exception as e:
            logger.error(f"Retriever failed: {e}", exc_info=True)
            self._record_failure(session_id, owner_id, "Retrieval Agent", str(e))
            current_state["failed_agent"] = "Retrieval Agent"
            current_state["error"] = str(e)

        # ── Step 3: Analysis Agent ──
        try:
            self._update_agent_progress(session_id, owner_id, "analyzer", "analyzing", "Classifying evidence into Facts, Inferences, and Gaps")
            analyzer_result = analyze_evidence(current_state)
            current_state.update(analyzer_result)
            self.repo.update_session_artifacts(
                session_id=session_id,
                owner_id=owner_id,
                analysis={
                    "facts": current_state.get("facts", []),
                    "inferences": current_state.get("inferences", []),
                    "insufficient_info": current_state.get("insufficient_info", []),
                },
                log_entry={"agent": "Analysis Agent", "status": "completed", "details": f"Categorized {len(current_state.get('facts', []))} facts"}
            )
        except Exception as e:
            logger.error(f"Analyzer failed: {e}", exc_info=True)
            self._record_failure(session_id, owner_id, "Analysis Agent", str(e))
            current_state["failed_agent"] = "Analysis Agent"
            current_state["error"] = str(e)

        # ── Step 4: Verification Agent ──
        try:
            self._update_agent_progress(session_id, owner_id, "verifier", "verifying", "Checking factual groundness of claims against source text")
            verifier_result = verify_findings(current_state)
            current_state.update(verifier_result)
            self.repo.update_session_artifacts(
                session_id=session_id,
                owner_id=owner_id,
                verification={"verified_claims": current_state.get("verified_claims", [])},
                log_entry={"agent": "Verification Agent", "status": "completed", "details": f"Verified {len(current_state.get('verified_claims', []))} claims"}
            )
        except Exception as e:
            logger.error(f"Verifier failed: {e}", exc_info=True)
            self._record_failure(session_id, owner_id, "Verification Agent", str(e))
            current_state["failed_agent"] = "Verification Agent"
            current_state["error"] = str(e)

        # ── Step 5: Report Writer ──
        try:
            self._update_agent_progress(session_id, owner_id, "writer", "writing", "Compiling final structured research brief")
            writer_result = write_research_report(current_state)
            current_state.update(writer_result)
            self.repo.update_session_artifacts(
                session_id=session_id,
                owner_id=owner_id,
                final_report=current_state.get("final_report"),
                status="completed",
                log_entry={"agent": "Report Writer", "status": "completed", "details": "Final research report generated successfully"}
            )
        except Exception as e:
            logger.error(f"Writer failed: {e}", exc_info=True)
            self._record_failure(session_id, owner_id, "Report Writer", str(e))
            current_state["failed_agent"] = "Report Writer"
            current_state["error"] = str(e)

        logger.info(f"Multi-Agent Research pipeline finished for session {session_id}")
        return current_state

    def _update_agent_progress(self, session_id: uuid.UUID, owner_id: uuid.UUID, agent_key: str, status: str, details: str):
        self.repo.update_status(
            session_id=session_id,
            owner_id=owner_id,
            status=status,
            agent_name=agent_key.capitalize(),
            log_detail=details,
        )

    def _record_failure(self, session_id: uuid.UUID, owner_id: uuid.UUID, agent_name: str, error_msg: str):
        self.repo.update_session_artifacts(
            session_id=session_id,
            owner_id=owner_id,
            status="failed",
            failed_agent=agent_name,
            error_message=error_msg,
            log_entry={"agent": agent_name, "status": "failed", "details": error_msg}
        )
