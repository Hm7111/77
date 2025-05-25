import { TaskStatus } from '../types';
import { Clock, CheckCircle, X, AlertTriangle, Pause } from 'lucide-react';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * شارة حالة المهمة
 */
export function TaskStatusBadge({ status, size = 'md', className = '' }: TaskStatusBadgeProps) {
  const getStatusInfo = (status: TaskStatus) => {
    switch(status) {
      case 'new':
        return {
          label: 'جديدة',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-800 dark:text-blue-300',
          icon: <Clock className="h-3.5 w-3.5" />
        };
      case 'in_progress':
        return {
          label: 'قيد التنفيذ',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          icon: <AlertTriangle className="h-3.5 w-3.5" />
        };
      case 'completed':
        return {
          label: 'مكتملة',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-300',
          icon: <CheckCircle className="h-3.5 w-3.5" />
        };
      case 'rejected':
        return {
          label: 'مرفوضة',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-800 dark:text-red-300',
          icon: <X className="h-3.5 w-3.5" />
        };
      case 'postponed':
        return {
          label: 'مؤجلة',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-800 dark:text-purple-300',
          icon: <Pause className="h-3.5 w-3.5" />
        };
      default:
        return {
          label: 'غير معروفة',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          textColor: 'text-gray-800 dark:text-gray-300',
          icon: <AlertTriangle className="h-3.5 w-3.5" />
        };
    }
  };

  const { label, bgColor, textColor, icon } = getStatusInfo(status);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${bgColor} ${textColor} ${className}`}>
      {icon}
      {label}
    </span>
  );
}