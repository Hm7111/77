import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { Permission, UserRole } from '../types';
import { useQueryClient } from '@tanstack/react-query';

/**
 * هوك لإدارة صلاحيات المستخدمين
 */
export function useUserPermissions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * جلب الصلاحيات المتاحة
   */
  const getPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('code');
      
      if (error) throw error;
      
      return data as Permission[];
    } catch (error) {
      console.error('Error fetching permissions:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب الصلاحيات';
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
   * جلب الأدوار المتاحة
   */
  const getRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data as UserRole[];
    } catch (error) {
      console.error('Error fetching roles:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب الأدوار';
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
   * تحديث صلاحيات المستخدم
   */
  const updateUserPermissions = useCallback(async (userId: string, permissions: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث صلاحيات المستخدم بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error updating user permissions:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث صلاحيات المستخدم';
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
   * إنشاء دور جديد
   */
  const createRole = useCallback(async (role: Partial<UserRole>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert(role)
        .select()
        .single();
      
      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء الدور بنجاح',
        type: 'success'
      });
      
      return data as UserRole;
    } catch (error) {
      console.error('Error creating role:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الدور';
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
   * تحديث دور موجود
   */
  const updateRole = useCallback(async (roleId: string, role: Partial<UserRole>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .update({
          ...role,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)
        .select()
        .single();
      
      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الدور بنجاح',
        type: 'success'
      });
      
      return data as UserRole;
    } catch (error) {
      console.error('Error updating role:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث الدور';
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
   * حذف دور
   */
  const deleteRole = useCallback(async (roleId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // التحقق من استخدام الدور
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, permissions');
      
      if (usersError) throw usersError;
      
      // التحقق من وجود مستخدمين يستخدمون هذا الدور
      const usersWithRole = users?.filter(user => 
        user.permissions && Array.isArray(user.permissions) && user.permissions.includes(roleId)
      );
      
      if (usersWithRole && usersWithRole.length > 0) {
        throw new Error(`هذا الدور مستخدم بواسطة ${usersWithRole.length} مستخدم. يرجى تغيير أدوارهم قبل الحذف.`);
      }
      
      // حذف الدور
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
      
      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الدور بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الدور';
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
    getPermissions,
    getRoles,
    updateUserPermissions,
    createRole,
    updateRole,
    deleteRole
  };
}