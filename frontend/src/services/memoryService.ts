import { apiRequest } from './api';
import {
  MemoryItem,
  MemoryListResponse,
  MemoryStats,
  MemoryCreatePayload,
  MemoryUpdatePayload,
} from '../types/memory';

export const memoryService = {
  async listMemories(params?: {
    memory_type?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<MemoryListResponse> {
    const query = new URLSearchParams();
    if (params?.memory_type) query.append('memory_type', params.memory_type);
    if (params?.search) query.append('search', params.search);
    if (params?.skip !== undefined) query.append('skip', params.skip.toString());
    if (params?.limit !== undefined) query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = qs ? `/memory?${qs}` : '/memory';
    return apiRequest<MemoryListResponse>(endpoint, { method: 'GET' });
  },

  async getStats(): Promise<MemoryStats> {
    return apiRequest<MemoryStats>('/memory/stats', { method: 'GET' });
  },

  async getMemory(memoryId: string): Promise<MemoryItem> {
    return apiRequest<MemoryItem>(`/memory/${memoryId}`, { method: 'GET' });
  },

  async createMemory(payload: MemoryCreatePayload): Promise<MemoryItem> {
    return apiRequest<MemoryItem>('/memory', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateMemory(memoryId: string, payload: MemoryUpdatePayload): Promise<MemoryItem> {
    return apiRequest<MemoryItem>(`/memory/${memoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteMemory(memoryId: string): Promise<void> {
    return apiRequest<void>(`/memory/${memoryId}`, {
      method: 'DELETE',
    });
  },

  async extractFromText(text: string, save: boolean = true): Promise<MemoryItem[]> {
    const query = new URLSearchParams({ text, save: save ? 'true' : 'false' });
    return apiRequest<MemoryItem[]>(`/memory/extract?${query.toString()}`, {
      method: 'POST',
    });
  },
};
