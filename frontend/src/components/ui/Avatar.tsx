import React from 'react';

export interface AvatarProps {
  name?: string;
  isBrand?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  isBrand = false,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  };

  const getInitials = (text?: string) => {
    if (!text) return 'U';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  if (isBrand) {
    return (
      <div
        className={`rounded-md bg-accent text-text-on-accent font-heading font-bold flex items-center justify-center shrink-0 shadow-sm ${sizeStyles[size]} ${className}`}
        title="DocuRAG Assistant"
      >
        <span>R</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-accent-muted border border-accent/20 text-accent font-mono font-bold flex items-center justify-center shrink-0 ${sizeStyles[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
