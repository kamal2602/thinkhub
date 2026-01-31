import { useState } from 'react';

interface BulkOperationOptions<T> {
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
  onComplete?: () => void;
  onError?: (error: Error, item: T, index: number) => void;
}

interface BulkOperationReturn<T> {
  execute: (items: T[]) => Promise<void>;
  progress: number;
  total: number;
  percentage: number;
  isProcessing: boolean;
  errors: Array<{ item: T; error: Error; index: number }>;
  successCount: number;
}

export function useBulkOperation<T>(
  operation: (item: T, index: number) => Promise<void>,
  options?: BulkOperationOptions<T>
): BulkOperationReturn<T> {
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Array<{ item: T; error: Error; index: number }>>([]);
  const [successCount, setSuccessCount] = useState(0);

  const execute = async (items: T[]) => {
    setTotal(items.length);
    setProgress(0);
    setErrors([]);
    setSuccessCount(0);
    setIsProcessing(true);

    const batchSize = options?.batchSize || 10;
    let completed = 0;
    let successful = 0;

    try {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map((item, batchIndex) => {
            const index = i + batchIndex;
            return operation(item, index);
          })
        );

        results.forEach((result, batchIndex) => {
          const index = i + batchIndex;
          if (result.status === 'rejected') {
            const error = result.reason;
            setErrors(prev => [...prev, { item: batch[batchIndex], error, index }]);
            options?.onError?.(error, batch[batchIndex], index);
          } else {
            successful++;
          }
        });

        completed = Math.min(i + batchSize, items.length);
        setProgress(completed);
        setSuccessCount(successful);
        options?.onProgress?.(completed, items.length);
      }
    } finally {
      setIsProcessing(false);
      options?.onComplete?.();
    }
  };

  return {
    execute,
    progress,
    total,
    percentage: total > 0 ? (progress / total) * 100 : 0,
    isProcessing,
    errors,
    successCount,
  };
}
