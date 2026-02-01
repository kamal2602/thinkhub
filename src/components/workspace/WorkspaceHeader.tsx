import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

export interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  secondaryActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
}

export function WorkspaceHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  primaryAction,
  secondaryActions = [],
}: WorkspaceHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} className="text-neutral-600" />
            </button>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-primary truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-secondary mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant="secondary"
              onClick={action.onClick}
              icon={action.icon}
            >
              {action.label}
            </Button>
          ))}

          {primaryAction && (
            <Button
              variant="primary"
              onClick={primaryAction.onClick}
              icon={primaryAction.icon}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
