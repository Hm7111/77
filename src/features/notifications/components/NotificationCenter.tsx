import { useState, useEffect } from 'react';
import { Bell, X, Check, Clock, CheckCircle, AlertCircle, FileText, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { Notification } from '../types';
import { useNavigate } from 'react-router-dom';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // استعلام لجلب الإشعارات
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', dbUser?.id, filter],
    queryFn: async () => {
      if (!dbUser?.id) return [];
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false });
      
      if (filter === 'unread') {
        query = query.eq('is_read', false);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!dbUser?.id && isOpen,
    refetchInterval: isOpen ? 30000 : false, // تحديث كل 30 ثانية عندما تكون مفتوحة
  });

  // تعداد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // تعيين إشعار كمقروء
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة الإشعار',
        type: 'error'
      });
    }
  });

  // تعيين جميع الإشعارات كمقروءة
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', dbUser?.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'تم',
        description: 'تم تعيين جميع الإشعارات كمقروءة',
        type: 'success'
      });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة الإشعارات',
        type: 'error'
      });
    }
  });

  // معالجة النقر على إشعار
  const handleNotificationClick = (notification: Notification) => {
    // تعيين الإشعار كمقروء
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // التنقل إلى الصفحة المناسبة بناءً على نوع الإشعار
    if (notification.entity_type === 'task') {
      navigate(`/admin/tasks/${notification.entity_id}`);
    } else if (notification.entity_type === 'letter') {
      navigate(`/admin/letters/view/${notification.entity_id}`);
    } else if (notification.entity_type === 'approval') {
      navigate('/admin/approvals');
    }
    
    onClose();
  };

  // الحصول على أيقونة الإشعار بناءً على نوعه
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'task_completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'task_overdue':
        return <Clock className="h-5 w-5 text-red-500" />;
      case 'task_updated':
        return <FileText className="h-5 w-5 text-yellow-500" />;
      case 'task_comment':
        return <User className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `منذ ${diffMins} دقيقة`;
    } else if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
      return `منذ ${diffDays} يوم`;
    } else {
      return date.toLocaleDateString('ar-SA');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 dark:bg-black/50 flex items-start justify-center pt-16 sm:pt-24" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-lg shadow-xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">الإشعارات</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-2 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'all' 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'unread' 
                  ? 'bg-primary text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              غير مقروءة
            </button>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs text-primary hover:underline"
              disabled={markAllAsReadMutation.isLoading}
            >
              {markAllAsReadMutation.isLoading ? (
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                  جارٍ التحديث...
                </span>
              ) : (
                'تعيين الكل كمقروء'
              )}
            </button>
          )}
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-lg font-medium mb-1">لا توجد إشعارات</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filter === 'unread' 
                  ? 'ليس لديك إشعارات غير مقروءة حالياً' 
                  : 'ستظهر هنا الإشعارات الخاصة بك عند وصولها'}
              </p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      !notification.is_read 
                        ? 'bg-blue-100 dark:bg-blue-900/30' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>
                        
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            disabled={markAsReadMutation.isLoading}
                          >
                            <Check className="h-3 w-3" />
                            تعيين كمقروء
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}