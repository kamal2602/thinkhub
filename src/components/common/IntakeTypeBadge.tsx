import React from 'react';
import { ShoppingCart, Shield, Recycle } from 'lucide-react';

interface IntakeTypeBadgeProps {
  type: 'resale' | 'itad' | 'recycling';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function IntakeTypeBadge({ type, size = 'sm', showIcon = true }: IntakeTypeBadgeProps) {
  const configs = {
    resale: {
      icon: ShoppingCart,
      label: 'Resale',
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    itad: {
      icon: Shield,
      label: 'ITAD',
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    recycling: {
      icon: Recycle,
      label: 'Recycling',
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200'
    }
  };

  const config = configs[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      icon: 'w-3 h-3',
      text: 'text-xs',
      padding: 'px-2 py-0.5'
    },
    md: {
      icon: 'w-4 h-4',
      text: 'text-sm',
      padding: 'px-2.5 py-1'
    },
    lg: {
      icon: 'w-5 h-5',
      text: 'text-base',
      padding: 'px-3 py-1.5'
    }
  };

  const sizes = sizeClasses[size];

  return (
    <span className={`inline-flex items-center gap-1 rounded border font-medium ${config.bg} ${config.text} ${config.border} ${sizes.text} ${sizes.padding}`}>
      {showIcon && <Icon className={sizes.icon} />}
      {config.label}
    </span>
  );
}
