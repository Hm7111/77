import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, MoreVertical, Building, MessageSquare, Paperclip } from 'lucide-react';
import { Task } from '../types';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';

interface TaskCardProps {
  task: Task;
  onUpdateStatus?: (taskId: string, status: Task['status']) => void;
  isStatusLoading?: boolean;
}

/**
 * بطاقة عرض المهمة في قائمة المهام
 */
export function TaskCard({ task, onUpdateStatus, isStatusLoading }: TaskCardProps) {
  const navigate = useNavigate();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
  // تنسيق التاريخ
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // التحقق من تأخر المهمة
  const isOverdue = () => {
    if (!task.due_date || task.status === 'completed' || task.status === 'rejected') {
      return false;
    }
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  };
  
  // عرض تفاصيل المهمة
  const handleViewTask = () => {
    navigate(`/admin/tasks/${task.id}`);
  };
  
  // فتح قائمة الإجراءات
  const handleToggleActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionsMenu(!showActionsMenu);
  };
  
  // تحديث حالة المهمة
  const handleUpdateStatus = (e: React.MouseEvent, status: Task['status']) => {
    e.stopPropagation();
    if (onUpdateStatus) {
      onUpdateStatus(task.id, status);
    }
    setShowActionsMenu(false);
  };

  return (
    <div
      className="border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-all cursor-pointer group overflow-hidden"
      onClick={handleViewTask}
    >
      {/* شريط الأولوية */}
      <div className={`h-1 w-full ${
        task.priority === 'high' 
          ? 'bg-red-500'
          : task.priority === 'medium'
          ? 'bg-yellow-500'
          : 'bg-green-500'
      }`} />
      
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold line-clamp-1 text-gray-900 dark:text-white">{task.title}</h3>
            
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <TaskStatusBadge status={task.status} size="sm" />
              <TaskPriorityBadge priority={task.priority} size="sm" />
              
              {isOverdue() && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                  <Clock className="h-3 w-3" />
                  متأخرة
                </span>
              )}
            </div>
          </div>
          
          {/* قائمة الإجراءات */}
          <div className="relative">
            <button
              onClick={handleToggleActions}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showActionsMenu && (
              <div className="absolute left-0 top-full mt-1 z-10 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <div className="py-1">
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'new')}
                    disabled={isStatusLoading || task.status === 'new'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500 ml-2"></span>
                    تعيين كجديدة
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'in_progress')}
                    disabled={isStatusLoading || task.status === 'in_progress'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-yellow-500 ml-2"></span>
                    قيد التنفيذ
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'completed')}
                    disabled={isStatusLoading || task.status === 'completed'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-green-500 ml-2"></span>
                    تمت
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'postponed')}
                    disabled={isStatusLoading || task.status === 'postponed'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-500 ml-2"></span>
                    تأجيل
                  </button>
                  <button
                    onClick={(e) => handleUpdateStatus(e, 'rejected')}
                    disabled={isStatusLoading || task.status === 'rejected'}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500 ml-2"></span>
                    رفض
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* وصف المهمة */}
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
            {task.description}
          </p>
        )}
        
        {/* معلومات المهمة */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{task.assignee.full_name}</span>
            </div>
          )}
          
          {task.branch && (
            <div className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5" />
              <span className="truncate">{task.branch.name}</span>
            </div>
          )}
          
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(task.created_at)}</span>
          </div>
        </div>
        
        {/* تعليقات ومرفقات */}
        <div className="mt-2 pt-2 border-t dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* أيقونة عدد التعليقات - يمكن إضافتها لاحقاً */}
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>0</span>
            </div>
            
            {/* أيقونة عدد المرفقات - يمكن إضافتها لاحقاً */}
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              <span>0</span>
            </div>
          </div>
          
          {isStatusLoading && (
            <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
          )}
        </div>
      </div>
    </div>
  );
}