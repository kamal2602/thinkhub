import { useState, useEffect, useMemo, useCallback } from 'react';

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface UseSearchOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  debounceMs?: number;
  caseSensitive?: boolean;
}

export function useSearch<T>({
  data,
  searchFields,
  debounceMs = 300,
  caseSensitive = false
}: UseSearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const debouncedSetSearch = useMemo(
    () => debounce(setDebouncedSearchTerm, debounceMs),
    [debounceMs]
  );

  useEffect(() => {
    debouncedSetSearch(searchTerm);
  }, [searchTerm, debouncedSetSearch]);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return data;
    }

    const term = caseSensitive ? debouncedSearchTerm : debouncedSearchTerm.toLowerCase();

    return data.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;

        const stringValue = String(value);
        const compareValue = caseSensitive ? stringValue : stringValue.toLowerCase();

        return compareValue.includes(term);
      });
    });
  }, [data, debouncedSearchTerm, searchFields, caseSensitive]);

  const highlightMatch = useCallback((text: string) => {
    if (!debouncedSearchTerm.trim()) return text;

    const regex = new RegExp(`(${debouncedSearchTerm})`, caseSensitive ? 'g' : 'gi');
    return text.replace(regex, '<mark className="bg-yellow-200">$1</mark>');
  }, [debouncedSearchTerm, caseSensitive]);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    highlightMatch,
    isSearching: searchTerm !== debouncedSearchTerm,
    hasResults: filteredData.length > 0,
    resultCount: filteredData.length
  };
}
