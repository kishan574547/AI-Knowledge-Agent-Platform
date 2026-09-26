import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class StartResearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000, description="The research question or topic")


class ResearchTaskSchema(BaseModel):
    id: str
    description: str
    search_query: str
    rationale: Optional[str] = None


class ResearchSourceSchema(BaseModel):
    doc_id: str
    chunk_id: Optional[str] = None
    filename: str
    content: str
    similarity: float
    source_type: str = "document"
    page_number: Optional[int] = None


class ResearchFactSchema(BaseModel):
    statement: str
    source_citation: str
    doc_id: str
    confidence: float


class ResearchInferenceSchema(BaseModel):
    deduction: str
    premise_citations: List[str]
    confidence: float


class VerifiedClaimSchema(BaseModel):
    claim: str
    status: str
    supporting_source_ids: List[str]
    notes: Optional[str] = None


class FinalReportSchema(BaseModel):
    title: str
    research_question: str
    executive_summary: str
    key_findings: List[Dict[str, Any]]
    detailed_analysis: str
    verified_sources: List[Dict[str, Any]]
    limitations: List[str]
    markdown_content: str


class ExecutionLogEntry(BaseModel):
    agent: str
    status: str
    timestamp: str
    details: Optional[str] = None


class ResearchSessionResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    query: str
    status: str
    plan: Optional[List[Dict[str, Any]]] = None
    retrieved_sources: Optional[List[Dict[str, Any]]] = None
    analysis: Optional[Dict[str, Any]] = None
    verification: Optional[Dict[str, Any]] = None
    final_report: Optional[Dict[str, Any]] = None
    failed_agent: Optional[str] = None
    error_message: Optional[str] = None
    execution_log: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResearchSessionListResponse(BaseModel):
    items: List[ResearchSessionResponse]
    total: int
