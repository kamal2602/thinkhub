import { ShoppingCart, Building2, Package } from 'lucide-react';

interface SourceTypeBadgeProps {
  type: 'resell' | 'itad' | 'lot';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SourceTypeBadge({ type, label, size = 'md' }: SourceTypeBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  if (type === 'resell') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-blue-100 text-blue-700 font-medium rounded-full`}
      >
        <ShoppingCart className={iconSizes[size]} />
        <span>{label || 'Resell'}</span>
      </span>
    );
  }

  if (type === 'itad') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-green-100 text-green-700 font-medium rounded-full`}
      >
        <Building2 className={iconSizes[size]} />
        <span>{label || 'ITAD'}</span>
      </span>
    );
  }

  if (type === 'lot') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-purple-100 text-purple-700 font-medium rounded-full`}
      >
        <Package className={iconSizes[size]} />
        <span>{label || 'Lot'}</span>
      </span>
    );
  }

  return null;
}
