export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceRef[];
  timestamp: string;
  isError?: boolean;
}

export interface SourceRef {
  document_id: string;
  filename: string;
  chunk_index: number;
  page?: number | null;
  similarity: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  documentScope: 'all' | 'selected';
  selectedDocumentIds: string[];
}
