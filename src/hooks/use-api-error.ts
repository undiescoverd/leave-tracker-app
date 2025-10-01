"use client";

import { useCallback } from 'react';
import { toast } from 'sonner';

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export function useApiError() {
  const handleApiError = useCallback((error: unknown, defaultMessage = 'An unexpected error occurred'): ApiError => {
    const errorDetails: ApiError = {
      message: defaultMessage,
      status: 500
    };

    if (error instanceof Error) {
      errorDetails.message = error.message;
      
      // Parse error messages that might contain status codes
      const statusMatch = error.message.match(/Failed to \w+: (\d+)/);
      if (statusMatch) {
        errorDetails.status = parseInt(statusMatch[1]);
      }
    } else if (typeof error === 'string') {
      errorDetails.message = error;
    }

    // Determine user-friendly message based on status
    const getUserFriendlyMessage = (status?: number, message?: string) => {
      switch (status) {
        case 401:
          return 'You are not authenticated. Please log in again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return 'This action conflicts with the current state. Please refresh and try again.';
        case 422:
          return 'The submitted data is invalid. Please check your inputs.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
        case 502:
        case 503:
          return 'Server error. Please try again in a few moments.';
        default:
          return message || defaultMessage;
      }
    };

    const userFriendlyMessage = getUserFriendlyMessage(errorDetails.status, errorDetails.message);
    errorDetails.message = userFriendlyMessage;

    // Log detailed error for debugging
    console.error('API Error:', {
      originalError: error,
      parsedError: errorDetails
    });

    return errorDetails;
  }, []);

  const showApiError = useCallback((error: unknown, defaultMessage?: string) => {
    const errorDetails = handleApiError(error, defaultMessage);
    toast.error(errorDetails.message);
    return errorDetails;
  }, [handleApiError]);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: ApiError) => void;
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: ApiError }> => {
    try {
      if (options.loadingMessage) {
        toast.loading(options.loadingMessage);
      }

      const result = await operation();

      if (options.loadingMessage) {
        toast.dismiss();
      }

      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      options.onSuccess?.(result);

      return { success: true, data: result };
    } catch (error) {
      if (options.loadingMessage) {
        toast.dismiss();
      }

      const errorDetails = showApiError(error, options.errorMessage);
      options.onError?.(errorDetails);

      return { success: false, error: errorDetails };
    }
  }, [showApiError]);

  return {
    handleApiError,
    showApiError,
    handleAsyncOperation
  };
}