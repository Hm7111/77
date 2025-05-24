import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { User } from '../../types/database'
import { useUsers } from '../../features/users/hooks'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { UserForm } from '../../features/users/components'

interface Props {
  user?: User
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserDialog({ user, isOpen, onClose, onSuccess }: Props) {
  const { createUser, updateUser, isLoading } = useUsers()

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false
  })

  // Fetch user roles
  const { data: roles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name')
        
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false
  })

  async function handleSubmit(userData: any) {
    try {
      let success;
     console.log('Submitting user data in dialog:', userData);
      if (user?.id) {
        // تحديث مستخدم موجود
        success = await updateUser(user.id, userData)
      } else {
        // إنشاء مستخدم جديد
        success = await createUser(userData)
      }
      
      if (success) {
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error('Error handling user submission:', error)
    }
  }

  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-lg">
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <UserForm
            user={user}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            branches={branches}
            roles={roles}
          />
        </div>
      </div>
    </div>
  )
}