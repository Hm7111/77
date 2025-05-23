import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Branch } from '../types/database'
import { useToast } from './useToast'

export function useBranches(showInactive = false) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const { 
    data: branches = [], 
    isLoading: queryLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['branches', { showInactive }],
    queryFn: async () => {
      let query = supabase
        .from('branches')
        .select('*')
        .order('name')
      
      if (!showInactive) {
        query = query.eq('is_active', true)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Branch[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  })

  async function createBranch(branch: Partial<Branch>) {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert(branch)
        .select()
        .single()
      
      if (error) throw error
      
      await refetch()
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء الفرع بنجاح',
        type: 'success'
      })
      
      return data as Branch
    } catch (error) {
      console.error('Error creating branch:', error)
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الفرع',
        type: 'error'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function updateBranch(id: string, updates: Partial<Branch>) {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('branches')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      await refetch()
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الفرع بنجاح',
        type: 'success'
      })
      
      return data as Branch
    } catch (error) {
      console.error('Error updating branch:', error)
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث الفرع',
        type: 'error'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteBranch(id: string) {
    setIsLoading(true)
    try {
      // التحقق أولاً إذا كان هناك مستخدمون مرتبطون بهذا الفرع
      const { count, error: usersError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', id)
      
      if (usersError) throw usersError
      
      if (count && count > 0) {
        throw new Error(`لا يمكن حذف هذا الفرع لوجود ${count} مستخدم مرتبط به`)
      }
      
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await refetch()
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الفرع بنجاح',
        type: 'success'
      })
      
      return true
    } catch (error) {
      console.error('Error deleting branch:', error)
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الفرع',
        type: 'error'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleBranchActive(id: string) {
    setIsLoading(true)
    try {
      // الحصول على حالة الفرع الحالية
      const { data: branch, error: fetchError } = await supabase
        .from('branches')
        .select('is_active, name')
        .eq('id', id)
        .single()
      
      if (fetchError) throw fetchError
      
      // تبديل الحالة
      const { error } = await supabase
        .from('branches')
        .update({
          is_active: !branch.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) throw error
      
      await refetch()
      
      toast({
        title: branch.is_active ? 'تم تعطيل الفرع' : 'تم تفعيل الفرع',
        description: branch.is_active 
          ? `تم تعطيل فرع ${branch.name} بنجاح` 
          : `تم تفعيل فرع ${branch.name} بنجاح`,
        type: 'success'
      })
      
      return true
    } catch (error) {
      console.error('Error toggling branch status:', error)
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تغيير حالة الفرع',
        type: 'error'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    branches,
    isLoading: isLoading || queryLoading,
    error,
    refetch,
    createBranch,
    updateBranch,
    deleteBranch,
    toggleBranchActive
  }
}