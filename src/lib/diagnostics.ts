import { supabase } from './supabase';
import { toast } from './toast';

/**
 * نظام تشخيص الأخطاء المتكامل
 * يساعد في تحديد وتسجيل وتصحيح الأخطاء بشكل آلي
 */

// أنواع الأخطاء المدعومة
export enum ErrorType {
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  WORKFLOW = 'workflow',
  UNKNOWN = 'unknown'
}

// واجهة تفاصيل الخطأ
export interface ErrorDetails {
  type: ErrorType;
  code?: string;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  path?: string;
  suggestions?: string[];
}

// سجل الأخطاء
const errorLog: ErrorDetails[] = [];

/**
 * تحليل أخطاء Supabase وتصنيفها
 */
export function analyzeSupabaseError(error: any): ErrorDetails {
  // الحصول على معرف المستخدم الحالي إن وجد
  const userId = supabase.auth.getUser()?.data?.user?.id;
  
  // تحليل رمز الخطأ
  const errorCode = error?.code || '';
  const errorMessage = error?.message || 'حدث خطأ غير معروف';
  const path = window.location.pathname;
  
  let errorType = ErrorType.UNKNOWN;
  let suggestions: string[] = [];
  
  // تصنيف الخطأ بناءً على الرمز
  if (errorCode.startsWith('22') || errorCode.startsWith('23') || errorCode.startsWith('42')) {
    errorType = ErrorType.DATABASE;
    
    // تحليل أخطاء قاعدة البيانات الشائعة
    if (errorCode === '23505') {
      suggestions.push('هناك قيمة مكررة في قاعدة البيانات');
      suggestions.push('تحقق من أن القيمة المدخلة غير موجودة مسبقاً');
    } else if (errorCode === '23503') {
      suggestions.push('هناك قيود مرجعية تمنع هذه العملية');
      suggestions.push('تحقق من وجود سجلات مرتبطة بهذا العنصر');
    } else if (errorCode === '42P01') {
      suggestions.push('الجدول المطلوب غير موجود في قاعدة البيانات');
    } else if (errorCode === '42703') {
      suggestions.push('العمود المطلوب غير موجود في الجدول');
    } else if (errorCode === '42804') {
      suggestions.push('هناك تعارض في نوع البيانات');
      suggestions.push('تأكد من تحويل القيم إلى النوع الصحيح باستخدام ::type');
    }
  } else if (errorCode.startsWith('PGRST')) {
    errorType = ErrorType.PERMISSION;
    suggestions.push('تحقق من صلاحيات الوصول للمستخدم الحالي');
    suggestions.push('تأكد من تكوين سياسات RLS بشكل صحيح');
  } else if (errorCode === 'PGRST301') {
    errorType = ErrorType.PERMISSION;
    suggestions.push('المستخدم ليس لديه صلاحية للوصول إلى هذا المورد');
  } else if (errorCode === 'auth/invalid-email' || errorCode === 'auth/wrong-password') {
    errorType = ErrorType.AUTHENTICATION;
    suggestions.push('تحقق من صحة بيانات تسجيل الدخول');
  } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    errorType = ErrorType.NETWORK;
    suggestions.push('تحقق من اتصالك بالإنترنت');
    suggestions.push('قد تكون هناك مشكلة في الخادم، حاول مرة أخرى لاحقاً');
  } else if (errorMessage.includes('workflow') || errorMessage.includes('status')) {
    errorType = ErrorType.WORKFLOW;
    suggestions.push('تحقق من حالة سير العمل الحالية');
    suggestions.push('تأكد من أن الإجراء متوافق مع حالة سير العمل الحالية');
  }
  
  // إنشاء كائن تفاصيل الخطأ
  const errorDetails: ErrorDetails = {
    type: errorType,
    code: errorCode,
    message: errorMessage,
    originalError: error,
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent
    },
    timestamp: new Date(),
    userId,
    path,
    suggestions
  };
  
  // تسجيل الخطأ
  logError(errorDetails);
  
  return errorDetails;
}

/**
 * تسجيل الخطأ في السجل المحلي وإرساله للخادم إذا أمكن
 */
export function logError(errorDetails: ErrorDetails): void {
  // إضافة الخطأ للسجل المحلي
  errorLog.push(errorDetails);
  
  // طباعة الخطأ في وحدة التحكم للتشخيص
  console.error('Diagnostic Error:', errorDetails);
  
  // محاولة إرسال الخطأ للخادم لتتبعه
  try {
    // يمكن إضافة كود لإرسال الخطأ للخادم هنا
    // مثال: sendErrorToServer(errorDetails);
  } catch (e) {
    // تجاهل أخطاء الإرسال
    console.warn('Failed to send error to server:', e);
  }
  
  // تخزين الأخطاء في التخزين المحلي للرجوع إليها لاحقاً
  const storedErrors = JSON.parse(localStorage.getItem('error_log') || '[]');
  storedErrors.push(errorDetails);
  
  // الاحتفاظ بآخر 50 خطأ فقط لتجنب امتلاء التخزين
  if (storedErrors.length > 50) {
    storedErrors.splice(0, storedErrors.length - 50);
  }
  
  localStorage.setItem('error_log', JSON.stringify(storedErrors));
}

