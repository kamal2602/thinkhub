export class AppError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public details?: any,
    public statusCode: number = 400
  ) {
    super(userMessage);
    this.name = 'AppError';
  }
}

export function handleSupabaseError(error: any, context: string): AppError {
  console.error(`[${context}] Supabase error:`, error);

  const errorMessages: Record<string, string> = {
    '23505': 'This item already exists',
    '23503': 'Cannot delete - item is being used elsewhere',
    '42501': 'You don\'t have permission to do that',
    'PGRST116': 'No items found',
    'PGRST204': 'No items found',
    '42P01': 'Database table not found',
    '22P02': 'Invalid data format',
  };

  const message = errorMessages[error.code] ||
    error.message ||
    'Something went wrong. Please try again.';

  return new AppError(
    error.code || 'UNKNOWN',
    message,
    error,
    error.status || 500
  );
}

export function isNetworkError(error: any): boolean {
  return error.message?.includes('Failed to fetch') ||
         error.message?.includes('Network request failed') ||
         !navigator.onLine;
}

export function getUserFriendlyError(error: any): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (isNetworkError(error)) {
    return 'Network connection lost. Please check your internet connection.';
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
