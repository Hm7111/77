import React, { createContext, useContext, ReactNode } from 'react';
import { useErrorHandler, ErrorDetails } from '../hooks/useErrorHandler';

// إنشاء سياق الأخطاء
interface ErrorContextType {
  errors: ErrorDetails[];
  lastError: ErrorDetails | null;
  logError: (error: Error | string | ErrorDetails, context?: Record<string, any>) => ErrorDetails;
  handleApiError: (error: any, fallbackMessage?: string) => ErrorDetails;
  handleSupabaseError: (error: any, fallbackMessage?: string) => ErrorDetails;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

/**
 * موفر سياق الأخطاء للتطبيق
 * يوفر وظائف معالجة الأخطاء لجميع المكونات
 */
export function ErrorProvider({ children }: { children: ReactNode }) {
  const errorHandler = useErrorHandler();

  return (
    <ErrorContext.Provider value={errorHandler}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * هوك مخصص لاستخدام سياق الأخطاء
 */
export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}