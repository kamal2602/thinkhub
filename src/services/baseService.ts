import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export class AppError extends Error {
  constructor(
    message: string,
    public originalError?: PostgrestError | Error | unknown,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export abstract class BaseService {
  protected handleError(error: PostgrestError | Error | unknown, operation: string): never {
    console.error(`Error in ${operation}:`, error);

    if (error && typeof error === 'object' && 'message' in error) {
      throw new AppError(
        `Failed to ${operation}: ${error.message}`,
        error
      );
    }

    throw new AppError(`Failed to ${operation}`, error);
  }

  protected async executeQuery<T>(
    queryFn: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await queryFn();
    } catch (error) {
      this.handleError(error, errorMessage);
    }
  }

  protected get supabase() {
    return supabase;
  }
}
