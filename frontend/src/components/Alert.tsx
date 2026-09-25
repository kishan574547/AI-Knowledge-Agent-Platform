import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type = 'error', message, onClose }) => {
  const styles = {
    error: 'bg-red-950/50 border-red-800/60 text-red-200',
    success: 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200',
    info: 'bg-blue-950/50 border-blue-800/60 text-blue-200',
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm animate-fadeIn ${styles[type]}`}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="font-medium">{message}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
