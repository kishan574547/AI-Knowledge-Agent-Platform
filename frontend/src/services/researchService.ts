import { apiRequest } from './api';

export interface ResearchTask {
  id: string;
  description: string;
  search_query: string;
  rationale?: string;
}

export interface ResearchSource {
  doc_id: string;
  chunk_id?: string;
  filename: string;
  content: string;
  similarity: number;
  source_type: string;
  page_number?: number | null;
}

export interface AnalysisFact {
  statement: string;
  source_citation: string;
  doc_id: string;
  confidence: number;
}

export interface AnalysisInference {
  deduction: string;
  premise_citations: string[];
  confidence: number;
}

export interface AnalysisData {
  facts?: AnalysisFact[];
  inferences?: AnalysisInference[];
  insufficient_info?: string[];
}

export interface VerifiedClaim {
  claim: string;
  status: 'VERIFIED' | 'UNSUPPORTED';
  supporting_source_ids: string[];
  notes?: string;
}

export interface VerificationData {
  verified_claims?: VerifiedClaim[];
}

export interface KeyFinding {
  finding: string;
  status: string;
  source?: string;
}

export interface FinalReport {
  title: string;
  research_question: string;
  executive_summary: string;
  key_findings: KeyFinding[];
  detailed_analysis: string;
  verified_sources: Array<{
    doc_id: string;
    filename: string;
    relevance_score: number;
    source_type?: string;
  }>;
  limitations: string[];
  markdown_content: string;
}

export interface ExecutionLogEntry {
  agent: string;
  status: string;
  timestamp: string;
  details?: string;
}

export interface ResearchSession {
  id: string;
  owner_id: string;
  query: string;
  status: 'pending' | 'planning' | 'retrieving' | 'analyzing' | 'verifying' | 'writing' | 'completed' | 'failed';
  plan?: ResearchTask[];
  retrieved_sources?: ResearchSource[];
  analysis?: AnalysisData;
  verification?: VerificationData;
  final_report?: FinalReport;
  failed_agent?: string;
  error_message?: string;
  execution_log?: ExecutionLogEntry[];
  created_at: string;
  updated_at: string;
}

export interface ResearchSessionListResponse {
  items: ResearchSession[];
  total: number;
}

export const researchService = {
  async startResearch(query: string): Promise<ResearchSession> {
    return apiRequest<ResearchSession>('/research/start', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  async listSessions(skip = 0, limit = 50): Promise<ResearchSessionListResponse> {
    return apiRequest<ResearchSessionListResponse>(`/research/sessions?skip=${skip}&limit=${limit}`, {
      method: 'GET',
    });
  },

  async getSession(sessionId: string): Promise<ResearchSession> {
    return apiRequest<ResearchSession>(`/research/sessions/${sessionId}`, {
      method: 'GET',
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    return apiRequest<void>(`/research/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },
};
