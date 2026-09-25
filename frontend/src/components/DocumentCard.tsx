import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Download,
  RotateCw,
} from 'lucide-react';
import { DocumentItem } from '../types/document';
import { formatFileSize, formatDate } from '../utils/formatters';
import { documentService } from '../services/documentService';
import { Spinner } from './Spinner';

interface DocumentCardProps {
  document: DocumentItem;
  onDelete: (id: string) => Promise<void>;
  onStatusChange?: (id: string, updated: DocumentItem) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: initialDoc,
  onDelete,
  onStatusChange,
}) => {
  const [doc, setDoc] = useState<DocumentItem>(initialDoc);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  const pollStatus = useCallback(async () => {
    try {
      const updated = await documentService.getDocument(doc.id);
      setDoc(updated);
      onStatusChange?.(doc.id, updated);
      if (updated.status === 'processing' || updated.status === 'uploaded') {
        setPollingCount((c) => c + 1);
      }
    } catch {
      // Ignore polling errors
    }
  }, [doc.id, onStatusChange]);

  useEffect(() => {
    if (doc.status === 'processing' || doc.status === 'uploaded') {
      const delay = Math.min(2500 + pollingCount * 1500, 12000);
      const timer = setTimeout(pollStatus, delay);
      return () => clearTimeout(timer);
    }
  }, [doc.status, pollingCount, pollStatus]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${doc.filename}"? This will remove all associated vector chunks.`)) return;
    setIsDeleting(true);
    try {
      await onDelete(doc.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      const url = await documentService.getDownloadUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    } finally {
      setIsDownloading(false);
    }
  };

  const ext = doc.filename.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <div className="group relative rounded-xl border border-border bg-surface p-4 shadow-level1 hover:border-accent hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top Header: Standardized Accent Monospace Badge + Action Icons */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="badge-accent">
            {ext}
          </span>

          {/* Action buttons (Muted by default, darken on hover) */}
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-1.5 rounded-md hover:bg-accent-muted text-text-muted hover:text-accent transition-colors"
              title="Download file"
            >
              {isDownloading ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-md hover:bg-danger-muted text-text-muted hover:text-danger transition-colors"
              title="Delete document"
            >
              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Document Title */}
        <h3
          className="font-heading text-sm font-semibold text-text-main truncate"
          title={doc.filename}
        >
          {doc.filename}
        </h3>

        {/* Meta Row */}
        <div className="mt-1 text-[11px] font-mono text-text-muted flex items-center gap-1.5 flex-wrap">
          <span>{formatFileSize(doc.file_size)}</span>
          <span>·</span>
          <span>{formatDate(doc.created_at)}</span>
          {doc.chunks_count !== undefined && doc.chunks_count > 0 && (
            <>
              <span>·</span>
              <span className="text-text-main font-semibold">{doc.chunks_count} chunks</span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Status Dot + Label */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
        {doc.status === 'ready' && (
          <div className="flex items-center text-text-main font-medium">
            <span className="status-dot ready" />
            <span>Ready for RAG</span>
          </div>
        )}

        {(doc.status === 'processing' || doc.status === 'uploaded') && (
          <div className="flex items-center text-text-main font-medium">
            <span className="status-dot processing" />
            <span>Processing embeddings...</span>
          </div>
        )}

        {doc.status === 'failed' && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center text-danger font-medium">
              <span className="status-dot failed" />
              <span>Vectorization failed</span>
            </div>
            <button
              onClick={pollStatus}
              className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
