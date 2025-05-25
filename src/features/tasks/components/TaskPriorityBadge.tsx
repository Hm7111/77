import { TaskPriority } from '../types';
import { Flag } from 'lucide-react';

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * شارة أولوية المهمة
 */
export function TaskPriorityBadge({ priority, size = 'md', className = '' }: TaskPriorityBadgeProps) {
  const getPriorityInfo = (priority: TaskPriority) => {
    switch(priority) {
      case 'high':
        return {
          label: 'عالية',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-800 dark:text-red-300',
          icon: <Flag className="h-3.5 w-3.5" />
        };
      case 'medium':
        return {
          label: 'متوسطة',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          icon: <Flag className="h-3.5 w-3.5" />
        };
      case 'low':
        return {
          label: 'منخفضة',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-300',
          icon: <Flag className="h-3.5 w-3.5" />
        };
      default:
        return {
          label: 'غير محددة',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          textColor: 'text-gray-800 dark:text-gray-300',
          icon: <Flag className="h-3.5 w-3.5" />
        };
    }
  };

  const { label, bgColor, textColor, icon } = getPriorityInfo(priority);
  
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