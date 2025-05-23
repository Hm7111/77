import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { Branch } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

interface Props {
  branch?: Branch
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BranchDialog({ branch, isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(branch?.name ?? '')
  const [city, setCity] = useState(branch?.city ?? '')
  const [code, setCode] = useState(branch?.code ?? '')
  const [isActive, setIsActive] = useState(branch?.is_active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (branch) {
      setName(branch.name)
      setCity(branch.city)
      setCode(branch.code)
      setIsActive(branch.is_active)
    } else {
      resetForm()
    }
  }, [branch, isOpen])
  
  function resetForm() {
    setName('')
    setCity('')
    setCode('')
    setIsActive(true)
    setErrors({})
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    
    if (!name.trim()) {
      newErrors.name = 'اسم الفرع مطلوب'
    }
    
    if (!city.trim()) {
      newErrors.city = 'اسم المدينة مطلوب'
    }
    
    if (!code.trim()) {
      newErrors.code = 'رمز الفرع مطلوب'
    } else if (code.length < 2 || code.length > 5) {
      newErrors.code = 'رمز الفرع يجب أن يكون من 2 إلى 5 أحرف'
    } else if (!/^[A-Za-z0-9]+$/.test(code)) {
      newErrors.code = 'رمز الفرع يجب أن يحتوي على أحرف إنجليزية وأرقام فقط'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsLoading(true)
    try {
      if (branch?.id) {
        // تحديث فرع موجود
        const { error } = await supabase
          .from('branches')
          .update({
            name,
            city,
            code,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', branch.id)

        if (error) throw error
        
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث الفرع بنجاح',
          type: 'success'
        })
      } else {
        // إنشاء فرع جديد
        const { error } = await supabase
          .from('branches')
          .insert({
            name,
            city,
            code,
            is_active: isActive
          })

        if (error) {
          if (error.code === '23505') { // رمز الخطأ للقيم المكررة
            setErrors({
              ...errors,
              code: 'رمز الفرع مستخدم بالفعل، الرجاء اختيار رمز آخر'
            })
            throw new Error('رمز الفرع مستخدم بالفعل')
          }
          throw error
        }
        
        toast({
          title: 'تم الإنشاء',
          description: 'تم إنشاء الفرع بنجاح',
          type: 'success'
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('مستخدم بالفعل')) {
          // الخطأ تم التعامل معه في الأعلى
        } else {
          toast({
            title: 'خطأ',
            description: error.message,
            type: 'error'
          })
        }
      } else {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء حفظ الفرع',
          type: 'error'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md">
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {branch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الفرع <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="أدخل اسم الفرع"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">المدينة <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all ${
                errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="أدخل اسم المدينة"
            />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رمز الفرع <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={`w-full p-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all ${
                errors.code ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="مثال: RYD"
              maxLength={5}
            />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              رمز الفرع يجب أن يكون من 2 إلى 5 أحرف إنجليزية أو أرقام (مثل RYD لفرع الرياض)
            </p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is-active" className="mr-2 block text-sm">
              فرع مفعّل
            </label>
          </div>

          <div className="flex justify-end gap-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={isLoading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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