import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 mb-4 text-neutral-400 flex items-center justify-center">
        {icon}
      </div>

      <h3 className="text-lg font-semibold text-primary mb-2">
        {title}
      </h3>

      <p className="text-sm text-secondary max-w-md mb-6">
        {description}
      </p>

      {primaryAction && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={primaryAction.onClick}
            icon={primaryAction.icon}
          >
            {primaryAction.label}
          </Button>

          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
