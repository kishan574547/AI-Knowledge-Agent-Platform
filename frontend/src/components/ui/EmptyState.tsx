import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className = '',
}) => {
  const finalActionLabel = action?.label || actionLabel;
  const finalOnAction = action?.onClick || onAction;
  const finalActionIcon = action?.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-border bg-surface shadow-card ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-accent-muted text-accent flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-heading text-base font-bold text-text-main mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {finalActionLabel && finalOnAction && (
        <Button
          variant="primary"
          size="md"
          onClick={finalOnAction}
          leftIcon={finalActionIcon}
        >
          {finalActionLabel}
        </Button>
      )}
    </div>
  );
};
