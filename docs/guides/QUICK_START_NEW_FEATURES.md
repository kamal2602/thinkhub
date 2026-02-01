# Quick Start Guide - New Features

This guide shows you how to immediately start using the new improvements in your ITAD platform.

---

## 🚀 Getting Started (3 Minutes)

### 1. Press `?` for Keyboard Shortcuts
Anywhere in the app, press the `?` key to see all available keyboard shortcuts.

### 2. Try Global Search
Press `/` to focus the search bar and search across assets, customers, and suppliers.

### 3. Check Session Status
Your session will automatically timeout after 8 hours of inactivity for security.

---

## 📦 For Developers: Adding Features

### Quick Add: Loading State

**Before:**
```tsx
if (loading) return <div>Loading...</div>;
```

**After (2 lines):**
```tsx
import { TableSkeleton } from './components/common/LoadingSkeletons';
if (loading) return <TableSkeleton />;
```

---

### Quick Add: Error Handling

**Before:**
```tsx
try {
  await supabase.from('table').insert(data);
} catch (err) {
  console.error(err);
}
```

**After (5 lines):**
```tsx
import { useAsyncAction } from './hooks/useAsyncAction';
import { handleSupabaseError } from './lib/errorHandling';

const save = async (data) => {
  const { error } = await supabase.from('table').insert(data);
  if (error) throw handleSupabaseError(error, 'save');
};

const { execute, loading } = useAsyncAction(save, {
  successMessage: 'Saved!',
  onSuccess: () => refetch()
});

// In your JSX:
<button onClick={() => execute(formData)} disabled={loading}>Save</button>
```

---

### Quick Add: Pagination

**Before:**
```tsx
const { data } = await supabase.from('table').select('*');
```

**After (8 lines):**
```tsx
import { usePagination } from './hooks/usePagination';
import { PaginationControls } from './components/common/PaginationControls';

const fetchData = async (page, pageSize) => {
  const start = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from('table')
    .select('*', { count: 'exact' })
    .range(start, start + pageSize - 1);
  return { data: data || [], total: count || 0 };
};

const pagination = usePagination(fetchData);

// In your JSX:
<>
  {pagination.loading ? <TableSkeleton /> : <Table data={pagination.data} />}
  <PaginationControls {...pagination} />
</>
```

---

### Quick Add: Empty State

**After (6 lines):**
```tsx
import { EmptyState } from './components/common/EmptyState';
import { Package } from 'lucide-react';

if (data.length === 0) {
  return (
    <EmptyState
      icon={<Package className="w-16 h-16" />}
      title="No items yet"
      description="Create your first item to get started"
      action={{ label: "Create", onClick: () => navigate('/new') }}
    />
  );
}
```

---

### Quick Add: Search

**For small datasets (< 1000 items):**
```tsx
import { useSearch } from './hooks/useSearch';

const { searchTerm, setSearchTerm, filteredData } = useSearch({
  data: yourData,
  searchFields: ['name', 'serial', 'model']
});

// In your JSX:
<input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
<Table data={filteredData} />
```

---

### Quick Add: Bulk Progress

**For batch operations:**
```tsx
import { useBulkOperation } from './hooks/useBulkOperation';
import { BulkOperationProgress } from './components/common/BulkOperationProgress';

const processItem = async (item, index) => {
  await supabase.from('table').insert(item);
};

const bulkOp = useBulkOperation(processItem, {
  batchSize: 20,
  onComplete: () => console.log('Done!')
});

// Trigger processing:
await bulkOp.execute(items);

// Show progress modal:
<BulkOperationProgress
  isOpen={showProgress}
  {...bulkOp}
  onClose={() => setShowProgress(false)}
/>
```

---

### Quick Add: Charts

```tsx
import { SimpleBarChart } from './components/common/SimpleBarChart';

<SimpleBarChart
  data={[
    { label: 'Received', value: 45, color: 'bg-blue-500' },
    { label: 'Testing', value: 23, color: 'bg-yellow-500' },
    { label: 'Ready', value: 12, color: 'bg-green-500' }
  ]}
/>
```

