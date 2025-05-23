import { useState, useEffect, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import type { User, UserRole } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { BranchSelector } from '../branches/BranchSelector'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface Props {
  user?: User
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserDialog({ user, isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(user?.email ?? '')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [role, setRole] = useState<string>(user?.role ?? 'user')
  const [branchId, setBranchId] = useState<string | null>(user?.branch_id || null)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Fetch user roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as UserRole[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Map role name to system role value
  const mapRoleToSystemValue = useCallback((roleName: string): string => {
    if (roleName.toLowerCase() === 'مدير') return 'admin';
    return 'user';
  }, []);

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setFullName(user.full_name)
      setRole(user.role)
      setBranchId(user.branch_id || null)
      setPassword('')
      setErrors({})
    } else {
      resetForm()
    }
  }, [user, isOpen])
  
  function resetForm() {
    setEmail('')
    setFullName('')
    setRole('user')
    setBranchId(null)
    setPassword('')
    setErrors({})
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    
    if (!email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح'
    }
    
    if (!fullName.trim()) {
      newErrors.fullName = 'الاسم الكامل مطلوب'
    }
    
    if (!user && !password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة'
    } else if (!user && password.length < 6) {
      newErrors.password = 'كلمة المرور يجب ألا تقل عن 6 أحرف'
    }
    
    if (!branchId) {
      newErrors.branchId = 'الفرع مطلوب'
    }
    
    if (!role) {
      newErrors.role = 'الدور مطلوب'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      if (user?.id) {
        // تحديث مستخدم موجود
        console.log('Updating user with role:', role);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email,
            full_name: fullName,
            role,
            is_active: true,
            branch_id: branchId,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) throw updateError
        
        if (password) {
          // استخدام API القياسي لتحديث كلمة المرور
          const { error: passwordError } = await supabase.auth.updateUser({
            password
          })
          if (passwordError) throw passwordError
        }

      } else {
        // إنشاء مستخدم جديد
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              branch_id: branchId
            }
          }
        })

        if (signUpError) throw signUpError
        
        if (!authData.user?.id) {
          throw new Error('لم يتم إنشاء المستخدم بشكل صحيح')
        }
        
        const userId = authData.user.id
        
        console.log('Creating user with role:', role);
        
        // استخدام RPC لضمان وجود المستخدم في قاعدة البيانات
        const { error: rpcError } = await supabase.rpc('ensure_user_exists', {
          user_id: userId,
          user_email: email,
          user_full_name: fullName,
          user_role: role,
          user_branch_id: branchId
        })

        if (rpcError) throw rpcError
      }

      // تحديث البيانات في واجهة المستخدم
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      onSuccess()
      
      toast({
        title: user ? 'تم تحديث المستخدم' : 'تم إضافة المستخدم',
        description: user ? 'تم تحديث المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح',
        type: 'success'
      })
    } catch (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast({
          title: 'خطأ',
          description: `حدث خطأ أثناء حفظ المستخدم: ${error.message}`,
          type: 'error'
        })
      } else {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء حفظ المستخدم',
          type: 'error'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // معالجة تغيير الدور
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    console.log('Selected role:', selectedValue);
    setRole(selectedValue);
  };

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

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-2 border rounded-lg ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              required
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full p-2 border rounded-lg ${
                errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              required
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الفرع <span className="text-red-500">*</span></label>
            <BranchSelector 
              value={branchId} 
              onChange={setBranchId}
              required
              error={errors.branchId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الدور <span className="text-red-500">*</span></label>
            <select
              value={role}
              onChange={handleRoleChange}
              className={`w-full p-2 border rounded-lg ${
                errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              required
            >
              <option value="user">مستخدم</option>
              <option value="admin">مدير</option>
              {/* عرض الأدوار المخصصة من قاعدة البيانات */}
              {roles.filter(r => r.name !== 'مدير' && r.name !== 'مستخدم').map(roleItem => (
                <option key={roleItem.id} value={mapRoleToSystemValue(roleItem.name)}>
                  {roleItem.name} {roleItem.permissions?.length === 0 ? '(بدون صلاحيات)' : ''}
                </option>
              ))}
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {user ? 'كلمة المرور (اتركها فارغة إذا لم ترد تغييرها)' : 'كلمة المرور'} {!user && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-2 border rounded-lg ${
                errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              required={!user}
              minLength={6}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div className="flex justify-end gap-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border dark:border-gray-700 rounded-lg"
              disabled={isLoading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg flex items-center gap-x-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جارٍ الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>حفظ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}