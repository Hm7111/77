import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit2, Check, X, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { BranchDialog } from './BranchDialog'
import type { Branch } from '../../types/database'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function BranchesList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const { 
    data: branches = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data as Branch[]
    }
  })

  // فلترة الفروع حسب البحث
  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleEdit(branch: Branch) {
    setSelectedBranch(branch)
    setIsDialogOpen(true)
  }

  function handleAdd() {
    setSelectedBranch(undefined)
    setIsDialogOpen(true)
  }

  async function handleDelete(id: string) {
    try {
      // التحقق من وجود مستخدمين مرتبطين بالفرع
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', id)
      
      if (countError) throw countError
      
      if (count && count > 0) {
        toast({
          title: 'لا يمكن الحذف',
          description: `لا يمكن حذف هذا الفرع لأنه مرتبط بعدد ${count} مستخدم`,
          type: 'error'
        })
        setShowDeleteConfirm(null)
        return
      }
      
      // حذف الفرع
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الفرع بنجاح',
        type: 'success'
      })
    } catch (error) {
      console.error('Error:', error)
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الفرع',
        type: 'error'
      })
    } finally {
      setShowDeleteConfirm(null)
    }
  }

  async function handleToggleActive(branch: Branch) {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ 
          is_active: !branch.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', branch.id)
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      
      toast({
        title: branch.is_active ? 'تم تعطيل الفرع' : 'تم تفعيل الفرع',
        description: branch.is_active 
          ? `تم تعطيل فرع ${branch.name} بنجاح` 
          : `تم تفعيل فرع ${branch.name} بنجاح`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error:', error)
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تعديل حالة الفرع',
        type: 'error'
      })
    }
  }

  return (
    <div>
      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              هل أنت متأكد من رغبتك في حذف هذا الفرع؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded"
              >
                إلغاء
              </button>
              <button 
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold">إدارة الفروع</h2>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-grow md:flex-grow-0 md:min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الفروع..."
              className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <button
            onClick={handleAdd}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            إضافة فرع جديد
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-4 rounded-lg text-red-700 dark:text-red-400">
          <p className="font-bold mb-1">خطأ في تحميل البيانات</p>
          <p className="text-sm">حدث خطأ أثناء محاولة تحميل بيانات الفروع. يرجى المحاولة مرة أخرى لاحقاً.</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 text-center border dark:border-gray-800 shadow-sm">
          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium mb-2">لا توجد فروع</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery ? 'لا توجد فروع تطابق معايير البحث' : 'لم يتم إضافة أي فروع بعد'}
          </p>
          <button
            onClick={handleAdd}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة فرع جديد
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">اسم الفرع</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المدينة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الرمز</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-4">
                      <div className="font-medium">{branch.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{branch.city}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          branch.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {branch.is_active ? 'مفعّل' : 'معطّل'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleEdit(branch)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        <button 
                          onClick={() => handleToggleActive(branch)}
                          className={`p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
                            branch.is_active ? 'hover:text-red-600' : 'hover:text-green-600' 
                          }`}
                          title={branch.is_active ? 'تعطيل الفرع' : 'تفعيل الفرع'}
                        >
                          {branch.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                        
                        <button 
                          onClick={() => setShowDeleteConfirm(branch.id)}
                          className="p-1.5 text-gray-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BranchDialog
        branch={selectedBranch}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          refetch()
          setIsDialogOpen(false)
        }}
      />
    </div>
  )
}