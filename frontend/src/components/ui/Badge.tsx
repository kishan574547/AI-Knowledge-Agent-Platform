import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded-sm',
    md: 'text-xs px-2 py-0.5 rounded-sm',
  };

  const variantStyles = {
    accent: 'bg-accent-muted text-accent font-semibold',
    success: 'bg-success-muted text-success font-semibold',
    warning: 'bg-warning-muted text-warning font-semibold',
    danger: 'bg-danger-muted text-danger font-semibold',
    neutral: 'bg-surface-2 text-text-secondary border border-border font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono tracking-tight shrink-0 select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
