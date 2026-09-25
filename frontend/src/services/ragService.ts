import { apiRequest } from './api';
import { RAGQueryRequest, RAGQueryResponse } from '../types/rag';

export const ragService = {
  async query(req: RAGQueryRequest): Promise<RAGQueryResponse> {
    return await apiRequest<RAGQueryResponse>('/rag/query', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};
