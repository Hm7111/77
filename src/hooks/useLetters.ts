import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { saveDraft, getDraft, getAllDrafts, deleteDraft, initDB } from '../lib/db'
import { checkConnection } from '../lib/letter-utils'
import type { Letter } from '../types/database'
import { useToast } from './useToast'

// تحسين: إعدادات التخزين المؤقت
const LETTERS_CACHE_TIME = 1000 * 60 * 30 // 30 minutes
const LETTER_STALE_TIME = 1000 * 60 * 5 // 5 minutes
const RETRY_INTERVAL = 3000 // 3 seconds

export function useLetters() {
  const queryClient = useQueryClient()
  const [isOffline, setIsOffline] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { user, dbUser } = useAuth()
  const { toast } = useToast()
  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({})

  // تحسين: استخدام معرف للتخزين المؤقت لكل مستخدم
  const queryKey = user?.id ? ['letters', user.id] : ['letters']

  // استعلام محسن مع تقليل عدد طلبات التحديث
  const { data: letters = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const isOnline = await checkConnection()
      if (!isOnline) {
        setIsOffline(true)
        throw new Error('لا يوجد اتصال بالإنترنت')
      }
      setIsOffline(false)

      let query = supabase
        .from('letters')
        .select('*, letter_templates(id, name, image_url)'); // تحسين: تحديد الحقول المطلوبة فقط
      
      // إذا كان المستخدم مديراً، اعرض جميع الخطابات، وإلا اعرض خطابات المستخدم فقط
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      if (!userData || userData.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error
      
      // تحسين: حفظ نتائج الخطابات في مخزن IndexedDB للوضع الغير متصل
      if (data && data.length > 0) {
        try {
          localStorage.setItem('letters_last_fetch', new Date().toISOString())
          localStorage.setItem('letters_cache', JSON.stringify(data))
        } catch (err) {
          console.warn('Failed to cache letters in localStorage:', err)
        }
      }
      
      return data
    },
    enabled: !isExporting && !!user?.id,
    staleTime: LETTER_STALE_TIME, // تحسين: زيادة وقت التقادم
    cacheTime: LETTERS_CACHE_TIME,
    retry: 3,
    retryDelay: RETRY_INTERVAL,
    refetchOnWindowFocus: true, // تحسين: تمكين إعادة الجلب عند التركيز لضمان تحديث البيانات
    refetchOnReconnect: true,
    refetchOnMount: true,
    refetchInterval: 30000, // إعادة تحميل البيانات كل 30 ثانية
    onError: (error) => {
      console.error('Error fetching letters:', error)
      
      // تحسين: استرجاع البيانات المخزنة مؤقتًا عندما يكون في وضع عدم الاتصال
      if (isOffline) {
        try {
          const cachedData = localStorage.getItem('letters_cache')
          if (cachedData) {
            return JSON.parse(cachedData)
          }
        } catch (err) {
          console.warn('Failed to retrieve cached letters:', err)
        }
      }
      
      if (!isOffline) {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل الخطابات',
          type: 'error'
        })
      }
    }
  })

  // تحسين: استرجاع الخطابات المخزنة مؤقتًا عند التحميل في وضع غير متصل
  useEffect(() => {
    if (isOffline && letters.length === 0) {
      try {
        const cachedData = localStorage.getItem('letters_cache')
        if (cachedData) {
          queryClient.setQueryData(queryKey, JSON.parse(cachedData))
        }
      } catch (err) {
        console.warn('Failed to retrieve cached letters:', err)
      }
    }
  }, [isOffline, letters.length, queryClient, queryKey])

  // إعادة المحاولة تلقائياً عند استعادة الاتصال
  useEffect(() => {
    if (isOffline) {
      const interval = setInterval(async () => {
        const isOnline = await checkConnection()
        if (isOnline) {
          queryClient.invalidateQueries({ queryKey })
        }
      }, RETRY_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [isOffline, queryClient, queryKey])

  // تهيئة قاعدة البيانات المحلية عند بدء التطبيق
  useEffect(() => {
    initDB()
  }, [])

  // تحسين: الخطابات المخزنة مؤقتًا محليًا
  const { data: drafts = [] } = useQuery({
    queryKey: ['drafts'],
    queryFn: getAllDrafts,
    cacheTime: LETTERS_CACHE_TIME,
    staleTime: LETTER_STALE_TIME,
  })

  // تحسين: تنفيذ عمليات التغيير باستخدام useMutation مع التخزين المؤقت الذكي
  const createMutation = useMutation({
    mutationFn: async (letter: Partial<Letter>) => {
      if (!letter.template_id) {
        throw new Error('يجب اختيار قالب للخطاب')
      }
      
      // تحسين: استخدام رمز الفرع من بيانات المستخدم
      const branchCode = dbUser?.branch?.code || 'GEN';
      
      // تحسين: استخدام تنسيق معاملة واحدة
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
          verification_url: letter.verification_url,
          branch_code: branchCode // إضافة رمز الفرع من بيانات المستخدم
        })
        .select('id, number, year, content, status, created_at, letter_templates(id, name, image_url)') // تحسين: تحديد الحقول المطلوبة فقط
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // تحسين: تحديث التخزين المؤقت بشكل انتقائي
      queryClient.setQueryData(queryKey, (old: Letter[] = []) => [data, ...old])
      
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
        .select('*, letter_templates(id, name, image_url)') // تحسين: تحديد الحقول المطلوبة فقط
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // تحسين: تحديث التخزين المؤقت بشكل انتقائي
      queryClient.setQueryData(queryKey, (old: Letter[] = []) => 
        old.map(letter => letter.id === data.id ? data : letter)
      )
      
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
      return id
    },
    onSuccess: (id) => {
      // تحسين: تحديث التخزين المؤقت بشكل انتقائي
      queryClient.setQueryData(queryKey, (old: Letter[] = []) => 
        old.filter(letter => letter.id !== id)
      )
      
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
      // تحسين: استخدام invalidateQueries فقط بدلاً من refetch لتجنب الطلبات المتكررة
      await queryClient.invalidateQueries({ queryKey })
      
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

  // تحسين: دالة للحفظ الجماعي
  const batchSave = async (letters: Partial<Letter>[]) => {
    if (!letters.length) return
    
    try {
      // تنفيذ العملية في معاملة واحدة
      const { error } = await supabase
        .from('letters')
        .upsert(letters, { onConflict: 'id' })
      
      if (error) throw error
      
      // تحديث التخزين المؤقت
      queryClient.invalidateQueries({ queryKey })
      
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

  // تحسين: جلب خطاب واحد مع تخزين مؤقت
  const getLetter = useCallback(async (id: string): Promise<Letter | null> => {
    try {
      // أولا تحقق من التخزين المؤقت
      const cachedLetter = queryClient.getQueryData<Letter[]>(queryKey)?.find(l => l.id === id);
      
      if (cachedLetter) {
        return cachedLetter;
      }
      
      // إذا لم يتم العثور في التخزين المؤقت، استعلم من الخادم
      const { data, error } = await supabase
        .from('letters')
        .select('*, letter_templates(*)')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // تخزين النتيجة في ذاكرة التخزين المؤقت
      if (data) {
        queryClient.setQueryData(['letter', id], data);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching letter:', error);
      return null;
    }
  }, [queryClient, queryKey]);

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
    getLetter, // إضافة دالة جلب خطاب واحد
  }
}