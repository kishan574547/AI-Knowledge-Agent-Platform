import { apiRequest } from './api';

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{
    document_id: string;
    filename: string;
    chunk_id?: string;
    chunk_index?: number;
    page?: number | null;
    similarity?: number;
  }>;
  events?: Array<{
    type: 'text' | 'tool_call' | 'tool_result' | 'confirmation_request' | 'error';
    tool_name?: string;
    arguments?: Record<string, unknown>;
    success?: boolean;
    summary?: string;
    content?: unknown;
  }>;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  owner_id: string;
  title: string;
  conversation_type: 'rag' | 'mcp' | 'multi_agent';
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationItem {
  messages: StoredMessage[];
}

export interface ConversationListResponse {
  items: ConversationItem[];
  total: number;
}

export const conversationService = {
  async listConversations(
    type?: 'rag' | 'mcp' | 'multi_agent',
    skip = 0,
    limit = 50
  ): Promise<ConversationListResponse> {
    const params = new URLSearchParams();
    if (type) params.append('conversation_type', type);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    return apiRequest<ConversationListResponse>(`/conversations?${params.toString()}`, {
      method: 'GET',
    });
  },

  async createConversation(
    title?: string,
    conversation_type: 'rag' | 'mcp' | 'multi_agent' = 'rag'
  ): Promise<ConversationItem> {
    return apiRequest<ConversationItem>('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        title,
        conversation_type,
      }),
    });
  },

  async getConversation(id: string): Promise<ConversationDetail> {
    return apiRequest<ConversationDetail>(`/conversations/${id}`, {
      method: 'GET',
    });
  },

  async renameConversation(id: string, title: string): Promise<ConversationItem> {
    return apiRequest<ConversationItem>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  async deleteConversation(id: string): Promise<void> {
    return apiRequest<void>(`/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  async getMessages(id: string): Promise<StoredMessage[]> {
    return apiRequest<StoredMessage[]>(`/conversations/${id}/messages`, {
      method: 'GET',
    });
  },
};
