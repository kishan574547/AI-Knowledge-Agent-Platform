import React, { useState, useRef } from 'react';
import { UploadCloud, X, File, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { documentService } from '../services/documentService';
import { formatFileSize } from '../utils/formatters';
import { DocumentItem } from '../types/document';

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.pdf', '.txt', '.docx', '.md'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
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
      setIsSuccess(false);
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
      setIsSuccess(true);
      setTimeout(() => {
        setFile(null);
        setIsSuccess(false);
        onUploadSuccess(doc);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/70"
          />

          {/* Level 2 Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-level2 p-6 z-10 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-tint text-accent flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-main">Upload document</h3>
                  <p className="text-[11px] text-text-secondary">
                    Files are encrypted and scoped to your workspace.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="p-1 text-text-secondary hover:text-text-main rounded-md hover:bg-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 flex items-start gap-2 p-3 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Area */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                className={`rounded-xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-2 border-solid border-accent bg-accent-tint scale-[1.01]'
                    : file
                    ? 'border border-border bg-surface-2'
                    : 'border-2 border-dashed border-border hover:border-text-secondary bg-surface-2/60 cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div
                      key="file-preview"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-accent-tint text-accent flex items-center justify-center shrink-0">
                          <File className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-xs font-semibold text-text-main truncate max-w-[260px]">
                            {file.name}
                          </div>
                          <div className="text-[11px] font-mono text-text-secondary">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        disabled={isUploading}
                        className="text-xs text-text-secondary hover:text-danger hover:underline px-2 py-1"
                      >
                        Change file
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="drop-prompt"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-2 py-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-accent">Choose a file</span>
                        <span className="text-xs text-text-secondary"> or drag and drop here</span>
                      </div>
                      <span className="text-[11px] font-mono text-text-secondary">
                        PDF, DOCX, TXT, MD up to 10 MB
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Uploading Sheen & Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-text-secondary">
                    <span>Uploading & verifying integrity...</span>
                    <span>Saving</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden relative">
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

              {/* Footer Controls */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="px-3.5 py-2 text-xs font-medium text-text-secondary hover:text-text-main rounded-lg hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!file || isUploading}
                  className={`px-4 py-2 rounded-lg text-xs font-medium text-white transition-all flex items-center gap-1.5 ${
                    isSuccess
                      ? 'bg-success'
                      : 'bg-accent hover:bg-accent-hover disabled:opacity-50'
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Uploaded!</span>
                    </>
                  ) : isUploading ? (
                    <span>Uploading...</span>
                  ) : (
                    'Confirm upload'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
