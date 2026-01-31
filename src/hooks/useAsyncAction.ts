import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { AppError, getUserFriendlyError } from '../lib/errorHandling';

interface UseAsyncActionOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAsyncAction<T extends any[]>(
  action: (...args: T) => Promise<void>,
  options?: UseAsyncActionOptions
) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (...args: T) => {
    setLoading(true);
    setError(null);

    try {
      await action(...args);
      if (options?.successMessage) {
        showToast(options.successMessage, 'success');
      }
      options?.onSuccess?.();
    } catch (err: any) {
      const appError = err instanceof AppError ? err :
        new AppError('UNKNOWN', options?.errorMessage || getUserFriendlyError(err), err);

      setError(appError);
      showToast(appError.userMessage, 'error');
      options?.onError?.(appError);

      throw appError;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
  };

  return { execute, loading, error, reset };
}
