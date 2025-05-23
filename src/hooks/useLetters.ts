import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { saveDraft, getDraft, getAllDrafts, deleteDraft, initDB } from '../lib/db'
import { checkConnection } from '../lib/letter-utils'
import type { Letter } from '../types/database'
import { useToast } from './useToast'

const LETTERS_CACHE_TIME = 1000 * 60 * 30 // 30 minutes
const RETRY_INTERVAL = 3000 // 3 seconds
const STALE_TIME = 1000 * 30 // 30 seconds

export function useLetters() {
  const queryClient = useQueryClient()
  const [isOffline, setIsOffline] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({})

  const { data: letters = [], isLoading, refetch } = useQuery({
    queryKey: ['letters'],
    queryFn: async () => {
      const isOnline = await checkConnection()
      if (!isOnline) {
        setIsOffline(true)
        throw new Error('لا يوجد اتصال بالإنترنت')
      }
      setIsOffline(false)

      const { data, error } = await supabase
        .from('letters')
        .select('*, letter_templates(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !isExporting && !!user?.id,
    staleTime: STALE_TIME,
    cacheTime: LETTERS_CACHE_TIME,
    retry: 3,
    retryDelay: RETRY_INTERVAL,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    onError: (error) => {
      console.error('Error fetching letters:', error)
      if (!isOffline) {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل الخطابات',
          type: 'error'
        })
      }
    }
  })

  // إعادة المحاولة تلقائياً عند استعادة الاتصال
  useEffect(() => {
    if (isOffline) {
      const interval = setInterval(async () => {
        const isOnline = await checkConnection()
        if (isOnline) {
          queryClient.invalidateQueries({ queryKey: ['letters'] })
        }
      }, RETRY_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [isOffline, queryClient])

  // تهيئة قاعدة البيانات المحلية عند بدء التطبيق
  useEffect(() => {
    initDB()
  }, [])

  const { data: drafts = [] } = useQuery({
    queryKey: ['drafts'],
    queryFn: getAllDrafts,
    cacheTime: LETTERS_CACHE_TIME,
    staleTime: STALE_TIME,
  })

  const createMutation = useMutation({
    mutationFn: async (letter: Partial<Letter>) => {
      if (!letter.template_id) {
        throw new Error('يجب اختيار قالب للخطاب')
      }
      
      const { data, error } = await supabase
        .from('letters')
        .insert({
          user_id: letter.user_id,
          template_id: letter.template_id,
          content: letter.content,
          status: 'completed',
          number: letter.number,
          year: letter.year,
          local_id: letter.local_id,
          sync_status: 'synced',
          creator_name: letter.creator_name,
          verification_url: letter.verification_url
        })
        .select('*, letter_templates(*)')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['letters'] })
      
      // إذا تم إنشاء الخطاب من مسودة محلية، قم بحذفها
      if (data.local_id) {
        deleteDraft(data.local_id)
      }
      
      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء الخطاب بنجاح',
        type: 'success'
      })
    },
    onError: (error) => {
      console.error('Error creating letter:', error)
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الخطاب',
        type: 'error'
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (letter: Partial<Letter>) => {
      setLoadingState(prev => ({ ...prev, [letter.id!]: true }))
      
      const { data, error } = await supabase
        .from('letters')
        .update(letter)
        .eq('id', letter.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['letters'] })
      setLoadingState(prev => ({ ...prev, [data.id]: false }))
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الخطاب بنجاح',
        type: 'success'
      })
    },
    onError: (error, variables) => {
      console.error('Error updating letter:', error)
      setLoadingState(prev => ({ ...prev, [variables.id!]: false }))
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث الخطاب',
        type: 'error'
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setLoadingState(prev => ({ ...prev, [id]: true }))
      
      const { error } = await supabase
        .from('letters')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['letters'] })
      setLoadingState(prev => ({ ...prev, [id]: false }))
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الخطاب بنجاح',
        type: 'success'
      })
    },
    onError: (error, id) => {
      console.error('Error deleting letter:', error)
      setLoadingState(prev => ({ ...prev, [id]: false }))
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الخطاب',
        type: 'error'
      })
    }
  })

  // دالة لإعادة تحميل البيانات بعد التصدير
  const reloadAfterExport = async () => {
    setIsExporting(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['letters'] })
      await new Promise(resolve => setTimeout(resolve, 1000))
      await refetch()
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث قائمة الخطابات',
        type: 'success'
      })
    } catch (error) {
      console.error('Error reloading after export:', error)
      
      toast({
        title: 'تحذير',
        description: 'تم تصدير الملف ولكن حدث خطأ في تحديث البيانات',
        type: 'warning'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // دالة للحفظ الجماعي
  const batchSave = async (letters: Partial<Letter>[]) => {
    if (!letters.length) return
    
    try {
      const { error } = await supabase
        .from('letters')
        .upsert(letters)
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['letters'] })
      
      // إزالة المسودات المحلية التي تم حفظها بنجاح
      const localIds = letters
        .filter(letter => letter.local_id)
        .map(letter => letter.local_id as string)
      
      for (const id of localIds) {
        await deleteDraft(id)
      }
      
      return true
    } catch (error) {
      console.error('Error batch saving letters:', error)
      throw error
    }
  }

  return {
    letters,
    drafts,
    isLoading,
    isExporting,
    isOffline,
    loadingState,
    createLetter: createMutation.mutate,
    updateLetter: updateMutation.mutate,
    deleteLetter: deleteMutation.mutate,
    saveDraft,
    reloadAfterExport,
    getDraft,
    deleteDraft,
    batchSave,
  }
}