export interface DocumentItem {
  id: string;
  owner_id: string;
  filename: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
  chunks_count?: number;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
}
