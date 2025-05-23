import { useState, useEffect } from 'react'
import { Building, Users, FileText, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { BranchSelector } from '../../../components/branches/BranchSelector'
import type { Branch } from '../../../types/database'

export function UserStats() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  
  const { data: stats = { total: 0, active: 0, admins: 0, users: 0 }, isLoading } = useQuery({
    queryKey: ['user-stats', selectedBranch],
    queryFn: async () => {
      try {
        let query = supabase.from('users').select('*', { count: 'exact' })
        
        if (selectedBranch) {
          query = query.eq('branch_id', selectedBranch)
        }
        
        const { count: total } = await query
        
        // عدد المستخدمين النشطين
        const { count: active } = await query.eq('is_active', true)
        
        // عدد المدراء
        const { count: admins } = await query.eq('role', 'admin')
        
        // عدد المستخدمين العاديين
        const { count: users } = await query.eq('role', 'user')
        
        return {
          total: total || 0,
          active: active || 0,
          admins: admins || 0,
          users: users || 0,
        }
      } catch (error) {
        console.error('Error fetching user stats:', error)
        return { total: 0, active: 0, admins: 0, users: 0 }
      }
    }
  })
  
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches-with-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*, users:users(*)')
      
      if (error) throw error
      
      // تنظيم البيانات لتسهيل العرض
      return data.map(branch => ({
        ...branch,
        userCount: branch.users.length,
        adminCount: branch.users.filter(user => user.role === 'admin').length,
        userActiveCount: branch.users.filter(user => user.is_active).length
      }))
    }
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          إحصائيات المستخدمين
        </h2>
        
        <div className="w-full md:w-64">
          <BranchSelector
            value={selectedBranch}
            onChange={setSelectedBranch}
            placeholder="جميع الفروع"
            showAll
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي المستخدمين</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">المستخدمين النشطين</span>
            <span className="font-medium text-green-600 dark:text-green-400">{stats.active}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المدراء</p>
              <p className="text-3xl font-bold">{stats.admins}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">نسبة من الإجمالي</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {stats.total ? Math.round((stats.admins / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المستخدمين العاديين</p>
              <p className="text-3xl font-bold">{stats.users}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">نسبة من الإجمالي</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {stats.total ? Math.round((stats.users / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">عدد الفروع</p>
              <p className="text-3xl font-bold">{branches.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <Building className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">الفروع النشطة</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {branches.filter(branch => branch.is_active).length}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b dark:border-gray-800">
          <h3 className="font-semibold">توزيع المستخدمين حسب الفروع</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">اسم الفرع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الرمز</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">عدد المستخدمين</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المدراء</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المستخدمون النشطون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoadingBranches ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">لا توجد فروع مضافة</td>
                </tr>
              ) : (
                branches.map(branch => (
                  <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-primary ml-2" />
                        <span className="font-medium">{branch.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-md w-12 h-8 flex items-center justify-center font-bold">
                          {branch.userCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-md w-12 h-8 flex items-center justify-center font-bold">
                          {branch.adminCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md w-12 h-8 flex items-center justify-center font-bold">
                          {branch.userActiveCount}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                          ({Math.round((branch.userActiveCount / branch.userCount) * 100) || 0}%)
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}