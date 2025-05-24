import { ToastType } from '../components/ui/Toast';

// واجهة خيارات التنبيه
export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

// دالة عرض التنبيهات
export function toast(options: ToastOptions) {
  // استخدام useToast من الهوك إذا كان متاحاً
  if (typeof window !== 'undefined' && window.showToast) {
    window.showToast(options);
    return;
  }
  
  // استخدام وحدة التحكم كبديل إذا لم يكن هناك واجهة مستخدم
  const prefix = options.type === 'error' ? '❌' : 
                options.type === 'success' ? '✅' : 
                options.type === 'warning' ? '⚠️' : 'ℹ️';
  
  console.log(`${prefix} ${options.title}`);
  if (options.description) {
    console.log(`   ${options.description}`);
  }
}

// تعريف النافذة لإضافة دالة showToast
declare global {
  interface Window {
    showToast?: (options: ToastOptions) => void;
  }
}