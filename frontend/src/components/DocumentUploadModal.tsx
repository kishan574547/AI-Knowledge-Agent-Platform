import React, { useState, useRef } from 'react';
import { UploadCloud, X, File } from 'lucide-react';
import { documentService } from '../services/documentService';
import { formatFileSize } from '../utils/formatters';
import { Spinner } from './Spinner';
import { Alert } from './Alert';
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
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const allowedExtensions = ['.pdf', '.txt', '.docx', '.md'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    const ext = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(ext)) {
      setError(`Invalid file type. Only ${allowedExtensions.join(', ')} are supported.`);
      return false;
    }
    if (selectedFile.size > maxSizeBytes) {
      setError(`File size exceeds the 10 MB limit (${formatFileSize(selectedFile.size)}).`);
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
      onUploadSuccess(doc);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Upload Document</h3>
              <p className="text-xs text-slate-400">Secure storage with encrypted PostgreSQL metadata</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/5'
                : file
                ? 'border-emerald-600/50 bg-slate-950/60'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
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
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <File className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-white">{file.name}</div>
                <div className="text-xs text-slate-400">{formatFileSize(file.size)}</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium text-slate-200">
                  <span className="text-emerald-400 font-semibold">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-slate-400">
                  PDF, TXT, DOCX, MD (Max 10 MB)
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-emerald-500/10 transition-all"
            >
              {isUploading ? (
                <>
                  <Spinner size="sm" />
                  <span>Uploading & Validating...</span>
                </>
              ) : (
                'Confirm Upload'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
