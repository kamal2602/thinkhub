import React from 'react';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface WorkspaceTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowActions?: (row: T) => React.ReactNode;
}

export function WorkspaceTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
  rowActions,
}: WorkspaceTableProps<T>) {
  const handleSort = (column: ColumnDef<T>) => {
    if (column.sortable && onSort) {
      onSort(column.id);
    }
  };

  const getCellValue = (row: T, column: ColumnDef<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor] as React.ReactNode;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12 text-secondary">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ background: 'var(--table-header-bg)' }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`
                    px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-neutral-100 select-none' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && sortColumn === column.id && (
                      sortDirection === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )
                    )}
                  </div>
                </th>
              ))}
              {rowActions && (
                <th className="px-4 py-3 w-12"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.id || index}
                className={`
                  border-t border-neutral-200 transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-neutral-50' : ''}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`
                      px-4 py-3 text-sm text-primary
                      ${column.align === 'center' ? 'text-center' : ''}
                      ${column.align === 'right' ? 'text-right' : ''}
                    `}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
