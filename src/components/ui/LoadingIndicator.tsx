import React from 'react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

/**
 * مكون مؤشر التحميل
 * يعرض مؤشر دوران مع نص اختياري
 */
export function LoadingIndicator({
  size = 'md',
  color = 'primary',
  className = '',
  text,
  fullScreen = false
}: LoadingIndicatorProps) {
  // تحديد حجم المؤشر
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4'
  };

  // تحديد لون المؤشر
  const colorClasses = {
    primary: 'border-t-primary border-b-transparent border-l-primary border-r-transparent',
    white: 'border-t-white border-b-transparent border-l-white border-r-transparent',
    gray: 'border-t-gray-600 border-b-transparent border-l-gray-600 border-r-transparent'
  };

  // إذا كان مؤشر التحميل يملأ الشاشة
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-xl flex flex-col items-center">
          <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}></div>
          {text && <p className="mt-4 text-gray-700 dark:text-gray-300">{text}</p>}
        </div>
      </div>
    );
  }

  // مؤشر تحميل عادي
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}></div>
        {text && <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>}
      </div>
    </div>
  );
}

/**
 * مكون مؤشر تحميل للأزرار
 */
export function ButtonLoadingIndicator({
  color = 'white',
  size = 'sm',
  className = ''
}: {
  color?: 'primary' | 'white' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-5 w-5 border-2'
  };

  const colorClasses = {
    primary: 'border-t-primary border-b-transparent border-l-primary border-r-transparent',
    white: 'border-t-white/90 border-b-transparent border-l-white/90 border-r-transparent',
    gray: 'border-t-gray-600 border-b-transparent border-l-gray-600 border-r-transparent'
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}></div>
  );
}