import { supabase } from './supabase';
import { useErrorHandler } from '../hooks/useErrorHandler';

/**
 * وظيفة مساعدة لتنفيذ استعلامات Supabase مع معالجة الأخطاء
 * @param queryFn دالة الاستعلام التي تستخدم كائن supabase
 * @param errorMessage رسالة الخطأ الافتراضية
 * @returns نتيجة الاستعلام
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorMessage = 'حدث خطأ أثناء تنفيذ الاستعلام'
): Promise<T> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    if (data === null) {
      throw new Error('لم يتم العثور على بيانات');
    }
    
    return data;
  } catch (error: any) {
    console.error('Query execution error:', error);
    
    // تحسين رسائل الخطأ
    let message = errorMessage;
    if (error.code === 'PGRST301') {
      message = 'غير مصرح لك بالوصول إلى هذا المورد';
    } else if (error.code === '23505') {
      message = 'هذا العنصر موجود بالفعل';
    } else if (error.code === '23503') {
      message = 'لا يمكن حذف هذا العنصر لأنه مرتبط بعناصر أخرى';
    } else if (error.message) {
      message = error.message;
    }
    
    const enhancedError = new Error(message);
    (enhancedError as any).originalError = error;
    (enhancedError as any).code = error.code;
    throw enhancedError;
  }
}

/**
 * هوك مخصص لاستخدام API مع معالجة الأخطاء
 */
export function useApiClient() {
  const errorHandler = useErrorHandler();
  
  return {
    /**
     * تنفيذ استعلام مع معالجة الأخطاء
     */
    async query<T>(
      queryFn: () => Promise<{ data: T | null; error: any }>,
      errorMessage = 'حدث خطأ أثناء تنفيذ الاستعلام'
    ): Promise<T> {
      try {
        return await executeQuery(queryFn, errorMessage);
      } catch (error) {
        errorHandler.handleSupabaseError(error, errorMessage);
        throw error;
      }
    },
    
    /**
     * تنفيذ عملية RPC مع معالجة الأخطاء
     */
    async rpc<T>(
      functionName: string,
      params: Record<string, any> = {},
      errorMessage = 'حدث خطأ أثناء تنفيذ العملية'
    ): Promise<T> {
      try {
        const { data, error } = await supabase.rpc(functionName, params);
        
        if (error) {
          console.error(`RPC error (${functionName}):`, error);
          throw error;
        }
        
        if (data === null) {
          throw new Error('لم يتم العثور على بيانات');
        }
        
        return data as T;
      } catch (error) {
        errorHandler.handleSupabaseError(error, errorMessage);
        throw error;
      }
    }
  };
}