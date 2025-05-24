import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, Filter, MapPin, Building, UserCheck, UserX } from 'lucide-react'
import type { User, Branch, UserRole } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { UserDialog } from '../../components/users/UserDialog'
import { useQuery } from '@tanstack/react-query'
import { BranchSelector } from '../../components/branches/BranchSelector'
import { useToast } from '../../hooks/useToast'

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [activateLoading, setActivateLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data as Branch[]
    },
    enabled: isAdmin
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data as UserRole[]
    },
    enabled: isAdmin
  })

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin, branchFilter])

  async function loadUsers() {
    try {
      setIsLoading(true)
      let query = supabase
        .from('users')
        .select('*, branches(*)')
        .order('created_at', { ascending: false })
      
      if (branchFilter) {
        query = query.eq('branch_id', branchFilter)
      }

      const { data, error } = await query.throwOnError()

      if (error) {
        console.error('Error loading users:', error)
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل المستخدمين',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(user: User) {
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  function handleAdd() {
    setSelectedUser(undefined)
    setIsDialogOpen(true)
  }

  // تعطيل حساب المستخدم بدلاً من حذفه
  async function handleDeactivate(user: User) {
    if (!confirm('هل أنت متأكد من تعطيل حساب هذا المستخدم؟')) return
    
    setDeleteLoading(user.id)
    try {
      // تعطيل المستخدم عن طريق تحديث حقل is_active إلى false
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: false 
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'تم تعطيل الحساب',
        description: `تم تعطيل حساب ${user.full_name} بنجاح`,
        type: 'success'
      })
      
      loadUsers()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تعطيل الحساب',
        type: 'error'
      })
    } finally {
      setDeleteLoading(null)
    }
  }
  
  // إعادة تنشيط حساب المستخدم
  async function handleActivate(user: User) {
    if (!confirm('هل أنت متأكد من إعادة تنشيط حساب هذا المستخدم؟')) return
    
    setActivateLoading(user.id)
    try {
      // تنشيط المستخدم عن طريق تحديث حقل is_active إلى true
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: true 
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'تم تنشيط الحساب',
        description: `تم تنشيط حساب ${user.full_name} بنجاح`,
        type: 'success'
      })
      
      loadUsers()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تنشيط الحساب',
        type: 'error'
      })
    } finally {
      setActivateLoading(null)
    }
  }

  // فلترة المستخدمين حسب البحث
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isAdmin ? 'إدارة المستخدمين' : 'غير مصرح بالوصول'}
        </h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              title="تصفية"
            >
              <Filter className="h-5 w-5 text-gray-500" />
            </button>
            
            <button
              onClick={handleAdd}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              إضافة مستخدم جديد
            </button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm">
          <h3 className="text-sm font-medium mb-3">تصفية المستخدمين</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-500 mb-1">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو البريد..."
                  className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-500 mb-1">تصفية حسب الفرع</label>
              <BranchSelector
                value={branchFilter}
                onChange={setBranchFilter}
                placeholder="جميع الفروع"
                showAll={true}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 self-end">
              <button
                onClick={() => {
                  setSearchQuery('')
                  setBranchFilter(null)
                }}
                className="px-3 py-2 text-sm border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAdmin ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          عذراً، يجب أن تكون مديراً للوصول إلى هذه الصفحة
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الفرع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الدور</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span>{user.full_name}</span>
                        {user.branches && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            {user.branches.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.branches ? (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-primary" />
                          <span>{user.branches.name}</span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {user.branches.code}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">غير محدد</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-x-3">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-primary hover:underline"
                        >
                          تعديل
                        </button>
                        
                        {user.is_active ? (
                          <button
                            onClick={() => handleDeactivate(user)}
                            className="text-red-600 hover:text-red-700 flex items-center gap-1"
                            disabled={deleteLoading === user.id}
                          >
                            {deleteLoading === user.id ? (
                              <span className="inline-block h-4 w-4 rounded-full border-2 border-red-600/30 border-t-red-600 animate-spin"></span>
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                            <span>تعطيل</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(user)}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1"
                            disabled={activateLoading === user.id}
                          >
                            {activateLoading === user.id ? (
                              <span className="inline-block h-4 w-4 rounded-full border-2 border-green-600/30 border-t-green-600 animate-spin"></span>
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            <span>تنشيط</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      لا يوجد مستخدمين مطابقين لمعايير البحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserDialog
        user={selectedUser}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={loadUsers}
      />
    </>
  )
}