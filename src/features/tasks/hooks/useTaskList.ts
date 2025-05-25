import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { Task, TaskFilters, TaskSummary } from '../types';

/**
 * هوك للحصول على قائمة المهام وتصفيتها
 */
export function useTaskList() {
  const { toast } = useToast();
  const { dbUser, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  // حالة الفلاتر
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    assigned_to: null,
    branch_id: null,
    search: '',
    timeframe: 'all'
  });

  // استعلام للحصول على المهام
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tasks', filters, dbUser?.id],
    queryFn: async () => {
      try {
        let query = supabase
          .from('tasks')
          .select(`
            *,
            creator:created_by(id, full_name, email, role),
            assignee:assigned_to(id, full_name, email, role),
            branch:branch_id(id, name, code)
          `);

        // تطبيق الفلاتر
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        
        if (filters.priority && filters.priority !== 'all') {
          query = query.eq('priority', filters.priority);
        }
        
        if (filters.assigned_to) {
          query = query.eq('assigned_to', filters.assigned_to);
        } else if (!isAdmin && dbUser?.id) {
          // المستخدمون العاديون يرون المهام المخصصة لهم فقط
          // أو المهام التي أنشأوها
          query = query.or(`assigned_to.eq.${dbUser.id},created_by.eq.${dbUser.id}`);
        }
        
        if (filters.branch_id) {
          query = query.eq('branch_id', filters.branch_id);
        } else if (!isAdmin && dbUser?.branch_id) {
          // المستخدمون العاديون يرون المهام الخاصة بفرعهم فقط
          query = query.eq('branch_id', dbUser.branch_id);
        }
        
        // تصفية حسب الإطار الزمني
        if (filters.timeframe) {
          const now = new Date().toISOString();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (filters.timeframe === 'today') {
            // المهام المستحقة اليوم
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', tomorrow.toISOString());
          } else if (filters.timeframe === 'week') {
            // المهام المستحقة هذا الأسبوع
            const weekLater = new Date(today);
            weekLater.setDate(weekLater.getDate() + 7);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', weekLater.toISOString());
          } else if (filters.timeframe === 'month') {
            // المهام المستحقة هذا الشهر
            const monthLater = new Date(today);
            monthLater.setMonth(monthLater.getMonth() + 1);
            query = query
              .gte('due_date', today.toISOString())
              .lt('due_date', monthLater.toISOString());
          } else if (filters.timeframe === 'overdue') {
            // المهام المتأخرة
            query = query
              .lt('due_date', now)
              .not('status', 'eq', 'completed')
              .not('status', 'eq', 'rejected');
          }
        }

        // الفرز والترتيب
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // تصفية إضافية بناءً على البحث (يتم على الخادم)
        let filteredTasks = data || [];
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredTasks = filteredTasks.filter(task =>
            task.title?.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower) ||
            task.assignee?.full_name?.toLowerCase().includes(searchLower) ||
            task.creator?.full_name?.toLowerCase().includes(searchLower)
          );
        }

        return filteredTasks as Task[];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'خطأ',
          description: 'فشل في جلب المهام',
          type: 'error'
        });
        return [];
      }
    },
    enabled: !!dbUser?.id
  });
  
  // استعلام للحصول على ملخص المهام
  const {
    data: taskSummary = {
      total: 0,
      new: 0,
      inProgress: 0,
      completed: 0,
      rejected: 0,
      postponed: 0,
      overdue: 0
    },
    isLoading: isSummaryLoading
  } = useQuery({
    queryKey: ['task-summary', dbUser?.id, filters.branch_id],
    queryFn: async () => {
      try {
        // إنشاء استعلام أساسي
        const createBaseQuery = () => {
          let baseQuery = supabase.from('tasks').select('*', { count: 'exact', head: true });

          // تحديد المهام بناءً على المستخدم والفرع
          if (!isAdmin && dbUser?.id) {
            // استخدام الشرط الصحيح للتصفية
            baseQuery = baseQuery.or(`assigned_to.eq.${dbUser.id},created_by.eq.${dbUser.id}`);
          }
          
          if (filters.branch_id) {
            baseQuery = baseQuery.eq('branch_id', filters.branch_id);
          } else if (!isAdmin && dbUser?.branch_id) {
            baseQuery = baseQuery.eq('branch_id', dbUser.branch_id);
          }
          
          return baseQuery;
        };
        
        // العدد الإجمالي
        const { error: totalError, count: total } = await createBaseQuery();
        if (totalError) throw totalError;
        
        // عدد المهام الجديدة
        const { count: newCount } = await createBaseQuery()
          .eq('status', 'new');
        
        // عدد المهام قيد التنفيذ
        const { count: inProgressCount } = await createBaseQuery()
          .eq('status', 'in_progress');
        
        // عدد المهام المكتملة
        const { count: completedCount } = await createBaseQuery()
          .eq('status', 'completed');
        
        // عدد المهام المرفوضة
        const { count: rejectedCount } = await createBaseQuery()
          .eq('status', 'rejected');
        
        // عدد المهام المؤجلة
        const { count: postponedCount } = await createBaseQuery()
          .eq('status', 'postponed');
        
        // عدد المهام المتأخرة
        const now = new Date().toISOString();
        const { count: overdueCount } = await createBaseQuery()
          .lt('due_date', now)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'rejected');
        
        return {
          total: total || 0,
          new: newCount || 0,
          inProgress: inProgressCount || 0,
          completed: completedCount || 0,
          rejected: rejectedCount || 0,
          postponed: postponedCount || 0,
          overdue: overdueCount || 0
        } as TaskSummary;
      } catch (error) {
        console.error('Error fetching task summary:', error);
        return {
          total: 0,
          new: 0,
          inProgress: 0,
          completed: 0,
          rejected: 0,
          postponed: 0,
          overdue: 0
        } as TaskSummary;
      }
    },
    enabled: !!dbUser?.id,
    refetchInterval: 60000 // تحديث كل دقيقة
  });

  /**
   * تحديث الفلاتر
   */
  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * إعادة تعيين الفلاتر
   */
  const resetFilters = useCallback(() => {
    setFilters({
      status: 'all',
      priority: 'all',
      assigned_to: null,
      branch_id: null,
      search: '',
      timeframe: 'all'
    });
  }, []);

  return {
    tasks,
    isLoading,
    error,
    taskSummary,
    isSummaryLoading,
    filters,
    updateFilters,
    resetFilters,
    refetchTasks: refetch
  };
}