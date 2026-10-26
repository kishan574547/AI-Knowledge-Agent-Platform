import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-text-main">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="absolute left-3 text-text-muted pointer-events-none shrink-0 flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-10 px-3 bg-surface border rounded-md text-xs sm:text-sm text-text-main placeholder-text-muted/60 transition-all font-sans ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error
                ? 'border-danger focus:border-danger ring-1 ring-danger/20'
                : 'border-border focus:border-accent ring-accent/20'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-text-muted flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <span className="text-[11px] text-danger font-medium">{error}</span>}
        {helperText && !error && (
          <span className="text-[11px] text-text-muted">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
