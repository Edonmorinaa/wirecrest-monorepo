import { toast } from 'src/components/ui/use-toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  title?: string;
  description?: string;
  retryable?: boolean;
  onRetry?: () => void;
}

export interface ApiErrorResponse {
  error?: {
    message?: string;
  };
  message?: string;
}

export class AppError extends Error {
  public readonly title?: string;
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    options: {
      title?: string;
      isRetryable?: boolean;
      originalError?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.title = options.title;
    this.isRetryable = options.isRetryable || false;
    this.originalError = options.originalError;
  }
}

export const parseApiError = (error: any): string => {
  // Handle different error response formats
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.error?.message) {
    return error.error.message;
  }
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

export const handleError = (error: any, options: ErrorHandlerOptions = {}): AppError => {
  const { showToast = true, title = 'Error', description, retryable = false, onRetry } = options;

  console.error('Error occurred:', error);

  const errorMessage = description || parseApiError(error);
  const appError = new AppError(errorMessage, {
    title,
    isRetryable: retryable,
    originalError: error instanceof Error ? error : undefined,
  });

  if (showToast) {
    const toastDescription =
      retryable && onRetry ? `${errorMessage} Click here to try again.` : errorMessage;

    toast({
      title,
      description: toastDescription,
      variant: 'destructive',
    });

    // If retryable and onRetry provided, we can handle click on the toast itself
    if (retryable && onRetry) {
      // Note: This is a simple approach. For more complex retry UIs,
      // implement in the component itself
      setTimeout(() => {
        console.log('Retry option available via component UI');
      }, 0);
    }
  }

  return appError;
};

export const handleApiError = async (
  apiCall: () => Promise<any>,
  options: ErrorHandlerOptions = {}
): Promise<any> => {
  try {
    return await apiCall();
  } catch (error) {
    throw handleError(error, options);
  }
};

export const handleAsyncOperation = async (
  operation: () => Promise<any>,
  options: ErrorHandlerOptions & {
    loadingMessage?: string;
    successMessage?: string;
  } = {}
): Promise<any> => {
  const { loadingMessage, successMessage, ...errorOptions } = options;

  try {
    if (loadingMessage) {
      toast({
        title: 'Processing...',
        description: loadingMessage,
      });
    }

    const result = await operation();

    if (successMessage) {
      toast({
        title: 'Success',
        description: successMessage,
      });
    }

    return result;
  } catch (error) {
    throw handleError(error, errorOptions);
  }
};

// Specific error types for common scenarios
export const createNetworkError = (retryable: boolean = true) =>
  new AppError('Network connection failed. Please check your internet connection.', {
    title: 'Connection Error',
    isRetryable: retryable,
  });

export const createValidationError = (message: string) =>
  new AppError(message, {
    title: 'Validation Error',
    isRetryable: false,
  });

export const createAuthError = () =>
  new AppError('You are not authorized to perform this action.', {
    title: 'Authorization Error',
    isRetryable: false,
  });

export const createNotFoundError = (resource: string = 'Resource') =>
  new AppError(`${resource} not found.`, {
    title: 'Not Found',
    isRetryable: false,
  });

export const createTimeoutError = () =>
  new AppError('The request timed out. Please try again.', {
    title: 'Timeout Error',
    isRetryable: true,
  });

// Removed onboarding-specific error handler
