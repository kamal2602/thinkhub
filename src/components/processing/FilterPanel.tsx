import { useState } from 'react';
import { Filter, X, ChevronDown, Search } from 'lucide-react';

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  grades?: Array<{ id: string; grade: string }>;
  stages?: Array<{ id: string; stage_name: string; stage_key: string }>;
  productTypes?: Array<{ id: string; name: string }>;
  technicians?: Array<{ id: string; full_name: string }>;
}

export interface FilterState {
  search: string;
  grades: string[];
  stages: string[];
  productTypes: string[];
  assignedTo: string[];
  isPriority: boolean | null;
  isStale: boolean | null;
  dateRange: { from: string; to: string } | null;
}

export function FilterPanel({
  onFilterChange,
  grades = [],
  stages = [],
  productTypes = [],
  technicians = [],
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    grades: [],
    stages: [],
    productTypes: [],
    assignedTo: [],
    isPriority: null,
    isStale: null,
    dateRange: null,
  });

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearFilters = () => {
    const cleared: FilterState = {
      search: '',
      grades: [],
      stages: [],
      productTypes: [],
      assignedTo: [],
      isPriority: null,
      isStale: null,
      dateRange: null,
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilterCount = [
    filters.grades.length,
    filters.stages.length,
    filters.productTypes.length,
    filters.assignedTo.length,
    filters.isPriority !== null ? 1 : 0,
    filters.isStale !== null ? 1 : 0,
    filters.dateRange ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilters({ [key]: updated });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by serial, brand, model..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition ${
            isOpen || activeFilterCount > 0
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grades.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cosmetic Grade</h3>
                <div className="space-y-2">
                  {grades.map((grade) => (
                    <label key={grade.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.grades.includes(grade.grade)}
                        onChange={() => toggleArrayFilter('grades', grade.grade)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{grade.grade}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {stages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Processing Stage</h3>
                <div className="space-y-2">
                  {stages.map((stage) => (
                    <label key={stage.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.stages.includes(stage.stage_key)}
                        onChange={() => toggleArrayFilter('stages', stage.stage_key)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{stage.stage_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {productTypes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Product Type</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {productTypes.map((type) => (
                    <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.productTypes.includes(type.id)}
                        onChange={() => toggleArrayFilter('productTypes', type.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {technicians.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned To</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {technicians.map((tech) => (
                    <label key={tech.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.assignedTo.includes(tech.id)}
                        onChange={() => toggleArrayFilter('assignedTo', tech.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{tech.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Status Filters</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isPriority === true}
                    onChange={(e) => updateFilters({ isPriority: e.target.checked ? true : null })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Priority only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isStale === true}
                    onChange={(e) => updateFilters({ isStale: e.target.checked ? true : null })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Stale items (7+ days)</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Date Range</h3>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange?.from || ''}
                  onChange={(e) =>
                    updateFilters({
                      dateRange: e.target.value
                        ? { from: e.target.value, to: filters.dateRange?.to || '' }
                        : null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="From date"
                />
                <input
                  type="date"
                  value={filters.dateRange?.to || ''}
                  onChange={(e) =>
                    updateFilters({
                      dateRange: e.target.value && filters.dateRange?.from
                        ? { from: filters.dateRange.from, to: e.target.value }
                        : null,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="To date"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
