import { apiRequest } from './api';
import { DocumentItem, DocumentListResponse } from '../types/document';

export const documentService = {
  async listDocuments(skip = 0, limit = 50): Promise<DocumentListResponse> {
    return await apiRequest<DocumentListResponse>(`/documents?skip=${skip}&limit=${limit}`);
  },

  async getDocument(id: string): Promise<DocumentItem> {
    return await apiRequest<DocumentItem>(`/documents/${id}`);
  },

  async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);

    return await apiRequest<DocumentItem>('/documents', {
      method: 'POST',
      body: formData,
    });
  },

  async deleteDocument(id: string): Promise<void> {
    await apiRequest<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async getDownloadUrl(id: string): Promise<string> {
    const res = await apiRequest<{ download_url: string; expires_in: number }>(
      `/documents/${id}/download-url`
    );
    return res.download_url;
  },
};
