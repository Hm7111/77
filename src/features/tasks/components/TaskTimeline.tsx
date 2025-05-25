import { 
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  MessageSquare,
  Calendar,
  User,
  Pause 
} from 'lucide-react';
import { TaskLog, TaskStatus } from '../types';

interface TaskTimelineProps {
  logs: TaskLog[];
  className?: string;
}

/**
 * مكون خط زمني لتتبع سجل المهمة
 */
export function TaskTimeline({ logs, className = '' }: TaskTimelineProps) {
  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // الحصول على أيقونة ولون للإجراء
  const getActionInfo = (action: string, status?: TaskStatus | null) => {
    switch (action) {
      case 'create':
        return {
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'تم إنشاء المهمة'
        };
      case 'update_status':
        if (status === 'in_progress') {
          return {
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
            label: 'بدء العمل على المهمة'
          };
        } else if (status === 'completed') {
          return {
            icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            bgColor: 'bg-green-100 dark:bg-green-900/30',
            label: 'تم إكمال المهمة'
          };
        } else if (status === 'rejected') {
          return {
            icon: <X className="h-5 w-5 text-red-500" />,
            bgColor: 'bg-red-100 dark:bg-red-900/30',
            label: 'تم رفض المهمة'
          };
        } else if (status === 'postponed') {
          return {
            icon: <Pause className="h-5 w-5 text-purple-500" />,
            bgColor: 'bg-purple-100 dark:bg-purple-900/30',
            label: 'تم تأجيل المهمة'
          };
        } else {
          return {
            icon: <Clock className="h-5 w-5 text-gray-500" />,
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            label: 'تم تحديث الحالة'
          };
        }
      case 'update_details':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-blue-500" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'تم تحديث التفاصيل'
        };
      case 'comment':
        return {
          icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'تعليق جديد'
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5 text-gray-500" />,
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          label: 'إجراء'
        };
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {logs.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          لا توجد سجلات للمهمة
        </div>
      ) : (
        <>
          {logs.map((log, index) => {
            const { icon, bgColor, label } = getActionInfo(log.action, log.new_status);
            
            return (
              <div key={log.id} className="flex gap-4 relative">
                {/* الخط العمودي الذي يربط بين الخطوات */}
                {index < logs.length - 1 && (
                  <div className="absolute right-3 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
                )}
                
                {/* دائرة الحالة */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${bgColor} flex-shrink-0`}>
                  {icon}
                </div>
                
                {/* تفاصيل الإجراء */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                      {log.user && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                          <User className="h-4 w-4 ml-1" />
                          <span>{log.user.full_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Calendar className="h-3.5 w-3.5 ml-1" />
                      <span>{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                  
                  {log.notes && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                      {log.notes}
                    </div>
                  )}
                  
                  {log.previous_status && log.new_status && (
                    <div className="mt-2 text-sm flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {log.previous_status === 'new' ? 'جديدة' : 
                         log.previous_status === 'in_progress' ? 'قيد التنفيذ' : 
                         log.previous_status === 'completed' ? 'مكتملة' : 
                         log.previous_status === 'rejected' ? 'مرفوضة' : 'مؤجلة'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {log.new_status === 'new' ? 'جديدة' : 
                         log.new_status === 'in_progress' ? 'قيد التنفيذ' : 
                         log.new_status === 'completed' ? 'مكتملة' : 
                         log.new_status === 'rejected' ? 'مرفوضة' : 'مؤجلة'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}