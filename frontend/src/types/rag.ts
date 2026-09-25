export interface SourceItem {
  document_id: string;
  filename: string;
  chunk_id: string;
  chunk_index: number;
  page?: number | null;
  similarity: number;
}

export interface RAGQueryRequest {
  question: string;
  document_ids?: string[];
  conversation_id?: string;
}

export interface RAGQueryResponse {
  answer: string;
  sources: SourceItem[];
  conversation_id?: string | null;
}
