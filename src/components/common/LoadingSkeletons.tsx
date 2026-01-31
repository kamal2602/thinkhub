interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 border-b border-gray-200 pb-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array(columns).fill(0).map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded" />
        ))}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="grid gap-4 mb-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array(columns).fill(0).map((_, j) => (
            <div key={j} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow p-6">
      <div className="h-6 bg-gray-300 rounded w-2/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function KanbanSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {Array(columns).fill(0).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-80">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4" />
            {Array(3).fill(0).map((_, j) => (
              <div key={j} className="bg-gray-100 rounded-lg p-4 mb-3">
                <div className="h-4 bg-gray-300 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-4/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array(5).fill(0).map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array(items).fill(0).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="w-12 h-12 bg-gray-300 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-300 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-400 rounded w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-pulse bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4" />
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
        <div className="animate-pulse bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4" />
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
