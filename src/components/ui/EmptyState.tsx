import React from 'react';
import { FileText, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  isError?: boolean;
  isLoading?: boolean;
  className?: string;
}

/**
 * مكون لعرض حالة فارغة أو خطأ أو تحميل
 * يستخدم في حالة عدم وجود بيانات أو حدوث خطأ أو أثناء التحميل
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  isError = false,
  isLoading = false,
  className = ''
}: EmptyStateProps) {
  // تحديد الأيقونة الافتراضية
  const defaultIcon = isError ? (
    <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
  ) : isLoading ? (
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
  ) : (
    <FileText className="h-12 w-12 text-gray-400 dark:text-gray-600" />
  );

  // تحديد لون الخلفية
  const bgColorClass = isError
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30'
    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800';

  return (
    <div className={`p-8 text-center border rounded-lg shadow-sm ${bgColorClass} ${className}`}>
      <div className="flex flex-col items-center">
        <div className="mb-4">
          {icon || defaultIcon}
        </div>
        
        <h3 className={`text-lg font-medium mb-2 ${
          isError ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'
        }`}>
          {title}
        </h3>
        
        {description && (
          <p className={`mb-6 max-w-md mx-auto ${
            isError ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
          }`}>
            {description}
          </p>
        )}
        
        {action && (
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={action.onClick}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isError
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {action.icon || (isError ? <RefreshCw className="h-4 w-4" /> : null)}
              {action.label}
            </button>
            
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * مكون لعرض حالة نتائج بحث فارغة
 */
export function EmptySearchResults({
  searchTerm,
  onClearSearch,
  className = ''
}: {
  searchTerm: string;
  onClearSearch: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="لا توجد نتائج مطابقة"
      description={`لم يتم العثور على نتائج مطابقة لـ "${searchTerm}". جرب استخدام كلمات بحث أخرى.`}
      icon={<Search className="h-12 w-12 text-gray-400 dark:text-gray-600" />}
      action={{
        label: 'مسح البحث',
        onClick: onClearSearch,
        icon: <X className="h-4 w-4" />
      }}
      className={className}
    />
  );
}

function X(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}