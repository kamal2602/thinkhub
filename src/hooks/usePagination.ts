import { useState, useEffect } from 'react';

interface PaginationResult<T> {
  data: T[];
  total: number;
}

interface UsePaginationReturn<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading: boolean;
  error: Error | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
}

export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<PaginationResult<T>>,
  initialPageSize = 50
): UsePaginationReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const fetchPage = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(pageNum, pageSize);
      setData(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (err: any) {
      setError(err);
      console.error('Pagination error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(page);
  }, [page, pageSize]);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages,
    loading,
    error,
    goToPage: (pageNum: number) => {
      if (pageNum >= 1 && pageNum <= totalPages) {
        setPage(pageNum);
      }
    },
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    refresh: () => fetchPage(page),
  };
}
