import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  const styles = {
    success: 'border-success/30 bg-success-muted text-success',
    error: 'border-danger/30 bg-danger-muted text-danger',
    info: 'border-accent/30 bg-accent-muted text-accent',
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`fixed top-4 right-4 z-50 flex items-center justify-between gap-3 p-3 px-4 rounded-lg border text-xs font-semibold shadow-overlay max-w-sm ${styles[type]}`}
    >
      <div className="flex items-center gap-2">
        {icons[type]}
        <span>{message}</span>
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss toast"
        className="p-1 rounded hover:opacity-75 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};
