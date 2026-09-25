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

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-400' },
  DOCX: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' },
  TXT: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
  MD: { bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400' },
};

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

  // Poll status when processing
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
  const typeStyle = TYPE_COLORS[ext] || { bg: 'bg-surface-2', text: 'text-text-secondary' };

  return (
    <div className="group relative rounded-xl border border-border bg-surface p-4 shadow-level1 hover:border-accent/60 transition-all flex flex-col justify-between">
      <div>
        {/* Top Header: Monospace Type Tag + Hover Actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${typeStyle.bg} ${typeStyle.text}`}
          >
            {ext}
          </span>

          {/* Action buttons (fade in on card hover) */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-1.5 rounded-md hover:bg-surface-2 text-text-secondary hover:text-text-main transition-colors"
              title="Download file"
            >
              {isDownloading ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-md hover:bg-danger-tint text-text-secondary hover:text-danger transition-colors"
              title="Delete document"
            >
              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Document Title */}
        <h3
          className="text-sm font-semibold text-text-main truncate"
          title={doc.filename}
        >
          {doc.filename}
        </h3>

        {/* Meta Row */}
        <div className="mt-1 text-[11px] font-mono text-text-secondary flex items-center gap-1.5 flex-wrap">
          <span>{formatFileSize(doc.file_size)}</span>
          <span>·</span>
          <span>{formatDate(doc.created_at)}</span>
          {doc.chunks_count !== undefined && doc.chunks_count > 0 && (
            <>
              <span>·</span>
              <span className="text-text-main font-medium">{doc.chunks_count} chunks</span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Status Dot + Label */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
        {doc.status === 'ready' && (
          <div className="flex items-center gap-2 text-success font-medium">
            <span className="w-2 h-2 rounded-full bg-success shrink-0" />
            <span>Ready for RAG</span>
          </div>
        )}

        {(doc.status === 'processing' || doc.status === 'uploaded') && (
          <div className="flex items-center gap-2 text-warning font-medium">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse-subtle shrink-0" />
            <span>Processing embeddings...</span>
          </div>
        )}

        {doc.status === 'failed' && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-danger font-medium">
              <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
              <span>Vectorization failed</span>
            </div>
            <button
              onClick={pollStatus}
              className="text-[11px] text-accent hover:underline flex items-center gap-1"
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
