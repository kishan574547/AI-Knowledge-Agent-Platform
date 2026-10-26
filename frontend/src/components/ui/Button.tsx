import React from 'react';
import { Spinner } from '../Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all select-none rounded-md outline-none active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none disabled:active:translate-y-0';

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-xs sm:text-sm gap-2',
      lg: 'h-11 px-5 text-sm gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-accent text-text-on-accent hover:opacity-90 shadow-sm border border-transparent font-semibold',
      secondary:
        'bg-surface hover:bg-surface-2 text-text-main border border-border shadow-sm',
      ghost:
        'bg-transparent hover:bg-surface-2 text-text-muted hover:text-text-main border border-transparent',
      danger:
        'bg-transparent hover:bg-danger/10 text-danger border border-danger/30',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
