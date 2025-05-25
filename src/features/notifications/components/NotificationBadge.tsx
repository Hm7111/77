import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { NotificationCenter } from './NotificationCenter';

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const { dbUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // استعلام لجلب عدد الإشعارات غير المقروءة
  const { data: unreadCount = 0, refetch } = useQuery({
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
    refetchInterval: 60000, // تحديث كل دقيقة
  });
  
  // الاستماع للإشعارات الجديدة باستخدام Supabase Realtime
  useEffect(() => {
    if (!dbUser?.id) return;
    
    // إنشاء اشتراك للإشعارات الجديدة
    const subscription = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${dbUser.id}`
        },
        (payload) => {
          // تحديث عدد الإشعارات غير المقروءة
          refetch();
          
          // عرض إشعار للمستخدم (اختياري)
          if (Notification.permission === 'granted') {
            const data = payload.new;
            new Notification(data.title, {
              body: data.message,
              icon: '/logo.svg'
            });
          }
        }
      )
      .subscribe();
    
    // طلب إذن الإشعارات من المتصفح
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    
    return () => {
      subscription.unsubscribe();
    };
  }, [dbUser?.id, refetch]);

  return (
    <>
      <button
        onClick={() => setShowNotifications(true)}
        className={`relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>
      
      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </>
  );
}