import { Clock, CheckCircle, X, AlertTriangle, CheckSquare, FileCheck, HourglassIcon } from 'lucide-react';
import { WorkflowState } from '../types';

interface WorkflowStatusBadgeProps {
  status: WorkflowState | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withIcon?: boolean;
}

/**
 * شارة لعرض حالة سير العمل
 */
export function WorkflowStatusBadge({ 
  status, 
  className = '', 
  size = 'md',
  withIcon = true
}: WorkflowStatusBadgeProps) {
  if (!status) {
    return null;
  }
  
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'draft':
        return {
          label: 'مسودة',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
          icon: <Clock className="h-3.5 w-3.5" />
        };
      case 'submitted':
        return {
          label: 'تم الإرسال',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
          icon: <FileCheck className="h-3.5 w-3.5" />
        };
      case 'under_review':
        return {
          label: 'قيد المراجعة',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
          icon: <HourglassIcon className="h-3.5 w-3.5" />
        };
      case 'approved':
        return {
          label: 'معتمد',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          icon: <CheckCircle className="h-3.5 w-3.5" />
        };
      case 'rejected':
        return {
          label: 'مرفوض',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          icon: <X className="h-3.5 w-3.5" />
        };
      case 'finalized':
        return {
          label: 'نهائي',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
          icon: <CheckSquare className="h-3.5 w-3.5" />
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
          icon: <AlertTriangle className="h-3.5 w-3.5" />
        };
    }
  };
  
  const { label, className: statusClassName, icon } = getStatusInfo(status);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };
  
  const sizeClass = sizeClasses[size];
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${statusClassName} ${className}`}>
      {withIcon && icon}
      {label}
    </span>
  );
}