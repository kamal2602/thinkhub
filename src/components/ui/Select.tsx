import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  helperText,
  fullWidth = true,
  options,
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-primary mb-1.5"
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={[
          'input focus-visible',
          error && 'border-red-500 focus:border-red-500',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}

      {!error && helperText && (
        <p className="mt-1.5 text-xs text-secondary">{helperText}</p>
      )}
    </div>
  );
}
