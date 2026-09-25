import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trash2,
  Download,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { DocumentItem } from '../types/document';
import { formatFileSize, formatDate } from '../utils/formatters';
import { documentService } from '../services/documentService';
import { Spinner } from './Spinner';

interface DocumentCardProps {
  document: DocumentItem;
  onDelete: (id: string) => Promise<void>;
  onStatusChange?: (id: string, updated: DocumentItem) => void;
}

// Animated progress bar for chunk indexing
const ChunkProgressBar: React.FC<{ chunks?: number }> = ({ chunks = 0 }) => {
  const displayChunks = Math.min(chunks, 200);
  const pct = Math.min((displayChunks / 200) * 100, 100);

  return (
    <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'linear-gradient(90deg, var(--success) 0%, var(--accent) 100%)',
          boxShadow: '0 0 6px var(--success)',
        }}
      />
    </div>
  );
};

// Radar ping animation for processing state
const RadarPing: React.FC = () => (
  <span className="relative inline-flex h-2 w-2 mr-2">
    {[0, 1].map((i) => (
      <motion.span
        key={i}
        className="absolute inline-flex h-full w-full rounded-full opacity-0"
        style={{ backgroundColor: 'var(--warning)' }}
        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
        transition={{
          duration: 1.8,
          ease: 'easeOut',
          repeat: Infinity,
          delay: i * 0.6,
        }}
      />
    ))}
    <span
      className="relative inline-flex rounded-full h-2 w-2"
      style={{ backgroundColor: 'var(--warning)' }}
    />
  </span>
);

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: initialDoc,
  onDelete,
  onStatusChange,
}) => {
  const [doc, setDoc] = useState<DocumentItem>(initialDoc);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightX = useTransform(mouseX, (v) => `${v}px`);
  const spotlightY = useTransform(mouseY, (v) => `${v}px`);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const ext = doc.filename.split('.').pop()?.toUpperCase() || 'FILE';
  const isProcessing = doc.status === 'processing' || doc.status === 'uploaded';

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      whileHover={{
        y: -3,
        transition: { type: 'spring', stiffness: 300, damping: 22 },
      }}
      className="group relative rounded-2xl border border-border bg-surface p-4 shadow-level1 flex flex-col justify-between overflow-hidden cursor-default"
      style={{
        borderTopWidth: isProcessing ? 2 : doc.status === 'ready' ? 2 : 1,
        borderTopColor:
          isProcessing
            ? 'var(--warning)'
            : doc.status === 'ready'
            ? 'var(--success)'
            : doc.status === 'failed'
            ? 'var(--danger)'
            : 'var(--border)',
      }}
    >
      {/* Hover spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(120px circle at ${spotlightX} ${spotlightY}, var(--accent-muted), transparent 80%)`,
        }}
      />

      <div className="relative z-10">
        {/* Top Row: file type badge + actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="badge-accent">{ext}</span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-1.5 rounded-md hover:bg-accent-muted text-text-muted hover:text-accent transition-colors"
              title="Download file"
            >
              {isDownloading ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-md hover:bg-danger-muted text-text-muted hover:text-danger transition-colors"
              title="Delete document"
            >
              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
            </motion.button>
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

      {/* Bottom status */}
      <div className="relative z-10 mt-4 pt-3 border-t border-border space-y-2">
        {doc.status === 'ready' && (
          <div className="flex items-center text-success text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Indexed — Ready for RAG</span>
            {doc.chunks_count && doc.chunks_count > 0 && (
              <ChunkProgressBar chunks={doc.chunks_count} />
            )}
          </div>
        )}

        {isProcessing && (
          <div className="space-y-1.5">
            <div className="flex items-center text-warning text-xs font-semibold">
              <RadarPing />
              <Cpu className="w-3.5 h-3.5 mr-1.5" />
              <span>Vectorizing embeddings…</span>
            </div>
            <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--warning)', boxShadow: '0 0 5px var(--warning)' }}
                animate={{ width: ['20%', '75%', '35%', '90%', '55%'] }}
                transition={{
                  duration: 3.5,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'mirror',
                }}
              />
            </div>
          </div>
        )}

        {doc.status === 'failed' && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center text-danger text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
              <span>Vectorization failed</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={pollStatus}
              className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
