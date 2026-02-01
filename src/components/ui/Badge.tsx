import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  const baseClasses = 'badge';

  const variantClasses = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    neutral: 'badge-neutral',
    info: 'bg-cyan-100 text-cyan-700',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      )}
      {children}
    </span>
  );
}
