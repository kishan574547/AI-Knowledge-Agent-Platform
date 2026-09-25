export type MemoryType =
  | 'preference'
  | 'goal'
  | 'skill'
  | 'project'
  | 'personal_context'
  | 'instruction'
  | 'fact';

export interface MemoryItem {
  id: string;
  owner_id: string;
  content: string;
  memory_type: MemoryType;
  importance: number;
  source_conversation_id?: string | null;
  source_message_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MemoryListResponse {
  items: MemoryItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface MemoryStats {
  total: number;
  by_type: Record<string, number>;
}

export interface MemoryCreatePayload {
  content: string;
  memory_type?: MemoryType;
  importance?: number;
  metadata?: Record<string, any>;
}

export interface MemoryUpdatePayload {
  content?: string;
  memory_type?: MemoryType;
  importance?: number;
  metadata?: Record<string, any>;
}
