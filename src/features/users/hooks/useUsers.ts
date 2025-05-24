import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { User, UserFormData, UserFilters } from '../types';
import { useQueryClient } from '@tanstack/react-query';

/**
 * هوك لإدارة المستخدمين
 */
export function useUsers() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * جلب قائمة المستخدمين مع إمكانية التصفية
   */
  const getUsers = useCallback(async (filters?: UserFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('users')
        .select('*, branches(*)');
      
      // تطبيق الفلاتر
      if (filters) {
        if (filters.branch_id) {
          query = query.eq('branch_id', filters.branch_id);
        }
        
        if (filters.role) {
          query = query.eq('role', filters.role);
        }
        
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
      }
      
      // ترتيب النتائج
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // تطبيق فلتر البحث (يتم تطبيقه بعد جلب البيانات لأن Supabase لا يدعم البحث في عدة حقول)
      let filteredData = data || [];
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter(user => 
          user.full_name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          (user.branches?.name && user.branches.name.toLowerCase().includes(searchTerm))
        );
      }
      
      return filteredData as User[];
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب المستخدمين';
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
   * إنشاء مستخدم جديد
   */
  const createUser = useCallback(async (userData: UserFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        throw new Error('البريد الإلكتروني مسجل مسبقاً');
      }

      // إنشاء المستخدم في نظام المصادقة
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password || '',
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role,
            branch_id: userData.branch_id
          }
        }
      });

      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          throw new Error('البريد الإلكتروني مسجل مسبقاً');
        }
        throw signUpError;
      }
      
      if (!authData.user?.id) {
        throw new Error('لم يتم إنشاء المستخدم بشكل صحيح');
      }
      
      const userId = authData.user.id;
      
      // استخدام RPC لضمان وجود المستخدم في قاعدة البيانات
      const { error: rpcError } = await supabase.rpc('ensure_user_exists', {
        user_id: userId,
        user_email: userData.email,
        user_full_name: userData.full_name,
        user_role: userData.role,
        user_branch_id: userData.branch_id
      });

      if (rpcError) throw rpcError;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المستخدم';
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
   * تحديث مستخدم موجود
   */
  const updateUser = useCallback(async (userId: string, userData: Partial<UserFormData>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Updating user with data:', userData);
      
      // تحديث بيانات المستخدم في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
         branch_id: userData.branch_id || null,
          is_active: userData.is_active,
          permissions: userData.permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      // تحديث كلمة المرور إذا تم توفيرها
      if (userData.password) {
        // استخدام API القياسي لتحديث كلمة المرور
        const { error: passwordError } = await supabase.auth.updateUser({
          password: userData.password
        });
        
        if (passwordError) throw passwordError;
      }
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
     // تحديث بيانات المستخدم الحالي إذا كان هو نفسه المستخدم الذي تم تحديثه
     queryClient.invalidateQueries({ queryKey: ['user', userId] });
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث المستخدم';
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
   * تغيير حالة تنشيط المستخدم
   */
  const toggleUserActive = useCallback(async (userId: string, isActive: boolean) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: isActive ? 'تم تنشيط الحساب' : 'تم تعطيل الحساب',
        description: isActive ? 'تم تنشيط حساب المستخدم بنجاح' : 'تم تعطيل حساب المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error toggling user active state:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تغيير حالة المستخدم';
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
   * حذف مستخدم
   */
  const deleteUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // التحقق من وجود خطابات مرتبطة بالمستخدم
      const { count, error: countError } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        throw new Error(`لا يمكن حذف هذا المستخدم لأنه مرتبط بـ ${count} خطاب. يمكنك تعطيل حسابه بدلاً من حذفه.`);
      }
      
      // حذف المستخدم من قاعدة البيانات
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف المستخدم';
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

  return {
    isLoading,
    error,
    getUsers,
    createUser,
    updateUser,
    toggleUserActive,
    deleteUser
  };
}