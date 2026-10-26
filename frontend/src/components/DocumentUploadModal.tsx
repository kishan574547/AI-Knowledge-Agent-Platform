import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { documentService } from '../services/documentService';
import { formatFileSize } from '../utils/formatters';
import { DocumentItem } from '../types/document';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (doc: DocumentItem) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.pdf', '.txt', '.docx', '.md'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    if (selectedFile.size === 0) {
      setError('The selected file is empty (0 bytes). Please choose a valid file.');
      return false;
    }
    const ext = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(ext)) {
      setError(`Supported formats: ${allowedExtensions.join(', ')}`);
      return false;
    }
    if (selectedFile.size > maxSizeBytes) {
      setError(`File exceeds the 10 MB limit (${formatFileSize(selectedFile.size)})`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && validateFile(dropped)) {
      setFile(dropped);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const doc = await documentService.uploadDocument(file);
      setFile(null);
      setIsUploading(false);
      onUploadSuccess(doc);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload document"
      subtitle="Supported files are parsed, chunked, and vectorized into your private workspace."
      maxWidth="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!file || isUploading}
            loading={isUploading}
          >
            {isUploading ? 'Uploading & Indexing...' : 'Upload document'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Error notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 rounded-md border-l-4 border-danger bg-danger-muted text-danger text-xs font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dropzone (Section 5.4: 520px wide modal, dashed border, drag highlight) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`rounded-lg p-7 text-center transition-all ${
            isDragging
              ? 'border-2 border-solid border-accent bg-accent-muted'
              : file
              ? 'border border-border bg-surface-2/40'
              : 'border-2 border-dashed border-border hover:border-text-secondary bg-surface-2/30 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx,.md"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            /* Selected File Row (Rule 5.4) */
            <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-accent-muted text-accent flex items-center justify-center shrink-0">
                  <File className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold text-text-main truncate max-w-[280px]">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-text-secondary">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                disabled={isUploading}
                className="text-xs text-danger hover:underline p-1 flex items-center gap-1 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-secondary">
                <UploadCloud className="w-5 h-5 text-accent" />
              </div>
              <div>
                <span className="text-xs font-semibold text-accent">Click to browse</span>
                <span className="text-xs text-text-secondary"> or drag and drop your file</span>
              </div>
              <p className="text-[11px] font-mono text-text-secondary">
                PDF, DOCX, TXT, MD up to 10 MB
              </p>
            </div>
          )}
        </div>

        {/* Upload Progress Bar (Section 5.4) */}
        {isUploading && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Uploading & indexing vector chunks...</span>
              <span className="font-mono text-accent font-semibold">Processing</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full animate-shimmer"
                style={{
                  width: '100%',
                  backgroundImage:
                    'linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 50%, var(--accent) 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
