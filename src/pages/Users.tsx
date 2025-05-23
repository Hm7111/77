import { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'
import { Plus, Trash2 } from 'lucide-react'
import type { User } from '../types/database'
import { supabase } from '../lib/supabase'
import { UserDialog } from '../components/users/UserDialog'

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        alert('حدث خطأ أثناء تحميل المستخدمين: ' + error.message)
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء تحميل المستخدمين')
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

  async function handleDelete(user: User) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) throw error

      loadUsers()
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء حذف المستخدم')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
            <button
              onClick={handleAdd}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              إضافة مستخدم جديد
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الدور</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{user.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
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
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-700"
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

          <UserDialog
            user={selectedUser}
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={loadUsers}
          />
        </main>
      </div>
    </div>
  )
}