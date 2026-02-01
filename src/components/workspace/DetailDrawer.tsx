import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
}: DetailDrawerProps) {
  const widthClasses = {
    sm: 'w-96',
    md: 'w-[540px]',
    lg: 'w-[720px]',
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
        style={{ zIndex: 'var(--z-modal-backdrop)' }}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl flex flex-col animate-slide-in-right ${widthClasses[width]}`}
        style={{ zIndex: 'calc(var(--z-modal) + 1)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-primary truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-secondary mt-1 truncate">{subtitle}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-neutral-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

export function DetailSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function DetailField({
  label,
  value,
  type = 'text',
}: {
  label: string;
  value: React.ReactNode;
  type?: 'text' | 'badge' | 'link';
}) {
  return (
    <div className="py-2">
      <dt className="text-sm text-secondary mb-1">{label}</dt>
      <dd className="text-sm font-medium text-primary">
        {value || '—'}
      </dd>
    </div>
  );
}

export function DetailList({
  items,
  emptyMessage = 'No items',
  renderItem,
}: {
  items: any[];
  emptyMessage?: string;
  renderItem: (item: any, index: number) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-secondary py-4 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}
