import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'search' | 'date' | 'multiselect';
  options?: Array<{ value: string; label: string }>;
  value?: string | string[];
}

export interface WorkspaceFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterConfig[];
  onFilterChange?: (filterId: string, value: any) => void;
  activeFilters?: Record<string, any>;
  onClearFilters?: () => void;
  showFilterPanel?: boolean;
  onToggleFilterPanel?: () => void;
}

export function WorkspaceFilters({
  searchValue = '',
  onSearchChange,
  filters = [],
  onFilterChange,
  activeFilters = {},
  onClearFilters,
  showFilterPanel = false,
  onToggleFilterPanel,
}: WorkspaceFiltersProps) {
  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key] && activeFilters[key] !== ''
  ).length;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        {onSearchChange && (
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>
        )}

        {onToggleFilterPanel && filters.length > 0 && (
          <button
            onClick={onToggleFilterPanel}
            className="btn btn-secondary relative"
          >
            <Filter size={18} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {activeFilterCount > 0 && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="btn btn-ghost"
          >
            <X size={18} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {showFilterPanel && filters.length > 0 && (
        <div className="card p-4 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.id}>
                {filter.type === 'select' && filter.options && (
                  <Select
                    label={filter.label}
                    value={activeFilters[filter.id] || ''}
                    onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
                    options={[
                      { value: '', label: `All ${filter.label}` },
                      ...filter.options,
                    ]}
                  />
                )}

                {filter.type === 'search' && (
                  <Input
                    label={filter.label}
                    type="text"
                    value={activeFilters[filter.id] || ''}
                    onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
                    placeholder={`Search ${filter.label.toLowerCase()}...`}
                  />
                )}

                {filter.type === 'date' && (
                  <Input
                    label={filter.label}
                    type="date"
                    value={activeFilters[filter.id] || ''}
                    onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value || value === '') return null;

            const filter = filters.find((f) => f.id === key);
            if (!filter) return null;

            const displayValue = filter.options?.find((o) => o.value === value)?.label || value;

            return (
              <Badge key={key} variant="primary">
                {filter.label}: {displayValue}
                <button
                  onClick={() => onFilterChange?.(key, '')}
                  className="ml-1.5 hover:text-primary-900"
                >
                  <X size={12} />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