/**
 * عرض رسالة خطأ للمستخدم مع اقتراحات للحل
 */
export function showErrorWithSuggestions(errorDetails: ErrorDetails): void {
  // إنشاء رسالة الخطأ
  let message = errorDetails.message;
  
  // إضافة اقتراحات إذا وجدت
  if (errorDetails.suggestions && errorDetails.suggestions.length > 0) {
    message += '\n\nاقتراحات للحل:\n';
    message += errorDetails.suggestions.map(s => `- ${s}`).join('\n');
  }
  
  // عرض الخطأ للمستخدم
  toast({
    title: `خطأ: ${getErrorTypeLabel(errorDetails.type)}`,
    description: message,
    type: 'error'
  });
}

/**
 * الحصول على تسمية نوع الخطأ بالعربية
 */
function getErrorTypeLabel(type: ErrorType): string {
  switch (type) {
    case ErrorType.DATABASE:
      return 'قاعدة البيانات';
    case ErrorType.AUTHENTICATION:
      return 'المصادقة';
    case ErrorType.NETWORK:
      return 'الشبكة';
    case ErrorType.VALIDATION:
      return 'التحقق من الصحة';
    case ErrorType.PERMISSION:
      return 'الصلاحيات';
    case ErrorType.WORKFLOW:
      return 'سير العمل';
    default:
      return 'غير معروف';
  }
}

/**
 * تشخيص خطأ سير العمل
 */
export function diagnoseWorkflowError(error: any): ErrorDetails {
  const baseError = analyzeSupabaseError(error);
  
  // تحليل إضافي لأخطاء سير العمل
  if (error.message.includes('معرف طلب الموافقة غير صالح')) {
    baseError.suggestions = [
      'تأكد من أن معرف طلب الموافقة صحيح وموجود',
      'تحقق من أن المستخدم الحالي لديه صلاحية للوصول إلى هذا الطلب',
      'تأكد من أن الطلب لم يتم معالجته مسبقاً'
    ];
  } else if (error.message.includes('signatureId is not defined')) {
    baseError.suggestions = [
      'تأكد من وجود توقيع للمستخدم',
      'قم بإضافة توقيع من صفحة الإعدادات قبل الموافقة على الطلبات',
      'تحقق من تمرير معرف التوقيع بشكل صحيح'
    ];
  } else if (error.message.includes('column "previous_status" is of type workflow_state')) {
    baseError.suggestions = [
      'هناك مشكلة في تحويل نوع البيانات في قاعدة البيانات',
      'يجب تحويل القيمة النصية إلى نوع workflow_state باستخدام ::workflow_state',
      'تحقق من وظيفة قاعدة البيانات المستخدمة للموافقة أو الرفض'
    ];
  }
  
  return baseError;
}

/**
 * تشخيص خطأ قاعدة البيانات
 */
export function diagnoseDatabaseError(error: any): ErrorDetails {
  const baseError = analyzeSupabaseError(error);
  
  // تحليل إضافي لأخطاء قاعدة البيانات
  if (error.code === '42804') {
    baseError.suggestions = [
      'هناك تعارض في نوع البيانات المستخدم',
      'تأكد من تحويل القيم إلى النوع الصحيح باستخدام ::type',
      'راجع تعريف الجدول والأعمدة في قاعدة البيانات'
    ];
  }
  
  return baseError;
}

/**
 * الحصول على سجل الأخطاء
 */
export function getErrorLog(): ErrorDetails[] {
  return [...errorLog];
}

/**
 * مسح سجل الأخطاء
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
  localStorage.removeItem('error_log');
}

/**
 * تصدير سجل الأخطاء كملف JSON
 */
export function exportErrorLog(): string {
  const log = JSON.stringify(errorLog, null, 2);
  const blob = new Blob([log], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

/**
 * دالة مساعدة لمعالجة الأخطاء في الوظائف غير المتزامنة
 */
export function withErrorHandling<T>(
  fn: (...args: any[]) => Promise<T>,
  errorHandler?: (error: ErrorDetails) => void
): (...args: any[]) => Promise<T | null> {
  return async (...args: any[]): Promise<T | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorDetails = analyzeSupabaseError(error);
      
      // عرض الخطأ للمستخدم
      showErrorWithSuggestions(errorDetails);
      
      // استدعاء معالج الخطأ المخصص إذا تم توفيره
      if (errorHandler) {
        errorHandler(errorDetails);
      }
      
      return null;
    }
  };
}