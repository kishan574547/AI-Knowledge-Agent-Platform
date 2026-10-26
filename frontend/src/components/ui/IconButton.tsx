import React from 'react';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = 'ghost',
      size = 'md',
      tooltipPosition = 'top',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'w-7 h-7 text-xs rounded-md',
      md: 'w-8 h-8 text-sm rounded-md',
      lg: 'w-10 h-10 text-base rounded-lg',
    };

    const variantStyles = {
      primary: 'bg-accent text-text-on-accent hover:opacity-90 shadow-sm',
      secondary: 'bg-surface hover:bg-surface-2 text-text-main border border-border shadow-sm',
      ghost: 'bg-transparent hover:bg-surface-2 text-text-muted hover:text-text-main',
      danger: 'bg-transparent hover:bg-danger/10 text-danger',
    };

    const button = (
      <button
        ref={ref}
        aria-label={label}
        disabled={disabled}
        className={`inline-flex items-center justify-center transition-all select-none disabled:opacity-50 disabled:pointer-events-none active:translate-y-[1px] ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );

    return <Tooltip content={label} position={tooltipPosition}>{button}</Tooltip>;
  }
);

IconButton.displayName = 'IconButton';