---

### Quick Add: Keyboard Shortcuts

```tsx
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

useKeyboardShortcuts({
  'ctrl+s': save,
  'ctrl+n': createNew,
  'esc': close,
  '/': () => searchRef.current?.focus()
});
```

---

## 🎯 Common Patterns

### Pattern: List with Everything

```tsx
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TableSkeleton } from './components/common/LoadingSkeletons';
import { EmptyState } from './components/common/EmptyState';
import { usePagination } from './hooks/usePagination';
import { PaginationControls } from './components/common/PaginationControls';
import { useSearch } from './hooks/useSearch';

function OptimizedList() {
  const pagination = usePagination(fetchData);
  const search = useSearch({
    data: pagination.data,
    searchFields: ['name', 'serial']
  });

  return (
    <ErrorBoundary>
      <input
        value={search.searchTerm}
        onChange={(e) => search.setSearchTerm(e.target.value)}
        placeholder="Search..."
      />

      {pagination.loading ? (
        <TableSkeleton />
      ) : search.filteredData.length === 0 ? (
        <EmptyState
          icon={<Package className="w-16 h-16" />}
          title="No results"
          description="Try adjusting your search"
        />
      ) : (
        <>
          <Table data={search.filteredData} />
          <PaginationControls {...pagination} />
        </>
      )}
    </ErrorBoundary>
  );
}
```

---

### Pattern: Form with Validation

```tsx
import { useAsyncAction } from './hooks/useAsyncAction';
import { handleSupabaseError } from './lib/errorHandling';

function Form() {
  const [formData, setFormData] = useState({});

  const saveData = async (data) => {
    const { error } = await supabase.from('table').insert(data);
    if (error) throw handleSupabaseError(error, 'saveData');
  };

  const { execute, loading, error } = useAsyncAction(saveData, {
    successMessage: 'Saved successfully!',
    onSuccess: () => {
      setFormData({});
      navigate('/list');
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); execute(formData); }}>
      {/* form fields */}
      {error && <div className="text-red-600">{error.message}</div>}
      <button disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

---

### Pattern: Dashboard with Charts

```tsx
import { DashboardSkeleton } from './components/common/LoadingSkeletons';
import { SimpleBarChart } from './components/common/SimpleBarChart';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Processing Pipeline</h3>
          <SimpleBarChart
            data={[
              { label: 'Received', value: stats.received, color: 'bg-blue-500' },
              { label: 'Testing', value: stats.testing, color: 'bg-yellow-500' },
              { label: 'Ready', value: stats.ready, color: 'bg-green-500' }
            ]}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
```

---

## 📚 Full Documentation

- **Complete Guide:** `IMPROVEMENTS_IMPLEMENTED.md` (50+ pages)
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **This Quick Start:** `QUICK_START_NEW_FEATURES.md`

---

## 🔧 Troubleshooting

### "Component not found" error
```bash
# Make sure you're importing from the correct path:
import { ErrorBoundary } from './components/common/ErrorBoundary';
# Not: import { ErrorBoundary } from '@/components/common/ErrorBoundary';
```

### TypeScript errors
```bash
# Run type checking:
npm run typecheck
```

### Build errors
```bash
# Clean and rebuild:
rm -rf dist node_modules
npm install
npm run build
```

---

## ✅ Checklist for New Features

When adding a new feature, include:

- [ ] Error boundary wrapper
- [ ] Loading skeleton
- [ ] Empty state (if list/table)
- [ ] Pagination (if > 20 items)
- [ ] useAsyncAction for API calls
- [ ] Keyboard shortcuts (if applicable)
- [ ] Search (if list/table)

---

**Last Updated:** January 31, 2026
**Status:** Production Ready
**Build:** ✅ Successful
