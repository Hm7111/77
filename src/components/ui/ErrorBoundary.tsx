import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * مكون ErrorBoundary لالتقاط الأخطاء في شجرة المكونات
 * يعرض واجهة مستخدم بديلة عند حدوث خطأ بدلاً من تعطل التطبيق
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // تسجيل الخطأ في خدمة تتبع الأخطاء
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // استدعاء معالج الخطأ المخصص إذا تم توفيره
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // إعادة تعيين الحالة عند تغيير resetKey
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      // عرض واجهة المستخدم البديلة
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // واجهة مستخدم افتراضية للخطأ
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-center">
          <div className="max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">
              {this.state.error?.message || 'حدث خطأ أثناء عرض هذا المحتوى'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * مكون ErrorFallback لعرض رسالة خطأ بسيطة
 */
export function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg text-center">
      <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400 mx-auto mb-3" />
      <h2 className="text-lg font-bold text-red-700 dark:text-red-300 mb-2">
        حدث خطأ غير متوقع
      </h2>
      <p className="text-red-600 dark:text-red-400 mb-4">
        {error?.message || 'حدث خطأ أثناء عرض هذا المحتوى'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}