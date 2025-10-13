import { toast } from 'sonner';
import { useTransition } from 'react';

/**
 * Hook to handle server actions with loading states and error handling
 */
export function useServerAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options?: {
    onSuccess?: (result: R) => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [isPending, startTransition] = useTransition();

  const execute = (...args: T) => {
    startTransition(async () => {
      try {
        const result = await action(...args);

        if (options?.successMessage) {
          toast.success(options.successMessage);
        }

        options?.onSuccess?.(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';

        if (options?.errorMessage) {
          toast.error(options.errorMessage);
        } else {
          toast.error(errorMessage);
        }

        options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    });
  };

  return {
    execute,
    isPending,
  };
}
