import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  analyzeSupabaseError, 
  diagnoseWorkflowError, 
  diagnoseDatabaseError,
  ErrorDetails,
  ErrorType,
  logError,
  showErrorWithSuggestions
} from '../lib/diagnostics';
import { DiagnosticsPanel } from '../components/ui/DiagnosticsPanel';

// واجهة سياق التشخيص
interface DiagnosticsContextType {
  isLoading: boolean;
  lastError: ErrorDetails | null;
  diagnoseError: (error: any) => ErrorDetails;
  handleError: (error: any) => ErrorDetails;
  withDiagnostics: <T>(
    fn: (...args: any[]) => Promise<T>,
    options?: {
      showError?: boolean;
      errorType?: ErrorType;
      customErrorHandler?: (error: ErrorDetails) => void;
    }
  ) => ((...args: any[]) => Promise<T | null>);
  openDiagnosticsPanel: () => void;
  closeDiagnosticsPanel: () => void;
}

// إنشاء سياق التشخيص
const DiagnosticsContext = createContext<DiagnosticsContextType | undefined>(undefined);

/**
 * موفر سياق التشخيص
 * يوفر وظائف تشخيص الأخطاء لجميع المكونات
 */
export function DiagnosticsProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<ErrorDetails | null>(null);
  const [diagnosticsPanelOpen, setDiagnosticsPanelOpen] = useState(false);
  
  /**
   * تحليل وتشخيص خطأ
   */
  const diagnoseError = useCallback((error: any): ErrorDetails => {
    // تحديد نوع الخطأ وتشخيصه
    let errorDetails: ErrorDetails;
    
    if (error.message && (
      error.message.includes('workflow') || 
      error.message.includes('approval') || 
      error.message.includes('موافقة') ||
      error.message.includes('status')
    )) {
      // تشخيص خطأ سير العمل
      errorDetails = diagnoseWorkflowError(error);
    } else if (error.code && (
      error.code.startsWith('22') || 
      error.code.startsWith('23') || 
      error.code.startsWith('42')
    )) {
      // تشخيص خطأ قاعدة البيانات
      errorDetails = diagnoseDatabaseError(error);
    } else {
      // تحليل عام للخطأ
      errorDetails = analyzeSupabaseError(error);
    }
    
    // تسجيل الخطأ وتخزينه
    logError(errorDetails);
    setLastError(errorDetails);
    
    return errorDetails;
  }, []);
  
  /**
   * معالجة خطأ وعرضه للمستخدم
   */
  const handleError = useCallback((error: any): ErrorDetails => {
    const errorDetails = diagnoseError(error);
    
    // عرض الخطأ للمستخدم مع اقتراحات
    showErrorWithSuggestions(errorDetails);
    
    return errorDetails;
  }, [diagnoseError]);
  
  /**
   * تغليف دالة غير متزامنة بمعالجة الأخطاء
   */
  const withDiagnostics = useCallback(<T>(
    fn: (...args: any[]) => Promise<T>,
    options?: {
      showError?: boolean;
      errorType?: ErrorType;
      customErrorHandler?: (error: ErrorDetails) => void;
    }
  ): ((...args: any[]) => Promise<T | null>) => {
    return async (...args: any[]): Promise<T | null> => {
      setIsLoading(true);
      try {
        return await fn(...args);
      } catch (error) {
        // تشخيص الخطأ
        const errorDetails = diagnoseError(error);
        
        // تخصيص نوع الخطأ إذا تم توفيره
        if (options?.errorType) {
          errorDetails.type = options.errorType;
        }
        
        // عرض الخطأ للمستخدم إذا كان مطلوباً
        if (options?.showError !== false) {
          showErrorWithSuggestions(errorDetails);
        }
        
        // استدعاء معالج الخطأ المخصص إذا تم توفيره
        if (options?.customErrorHandler) {
          options.customErrorHandler(errorDetails);
        }
        
        return null;
      } finally {
        setIsLoading(false);
      }
    };
  }, [diagnoseError]);
  
  /**
   * فتح لوحة التشخيص
   */
  const openDiagnosticsPanel = useCallback(() => {
    setDiagnosticsPanelOpen(true);
  }, []);
  
  /**
   * إغلاق لوحة التشخيص
   */
  const closeDiagnosticsPanel = useCallback(() => {
    setDiagnosticsPanelOpen(false);
  }, []);
  
  // إنشاء قيمة السياق
  const contextValue: DiagnosticsContextType = {
    isLoading,
    lastError,
    diagnoseError,
    handleError,
    withDiagnostics,
    openDiagnosticsPanel,
    closeDiagnosticsPanel
  };
  
  return (
    <DiagnosticsContext.Provider value={contextValue}>
      {children}
      <DiagnosticsPanel 
        isOpen={diagnosticsPanelOpen} 
        onClose={closeDiagnosticsPanel} 
      />
    </DiagnosticsContext.Provider>
  );
}

/**
 * هوك لاستخدام سياق التشخيص
 */
export function useDiagnostics() {
  const context = useContext(DiagnosticsContext);
  if (context === undefined) {
    throw new Error('useDiagnostics must be used within a DiagnosticsProvider');
  }
  return context;
}