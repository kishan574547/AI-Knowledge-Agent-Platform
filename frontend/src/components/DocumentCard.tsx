import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Download,
  RotateCw,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';
import { DocumentItem } from '../types/document';
import { formatFileSize, formatDate } from '../utils/formatters';
import { documentService } from '../services/documentService';
import { Badge } from './ui/Badge';
import { Dropdown } from './ui/Dropdown';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface DocumentCardProps {
  document: DocumentItem;
  onDelete: (id: string) => Promise<void>;
  onStatusChange?: (id: string, updated: DocumentItem) => void;
  onAskAbout?: (doc: DocumentItem) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: initialDoc,
  onDelete,
  onStatusChange,
  onAskAbout,
}) => {
  const [doc, setDoc] = useState<DocumentItem>(initialDoc);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      // ignore
    }
  }, [doc.id, onStatusChange]);

  useEffect(() => {
    if (doc.status === 'processing' || doc.status === 'uploaded') {
      const delay = Math.min(2500 + pollingCount * 1500, 10000);
      const timer = setTimeout(pollStatus, delay);
      return () => clearTimeout(timer);
    }
  }, [doc.status, pollingCount, pollStatus]);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(doc.id);
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
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
  const isProcessing = doc.status === 'processing' || doc.status === 'uploaded';

  return (
    <>
      <div className="rounded-lg border border-border bg-surface p-4 shadow-card flex flex-col justify-between hover:border-accent/40 transition-all duration-150 group">
        <div>
          {/* Top row = file-type badge (left) and three-dot menu (right) */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="accent" size="sm">
              {ext}
            </Badge>

            <Dropdown
              trigger={
                <button
                  className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
                  aria-label="Document options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              }
              items={[
                {
                  id: 'download',
                  label: isDownloading ? 'Downloading...' : 'Download file',
                  icon: <Download className="w-3.5 h-3.5" />,
                  onClick: handleDownload,
                },
                {
                  id: 'delete',
                  label: 'Delete document',
                  icon: <Trash2 className="w-3.5 h-3.5 text-danger" />,
                  danger: true,
                  onClick: () => setIsDeleteModalOpen(true),
                },
              ]}
            />
          </div>

          {/* Middle = file name (two-line clamp, tooltip) and meta line */}
          <h3
            className="font-heading text-sm font-semibold text-text-main line-clamp-2 leading-snug mb-1.5"
            title={doc.filename}
          >
            {doc.filename}
          </h3>

          <div className="text-[11px] font-sans text-text-secondary flex items-center gap-1.5 flex-wrap">
            <span>{formatFileSize(doc.file_size)}</span>
            <span>·</span>
            <span>{formatDate(doc.created_at)}</span>
            {doc.chunks_count !== undefined && doc.chunks_count > 0 && (
              <>
                <span>·</span>
                <span className="font-mono text-text-main font-semibold">
                  {doc.chunks_count} chunks
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bottom = status with colored dot and label on left, 'Ask about this' on right */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center text-xs">
            {doc.status === 'ready' && (
              <span className="flex items-center text-success font-medium">
                <span className="status-dot ready" />
                Ready for RAG
              </span>
            )}

            {isProcessing && (
              <span className="flex items-center text-warning font-medium">
                <span className="status-dot processing" />
                Processing…
              </span>
            )}

            {doc.status === 'failed' && (
              <div className="flex items-center gap-1.5 text-danger font-medium">
                <span className="status-dot failed" />
                <span>Failed</span>
                <button
                  onClick={pollStatus}
                  className="text-[11px] text-accent hover:underline flex items-center gap-0.5 ml-1"
                >
                  <RotateCw className="w-2.5 h-2.5" />
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Small 'Ask about this' ghost button (Rule 5.3) */}
          {doc.status === 'ready' && onAskAbout && (
            <button
              onClick={() => onAskAbout(doc)}
              className="text-[11px] font-semibold text-accent hover:text-accent-hover hover:bg-accent-muted px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Ask about this</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Delete (Rule 4.5) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete "${doc.filename}"?`}
        subtitle="This action will remove the document file and its vector index."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              loading={isDeleting}
            >
              Delete document
            </Button>
          </>
        }
      >
        <p className="text-xs text-text-secondary leading-relaxed">
          Are you sure you want to delete <strong className="text-text-main font-semibold">{doc.filename}</strong>? All associated embeddings and retrieval chunks in PostgreSQL will be erased.
        </p>
      </Modal>
    </>
  );
};
