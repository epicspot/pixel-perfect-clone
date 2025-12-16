import { useState, useCallback } from 'react';
import { setGlobalLoading } from './useLoadingProgress';

interface UseFormLoadingOptions {
  onSubmit: () => Promise<void>;
  showGlobalProgress?: boolean;
}

export function useFormLoading({ onSubmit, showGlobalProgress = true }: UseFormLoadingOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    if (showGlobalProgress) {
      setGlobalLoading(true);
    }
    
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
      if (showGlobalProgress) {
        setGlobalLoading(false);
      }
    }
  }, [onSubmit, showGlobalProgress]);

  return { isSubmitting, handleSubmit };
}

// Helper to wrap async operations with loading state
export function withLoading<T>(
  asyncFn: () => Promise<T>,
  setLoading: (loading: boolean) => void
): Promise<T> {
  setLoading(true);
  setGlobalLoading(true);
  
  return asyncFn().finally(() => {
    setLoading(false);
    setGlobalLoading(false);
  });
}
