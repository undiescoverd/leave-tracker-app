import { useCallback } from 'react';
import { toast } from 'sonner';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    let errorMessage = fallbackMessage;

    // Extract error message if it's an Error object
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Log error for development/debugging
    if (logError) {
      console.error('Error handled:', error);
    }

    // Show toast notification
    if (showToast) {
      toast.error(errorMessage);
    }

    return errorMessage;
  }, []);

  const handleApiError = useCallback((
    error: unknown,
    fallbackMessage = 'Failed to communicate with server'
  ) => {
    return handleError(error, {
      showToast: true,
      logError: true,
      fallbackMessage
    });
  }, [handleError]);

  return {
    handleError,
    handleApiError
  };
}