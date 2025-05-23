import { useState, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

/**
 * هوك مخصص لتنفيذ العمليات غير المتزامنة مع معالجة الحالة والأخطاء
 * يوفر حالة التحميل والأخطاء ودالة لتنفيذ العملية
 */
export function useAsyncAction<T, P extends any[]>(
  asyncFn: (...args: P) => Promise<T>,
  options?: {
    onSuccess?: (data: T, ...args: P) => void;
    onError?: (error: any, ...args: P) => void;
    errorMessage?: string;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const errorHandler = useErrorHandler();

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await asyncFn(...args);
        setData(result);
        
        if (options?.onSuccess) {
          options.onSuccess(result, ...args);
        }
        
        return result;
      } catch (err: any) {
        const errorDetails = errorHandler.handleSupabaseError(
          err, 
          options?.errorMessage || 'حدث خطأ أثناء تنفيذ العملية'
        );
        
        setError(new Error(errorDetails.message));
        
        if (options?.onError) {
          options.onError(err, ...args);
        }
        
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFn, options, errorHandler]
  );

  return {
    execute,
    isLoading,
    error,
    data,
    reset: useCallback(() => {
      setData(null);
      setError(null);
    }, [])
  };
}