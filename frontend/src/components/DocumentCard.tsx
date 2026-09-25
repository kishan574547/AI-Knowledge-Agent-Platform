import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Trash2,
  HardDrive,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Download,
  Layers,
  RefreshCw,
  Clock,
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

const FILE_COLORS: Record<string, string> = {
  PDF: 'bg-red-500/10 text-red-400 border-red-500/20',
  DOCX: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TXT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MD: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export const DocumentCard: React.FC<DocumentCardProps> = ({ document: initialDoc, onDelete, onStatusChange }) => {
  const [doc, setDoc] = useState<DocumentItem>(initialDoc);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  // Keep in sync with parent refreshes
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
      const delay = Math.min(3000 + pollingCount * 2000, 15000); // backoff up to 15s
      const timer = setTimeout(pollStatus, delay);
      return () => clearTimeout(timer);
    }
  }, [doc.status, pollingCount, pollStatus]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete "${doc.filename}"? This cannot be undone.`)) return;
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
      // Silent fail — user sees no URL
    } finally {
      setIsDownloading(false);
    }
  };

  const ext = doc.filename.split('.').pop()?.toUpperCase() || 'FILE';

  const statusEl = (() => {
    switch (doc.status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Ready for RAG
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium animate-pulse">
            <Spinner size="sm" />
            Processing…
          </span>
        );
      case 'uploaded':
        return (
          <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            Queued
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="glass-card rounded-xl p-5 border border-slate-800 hover:border-emerald-500/30 transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                FILE_COLORS[ext] || 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {ext}
            </span>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Download document"
            >
              {isDownloading ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete document"
            >
              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <h4 className="text-sm font-semibold text-white truncate" title={doc.filename}>
            {doc.filename}
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3 h-3" />
              {formatFileSize(doc.file_size)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {formatDate(doc.created_at)}
            </span>
            {doc.chunks_count != null && doc.chunks_count > 0 && (
              <span className="flex items-center gap-1.5 text-emerald-400/70">
                <Layers className="w-3 h-3" />
                {doc.chunks_count} chunk{doc.chunks_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        {statusEl}
        {(doc.status === 'processing' || doc.status === 'uploaded') && (
          <button
            onClick={() => pollStatus()}
            className="p-1 text-slate-500 hover:text-white transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
