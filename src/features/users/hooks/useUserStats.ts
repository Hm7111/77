import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { UserStats } from '../types';

/**
 * هوك لجلب إحصائيات المستخدمين
 */
export function useUserStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * جلب إحصائيات المستخدمين
   */
  const getUserStats = useCallback(async (branchId?: string | null): Promise<UserStats> => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase.from('users').select('*', { count: 'exact' });
      
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      
      const { count: total } = await query;
      
      // عدد المستخدمين النشطين
      const { count: active } = await query.eq('is_active', true);
      
      // عدد المدراء
      const { count: admins } = await query.eq('role', 'admin');
      
      // عدد المستخدمين العاديين
      const { count: users } = await query.eq('role', 'user');
      
      // إحصائيات حسب الفروع
      let byBranch: Record<string, { total: number, active: number, admins: number }> = {};
      
      if (!branchId) {
        // جلب الفروع
        const { data: branches } = await supabase
          .from('branches')
          .select('id, name, code');

        if (branches && branches.length > 0) {
          // جلب إحصائيات كل فرع
          for (const branch of branches) {
            const { count: branchTotal } = await supabase
              .from('users')
              .select('*', { count: 'exact' })
              .eq('branch_id', branch.id);
            
            const { count: branchActive } = await supabase
              .from('users')
              .select('*', { count: 'exact' })
              .eq('branch_id', branch.id)
              .eq('is_active', true);
            
            const { count: branchAdmins } = await supabase
              .from('users')
              .select('*', { count: 'exact' })
              .eq('branch_id', branch.id)
              .eq('role', 'admin');
            
            byBranch[branch.id] = {
              total: branchTotal || 0,
              active: branchActive || 0,
              admins: branchAdmins || 0
            };
          }
        }
      }
      
      return {
        total: total || 0,
        active: active || 0,
        admins: admins || 0,
        users: users || 0,
        ...(Object.keys(byBranch).length > 0 ? { byBranch } : {})
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب إحصائيات المستخدمين';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return { total: 0, active: 0, admins: 0, users: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    error,
    getUserStats
  };
}