import { Clock, CheckCircle, X, AlertTriangle, CheckSquare, FileCheck, HourglassIcon, Send } from 'lucide-react';
import { WorkflowState } from '../../types/database';

interface WorkflowStatusProps {
  status: WorkflowState | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withIcon?: boolean;
}

/**
 * مكون لعرض حالة سير العمل
 * يستخدم WorkflowStatusBadge من مكتبة المكونات
 */
export function WorkflowStatus(props: WorkflowStatusProps) {
  const getStatusInfo = (status: string | null | undefined) => {
    if (!status) {
      return {
        label: 'غير محدد',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-300',
        icon: <AlertTriangle className="h-3.5 w-3.5" />
      };
    }

    switch (status) {
      case 'draft':
        return {
          label: 'مسودة',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-300',
          icon: <Clock className="h-3.5 w-3.5" />
        };
      case 'submitted':
        return {
          label: 'تم الإرسال',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
          icon: <Send className="h-3.5 w-3.5" />
        };
      case 'under_review':
        return {
          label: 'قيد المراجعة',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
          icon: <HourglassIcon className="h-3.5 w-3.5" />
        };
      case 'approved':
        return {
          label: 'معتمد',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
          icon: <CheckCircle className="h-3.5 w-3.5" />
        };
      case 'rejected':
        return {
          label: 'مرفوض',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
          icon: <X className="h-3.5 w-3.5" />
        };
      case 'finalized':
        return {
          label: 'نهائي',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
          icon: <CheckSquare className="h-3.5 w-3.5" />
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-300',
          icon: <AlertTriangle className="h-3.5 w-3.5" />
        };
    }
  };

  const { status, className = '', size = 'md', withIcon = true } = props;
  const { label, className: statusClassName, icon } = getStatusInfo(status);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-medium'
  };
  
  const sizeClass = sizeClasses[size];
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeClass} ${statusClassName} ${className}`}>
      {withIcon && icon}
      {label}
    </span>
  );
}