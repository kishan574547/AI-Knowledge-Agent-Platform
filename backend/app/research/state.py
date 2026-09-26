from typing import Any, Dict, List, Optional, TypedDict


class ResearchTask(TypedDict):
    id: str
    description: str
    search_query: str
    rationale: Optional[str]


class ResearchSource(TypedDict):
    doc_id: str
    chunk_id: Optional[str]
    filename: str
    content: str
    similarity: float
    source_type: str  # "document" or "memory"
    page_number: Optional[int]


class AnalysisFact(TypedDict):
    statement: str
    source_citation: str
    doc_id: str
    confidence: float


class AnalysisInference(TypedDict):
    deduction: str
    premise_citations: List[str]
    confidence: float


class VerifiedClaim(TypedDict):
    claim: str
    status: str  # "VERIFIED" | "UNSUPPORTED"
    supporting_source_ids: List[str]
    notes: Optional[str]


class FinalReport(TypedDict):
    title: str
    research_question: str
    executive_summary: str
    key_findings: List[Dict[str, Any]]
    detailed_analysis: str
    verified_sources: List[Dict[str, Any]]
    limitations: List[str]
    markdown_content: str


class ResearchState(TypedDict, total=False):
    session_id: str
    owner_id: str
    query: str
    
    # Generated artifacts across agent nodes
    tasks: List[ResearchTask]
    sources: List[ResearchSource]
    facts: List[AnalysisFact]
    inferences: List[AnalysisInference]
    insufficient_info: List[str]
    verified_claims: List[VerifiedClaim]
    final_report: FinalReport
    
    # State tracking & observability
    current_step: str
    agent_statuses: Dict[str, str]  # agent_name -> "pending" | "running" | "completed" | "failed"
    error: Optional[str]
    failed_agent: Optional[str]
    execution_log: List[Dict[str, Any]]
