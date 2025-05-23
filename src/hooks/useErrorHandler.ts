import { useState, useCallback } from 'react';
import { useToast } from './useToast';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorDetails {
  message: string;
  code?: string;
  severity?: ErrorSeverity;
  context?: Record<string, any>;
  timestamp?: Date;
}

/**
 * هوك مخصص لمعالجة الأخطاء في التطبيق بطريقة موحدة
 * يوفر وظائف لتسجيل الأخطاء وعرضها للمستخدم
 */
export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [lastError, setLastError] = useState<ErrorDetails | null>(null);
  const { toast } = useToast();

  /**
   * تسجيل خطأ جديد
   */
  const logError = useCallback((error: Error | string | ErrorDetails, context?: Record<string, any>) => {
    let errorDetails: ErrorDetails;

    if (typeof error === 'string') {
      errorDetails = {
        message: error,
        severity: 'error',
        context,
        timestamp: new Date()
      };
    } else if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        code: error.name,
        severity: 'error',
        context,
        timestamp: new Date()
      };
    } else {
      errorDetails = {
        ...error,
        severity: error.severity || 'error',
        context: { ...error.context, ...context },
        timestamp: new Date()
      };
    }

    setLastError(errorDetails);
    setErrors(prev => [...prev, errorDetails]);

    // إظهار رسالة خطأ للمستخدم
    if (errorDetails.severity === 'error') {
      toast({
        title: 'خطأ',
        description: errorDetails.message,
        type: 'error'
      });
    } else if (errorDetails.severity === 'warning') {
      toast({
        title: 'تحذير',
        description: errorDetails.message,
        type: 'warning'
      });
    }

    // يمكن إضافة تسجيل الأخطاء على الخادم هنا
    console.error('Application Error:', errorDetails);

    return errorDetails;
  }, [toast]);

  /**
   * معالجة خطأ من استدعاء API
   */
  const handleApiError = useCallback((error: any, fallbackMessage = 'حدث خطأ أثناء الاتصال بالخادم') => {
    let message = fallbackMessage;
    let code = 'API_ERROR';
    let context = {};

    if (error?.response) {
      // خطأ من الخادم مع استجابة
      message = error.response.data?.message || error.response.data?.error || fallbackMessage;
      code = `HTTP_${error.response.status}`;
      context = {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      };
    } else if (error?.request) {
      // لم يتم استلام استجابة
      message = 'لم يتم استلام استجابة من الخادم';
      code = 'NO_RESPONSE';
      context = { request: error.request };
    } else if (error?.message) {
      // خطأ في إعداد الطلب
      message = error.message;
      code = error.code || 'REQUEST_SETUP_ERROR';
    }

    return logError({
      message,
      code,
      severity: 'error',
      context
    });
  }, [logError]);

  /**
   * معالجة خطأ من Supabase
   */
  const handleSupabaseError = useCallback((error: any, fallbackMessage = 'حدث خطأ في قاعدة البيانات') => {
    let message = error?.message || fallbackMessage;
    let code = error?.code || 'SUPABASE_ERROR';
    
    // معالجة أكواد أخطاء Supabase الشائعة
    if (code === '23505') {
      message = 'هذا العنصر موجود بالفعل';
    } else if (code === '23503') {
      message = 'لا يمكن حذف هذا العنصر لأنه مرتبط بعناصر أخرى';
    } else if (code === '42P01') {
      message = 'خطأ في هيكل قاعدة البيانات';
    } else if (code === 'PGRST301') {
      message = 'غير مصرح لك بالوصول إلى هذا المورد';
    }

    return logError({
      message,
      code,
      severity: 'error',
      context: { originalError: error }
    });
  }, [logError]);

  /**
   * مسح قائمة الأخطاء
   */
  const clearErrors = useCallback(() => {
    setErrors([]);
    setLastError(null);
  }, []);

  return {
    errors,
    lastError,
    logError,
    handleApiError,
    handleSupabaseError,
    clearErrors
  };
}