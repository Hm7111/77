import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  X,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  User,
  Building,
  Flag,
  MessageSquare,
  Pause
} from 'lucide-react';
import { useTaskActions } from '../hooks/useTaskActions';
import { TaskStatus, TaskComment } from '../types';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { TaskPriorityBadge } from '../components/TaskPriorityBadge';
import { TaskTimeline } from '../components/TaskTimeline';
import { TaskAttachments } from '../components/TaskAttachments';
import { TaskCommentForm } from '../components/TaskCommentForm';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../lib/auth';
import { TaskForm } from '../components/TaskForm';

/**
 * صفحة عرض تفاصيل المهمة
 */
export function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, dbUser } = useAuth();
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const {
    useTaskDetails,
    updateTask,
    updateTaskStatus,
    addTaskComment,
    deleteTask,
    uploadTaskAttachment,
    deleteTaskAttachment,
    loading
  } = useTaskActions();
  
  // جلب تفاصيل المهمة
  const { data: task, isLoading, error, refetch } = useTaskDetails(id);
  
  // تنسيق التاريخ
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // تنسيق الوقت
  const formatTime = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // التحقق من تأخر المهمة
  const isOverdue = () => {
    if (!task?.due_date || task.status === 'completed' || task.status === 'rejected') {
      return false;
    }
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  };
  
  // التحقق إذا كان المستخدم الحالي هو المكلف بالمهمة
  const isAssignee = () => {
    return task?.assigned_to === dbUser?.id;
  };
  
  // التحقق إذا كان المستخدم الحالي هو منشئ المهمة
  const isCreator = () => {
    return task?.created_by === dbUser?.id;
  };
  
  // التحقق من صلاحيات التعديل
  const canEdit = () => {
    return isAdmin || isCreator();
  };
  
  // التحقق من صلاحيات الحذف
  const canDelete = () => {
    return isAdmin || isCreator();
  };
  
  // التحقق من صلاحيات تغيير الحالة
  const canChangeStatus = () => {
    return isAdmin || isAssignee();
  };
  
  // تغيير حالة المهمة
  const handleStatusChange = (status: TaskStatus) => {
    if (!id || !canChangeStatus()) return;
    
    updateTaskStatus(
      { id, status }, 
      {
        onSuccess: () => {
          const statusNames = {
            new: 'جديدة',
            in_progress: 'قيد التنفيذ',
            completed: 'مكتملة',
            rejected: 'مرفوضة',
            postponed: 'مؤجلة'
          };
          
          toast({
            title: 'تم تحديث الحالة',
            description: `تم تغيير حالة المهمة إلى "${statusNames[status]}"`,
            type: 'success'
          });
          
          refetch();
        }
      }
    );
  };
  
  // تحديث المهمة
  const handleUpdateTask = async (formData: any) => {
    if (!id || !canEdit()) return;
    
    try {
      await updateTask({ id, ...formData });
      setShowEditForm(false);
      refetch();
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث المهمة بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المهمة',
        type: 'error'
      });
    }
  };
  
  // حذف المهمة
  const handleDeleteTask = () => {
    if (!id || !canDelete()) return;
    
    deleteTask(id, {
      onSuccess: () => {
        toast({
          title: 'تم الحذف',
          description: 'تم حذف المهمة بنجاح',
          type: 'success'
        });
        
        navigate('/admin/tasks');
      }
    });
  };
  
  // إضافة تعليق
  const handleAddComment = (commentText: string) => {
    if (!id) return;
    
    const comment: TaskComment = {
      task_id: id,
      notes: commentText
    };
    
    addTaskComment(comment, {
      onSuccess: () => {
        refetch();
        
        toast({
          title: 'تم إضافة التعليق',
          description: 'تم إضافة التعليق بنجاح',
          type: 'success'
        });
      }
    });
  };
  
  // رفع مرفق
  const handleUploadAttachment = (file: File) => {
    if (!id) return;
    
    uploadTaskAttachment({ taskId: id, file }, {
      onSuccess: () => {
        refetch();
      }
    });
  };
  
  // حذف مرفق
  const handleDeleteAttachment = (attachmentId: string) => {
    if (!id || !task) return;
    
    const attachment = task.attachments?.find(a => a.id === attachmentId);
    if (!attachment) return;
    
    deleteTaskAttachment({
      id: attachmentId,
      taskId: id,
      fileUrl: attachment.file_url
    }, {
      onSuccess: () => {
        refetch();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-x-2 mb-4">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">تفاصيل المهمة</h1>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2 text-red-700 dark:text-red-300">حدث خطأ</h2>
          <p className="text-red-600 dark:text-red-400">
            لم نتمكن من تحميل تفاصيل المهمة. يرجى المحاولة مرة أخرى.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // نموذج التعديل
  if (showEditForm) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-x-2 mb-6">
          <button
            onClick={() => setShowEditForm(false)}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">تعديل المهمة</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
          <TaskForm
            initialData={task}
            onSubmit={handleUpdateTask}
            isLoading={loading[id] || false}
            isEditMode
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600 dark:text-gray-400">
                هل أنت متأكد من رغبتك في حذف هذه المهمة؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg"
                onClick={() => setShowDeleteConfirm(false)}
              >
                إلغاء
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                onClick={handleDeleteTask}
                disabled={loading[`delete_${id}`] || false}
              >
                {loading[`delete_${id}`] ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>جارِ الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-x-2 mb-6">
        <button
          onClick={() => navigate('/admin/tasks')}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">تفاصيل المهمة</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* العمود الأيمن - تفاصيل المهمة */}
        <div className="md:col-span-2 space-y-6">
          {/* تفاصيل المهمة */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{task.title}</h2>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <TaskStatusBadge status={task.status} size="md" />
                  <TaskPriorityBadge priority={task.priority} size="md" />
                  
                  {isOverdue() && (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                      <Clock className="h-3.5 w-3.5" />
                      متأخرة
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {canEdit() && (
                  <button
                    onClick={() => setShowEditForm(true)}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    title="تعديل المهمة"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                
                {canDelete() && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    title="حذف المهمة"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            
            {task.description && (
              <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">المكلف بالمهمة</p>
                  <p className="font-medium">{task.assignee?.full_name || 'غير محدد'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">منشئ المهمة</p>
                  <p className="font-medium">{task.creator?.full_name || 'غير معروف'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Building className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">الفرع</p>
                  <p className="font-medium">{task.branch?.name || 'غير محدد'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Flag className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">الأولوية</p>
                  <p className="font-medium">
                    {task.priority === 'high' ? 'عالية' : 
                     task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ الإنشاء</p>
                  <p className="font-medium">{formatDate(task.created_at)} - {formatTime(task.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-pink-600 dark:text-pink-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ الاستحقاق</p>
                  <p className={`font-medium ${isOverdue() ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {formatDate(task.due_date)}
                  </p>
                </div>
              </div>
              
              {task.completion_date && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ الإكمال</p>
                    <p className="font-medium">{formatDate(task.completion_date)} - {formatTime(task.completion_date)}</p>
                  </div>
                </div>
              )}
            </div>
            
            {task.notes && (
              <div className="mt-6 pt-6 border-t dark:border-gray-700">
                <h3 className="font-semibold mb-2">الملاحظات</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {task.notes}
                </p>
              </div>
            )}
            
            {/* أزرار تغيير الحالة */}
            {canChangeStatus() && (
              <div className="mt-6 pt-6 border-t dark:border-gray-700">
                <h3 className="font-semibold mb-3">تغيير حالة المهمة</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusChange('new')}
                    disabled={task.status === 'new' || loading[`status_${id}`]}
                    className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                  >
                    <Clock className="h-4 w-4" />
                    <span>جديدة</span>
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={task.status === 'in_progress' || loading[`status_${id}`]}
                    className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>قيد التنفيذ</span>
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('completed')}
                    disabled={task.status === 'completed' || loading[`status_${id}`]}
                    className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>مكتملة</span>
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('postponed')}
                    disabled={task.status === 'postponed' || loading[`status_${id}`]}
                    className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50"
                  >
                    <Pause className="h-4 w-4" />
                    <span>مؤجلة</span>
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('rejected')}
                    disabled={task.status === 'rejected' || loading[`status_${id}`]}
                    className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    <span>مرفوضة</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* المرفقات */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
            <TaskAttachments
              attachments={task.attachments || []}
              taskId={id}
              onUpload={handleUploadAttachment}
              onDelete={handleDeleteAttachment}
              isUploading={loading[`upload_${id}`] || false}
              isDeleting={loading}
            />
          </div>
          
          {/* التعليقات */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              التعليقات
              {task.logs && task.logs.filter(log => log.action === 'comment').length > 0 && (
                <span className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {task.logs.filter(log => log.action === 'comment').length}
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              {task.logs && task.logs
                .filter(log => log.action === 'comment')
                .map(log => (
                  <div key={log.id} className="flex gap-3 pb-4 border-b dark:border-gray-700 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-medium">{log.user?.full_name || 'مستخدم'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.created_at).toLocaleDateString()} • 
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      {log.notes && (
                        <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              }
              
              {/* نموذج إضافة تعليق */}
              <TaskCommentForm
                taskId={id}
                onSubmit={handleAddComment}
                isLoading={loading[`comment_${id}`] || false}
              />
            </div>
          </div>
        </div>
        
        {/* العمود الأيسر - التاريخ والنشاط */}
        <div className="space-y-6">
          {/* تاريخ المهمة */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              سجل النشاط
            </h3>
            
            <TaskTimeline logs={task.logs || []} />
          </div>
        </div>
      </div>
    </div>
  );
}