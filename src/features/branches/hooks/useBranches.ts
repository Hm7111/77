import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { Branch, BranchFormData, BranchFilters } from '../types';
import { useQueryClient } from '@tanstack/react-query';

/**
 * هوك لإدارة الفروع
 */
export function useBranches() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * جلب قائمة الفروع مع إمكانية التصفية
   */
  const getBranches = useCallback(async (filters?: BranchFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('branches')
        .select('*');
      
      // تطبيق الفلاتر
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      
      // ترتيب النتائج
      query = query.order('name');
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // تطبيق فلتر البحث (يتم تطبيقه بعد جلب البيانات)
      let filteredData = data || [];
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter(branch => 
          branch.name.toLowerCase().includes(searchTerm) ||
          branch.city.toLowerCase().includes(searchTerm) ||
          branch.code.toLowerCase().includes(searchTerm)
        );
      }
      
      return filteredData as Branch[];
    } catch (error) {
      console.error('Error fetching branches:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب الفروع';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * إنشاء فرع جديد
   */
  const createBranch = useCallback(async (branchData: BranchFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert(branchData)
        .select()
        .single();
      
      if (error) {
        // التحقق من خطأ القيم المكررة
        if (error.code === '23505') {
          throw new Error('رمز الفرع مستخدم بالفعل، الرجاء اختيار رمز آخر');
        }
        throw error;
      }
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء الفرع بنجاح',
        type: 'success'
      });
      
      return data as Branch;
    } catch (error) {
      console.error('Error creating branch:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الفرع';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * تحديث فرع موجود
   */
  const updateBranch = useCallback(async (id: string, branchData: Partial<BranchFormData>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .update({
          ...branchData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        // التحقق من خطأ القيم المكررة
        if (error.code === '23505') {
          throw new Error('رمز الفرع مستخدم بالفعل، الرجاء اختيار رمز آخر');
        }
        throw error;
      }
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الفرع بنجاح',
        type: 'success'
      });
      
      return data as Branch;
    } catch (error) {
      console.error('Error updating branch:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث الفرع';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * تغيير حالة تنشيط الفرع
   */
  const toggleBranchActive = useCallback(async (id: string, isActive: boolean) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      
      toast({
        title: isActive ? 'تم تفعيل الفرع' : 'تم تعطيل الفرع',
        description: isActive ? 'تم تفعيل الفرع بنجاح' : 'تم تعطيل الفرع بنجاح',
        type: 'success'
      });
      
      return data as Branch;
    } catch (error) {
      console.error('Error toggling branch active state:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تغيير حالة الفرع';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * حذف فرع
   */
  const deleteBranch = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // التحقق من وجود مستخدمين مرتبطين بالفرع
      const { count, error: usersError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', id);
      
      if (usersError) throw usersError;
      
      if (count && count > 0) {
        throw new Error(`لا يمكن حذف هذا الفرع لوجود ${count} مستخدم مرتبط به`);
      }
      
      // حذف الفرع
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الفرع بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting branch:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الفرع';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  /**
   * جلب إحصائيات الفروع
   */
  const getBranchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // إجمالي عدد الفروع
      const { count: total, error: totalError } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) throw totalError;
      
      // عدد الفروع النشطة
      const { count: active, error: activeError } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (activeError) throw activeError;
      
      // عدد المستخدمين في كل الفروع
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (userError) throw userError;
      
      // إحصائيات حسب المدينة
      const { data: cities, error: citiesError } = await supabase
        .from('branches')
        .select('city')
        .order('city');
      
      if (citiesError) throw citiesError;
      
      const byCity: Record<string, number> = {};
      
      if (cities) {
        const uniqueCities = [...new Set(cities.map(b => b.city))];
        
        for (const city of uniqueCities) {
          const { count, error } = await supabase
            .from('branches')
            .select('*', { count: 'exact', head: true })
            .eq('city', city);
          
          if (error) throw error;
          
          byCity[city] = count || 0;
        }
      }
      
      return {
        total: total || 0,
        active: active || 0,
        userCount: userCount || 0,
        byCity
      };
    } catch (error) {
      console.error('Error fetching branch stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب إحصائيات الفروع';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      
      return { total: 0, active: 0, userCount: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    error,
    getBranches,
    createBranch,
    updateBranch,
    toggleBranchActive,
    deleteBranch,
    getBranchStats
  };
}