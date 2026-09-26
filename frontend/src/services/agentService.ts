import { apiRequest } from './api';

export interface ToolInfo {
  name: string;
  description: string;
  permission_level: 'read' | 'write';
  emoji: string;
  input_schema: Record<string, unknown>;
}

export interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'confirmation_request' | 'error';
  tool_name?: string;
  arguments?: Record<string, unknown>;
  success?: boolean;
  summary?: string;
  content?: unknown;
}

export interface AgentChatResponse {
  answer: string;
  events: AgentEvent[];
  requires_confirmation: boolean;
  pending_action?: string;
  session_id?: string;
  tool_calls_made: number;
}

export const agentService = {
  async listTools(): Promise<ToolInfo[]> {
    return apiRequest<ToolInfo[]>('/agent/tools', { method: 'GET' });
  },

  async chat(message: string, sessionId?: string): Promise<AgentChatResponse> {
    return apiRequest<AgentChatResponse>('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
    });
  },

  async confirm(sessionId: string, confirmed: boolean): Promise<AgentChatResponse> {
    return apiRequest<AgentChatResponse>('/agent/confirm', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        confirmed,
      }),
    });
  },
};
