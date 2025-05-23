import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from './useToast'

interface Stats {
  total: number
  recent: number
  draft: number
  byBranch?: Record<string, {
    total: number
    recent: number
    draft: number
  }>
}

export function useDashboardStats(period: 'week' | 'month' | 'year' = 'month', branchId?: string | null) {
  const { dbUser } = useAuth()
  const { toast } = useToast()
  const isAdmin = dbUser?.role === 'admin'

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats', period, dbUser?.id, branchId],
    queryFn: async (): Promise<Stats> => {
      try {
        const now = new Date()
        let startDate = new Date()

        switch (period) {
          case 'week':
            startDate.setDate(now.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(now.getMonth() - 1)
            break
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1)
            break
        }

        // إحصائيات المستخدم الحالي (أو الفرع إذا تم تحديد فرع)
        let userQuery = supabase.from('letters').select('*', { count: 'exact', head: true })

        if (branchId && isAdmin) {
          // لو كان مدير ومحدد فرع، نجلب خطابات مستخدمي هذا الفرع
          const { data: branchUsers } = await supabase
            .from('users')
            .select('id')
            .eq('branch_id', branchId)

          if (branchUsers && branchUsers.length > 0) {
            const userIds = branchUsers.map(user => user.id)
            userQuery = userQuery.in('user_id', userIds)
          } else {
            // إذا لم يكن هناك مستخدمون في هذا الفرع
            return { total: 0, recent: 0, draft: 0 }
          }
        } else if (!branchId && !isAdmin) {
          // لو مستخدم عادي، نجلب خطاباته فقط
          userQuery = userQuery.eq('user_id', dbUser?.id)
        } else if (!branchId && isAdmin) {
          // لو مدير وغير محدد فرع، نجلب جميع الخطابات
          // لا نضيف أي فلتر
        }

        // الإجمالي
        const { count: total } = await userQuery

        // الخطابات الحديثة (حسب الفترة)
        let recentQuery = userQuery.gte('created_at', startDate.toISOString())
        const { count: recent } = await recentQuery

        // المسودات
        let draftQuery = userQuery.eq('status', 'draft')
        const { count: draft } = await draftQuery

        // إحصائيات حسب الفروع (للمدراء فقط)
        let byBranch: Record<string, { total: number, recent: number, draft: number }> = {}

        if (isAdmin && !branchId) {
          // جلب الفروع
          const { data: branches } = await supabase
            .from('branches')
            .select('id, name, code')

          if (branches && branches.length > 0) {
            // جلب مستخدمي كل فرع
            for (const branch of branches) {
              const { data: branchUsers } = await supabase
                .from('users')
                .select('id')
                .eq('branch_id', branch.id)

              if (branchUsers && branchUsers.length > 0) {
                const userIds = branchUsers.map(user => user.id)

                // إجمالي خطابات الفرع
                const { count: branchTotal } = await supabase
                  .from('letters')
                  .select('*', { count: 'exact', head: true })
                  .in('user_id', userIds)

                // الخطابات الحديثة للفرع (حسب الفترة)
                const { count: branchRecent } = await supabase
                  .from('letters')
                  .select('*', { count: 'exact', head: true })
                  .in('user_id', userIds)
                  .gte('created_at', startDate.toISOString())

                // المسودات للفرع
                const { count: branchDraft } = await supabase
                  .from('letters')
                  .select('*', { count: 'exact', head: true })
                  .in('user_id', userIds)
                  .eq('status', 'draft')

                byBranch[branch.id] = {
                  total: branchTotal || 0,
                  recent: branchRecent || 0,
                  draft: branchDraft || 0
                }
              } else {
                byBranch[branch.id] = { total: 0, recent: 0, draft: 0 }
              }
            }
          }
        }

        return {
          total: total || 0,
          recent: recent || 0,
          draft: draft || 0,
          ...(Object.keys(byBranch).length > 0 ? { byBranch } : {})
        }
      } catch (error) {
        console.error('Error loading statistics:', error)
        toast({
          title: 'خطأ',
          description: 'فشل في تحميل الإحصائيات',
          type: 'error'
        })
        return { total: 0, recent: 0, draft: 0 }
      }
    },
    enabled: !!dbUser?.id
  })

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}