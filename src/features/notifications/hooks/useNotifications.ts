import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { Notification } from '../types';

/**
 * هوك لإدارة الإشعارات
 */
export function useNotifications() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  // استعلام لجلب الإشعارات
  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', dbUser?.id],
    queryFn: async () => {
      if (!dbUser?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!dbUser?.id,
  });
  
  // استعلام لجلب عدد الإشعارات غير المقروءة
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications', dbUser?.id],
    queryFn: async () => {
      if (!dbUser?.id) return 0;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', dbUser.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!dbUser?.id,
  });
  
  // تعيين إشعار كمقروء
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
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
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      
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
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
      
      toast({
        title: 'تم',
        description: 'تم تعيين جميع الإشعارات كمقروءة',
        type: 'success'
      });
      
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة الإشعارات',
        type: 'error'
      });
      
      setIsLoading(false);
    }
  });
  
  // إنشاء إشعار جديد (للاختبار فقط)
  const createNotification = useCallback(async (
    title: string,
    message: string,
    type: string,
    entityType: string,
    entityId: string
  ) => {
    if (!dbUser?.id) return null;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: dbUser.id,
          title,
          message,
          type,
          entity_type: entityType,
          entity_id: entityId,
          is_read: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
      
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء الإشعار',
        type: 'error'
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dbUser?.id, queryClient, toast]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    createNotification,
    refetchNotifications: refetch
  };
}