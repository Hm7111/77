import { useState, useEffect } from 'react'
import { X, Upload, Camera, ImageOff } from 'lucide-react'
import type { Template } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

interface Props {
  template?: Template
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TemplateDialog({ template, isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState(template?.category_id ?? '')
  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isActive, setIsActive] = useState(template?.is_active ?? true)
  
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description ?? '')
      setCategoryId(template.category_id ?? '')
      setIsActive(template.is_active ?? true)
      setFilePreview(null)
    } else {
      resetForm()
    }
    
    loadCategories()
  }, [template, isOpen])
  
  function resetForm() {
    setName('')
    setDescription('')
    setFile(null)
    setFilePreview(null)
    setCategoryId('')
    setIsActive(true)
    setErrors({})
  }
  
  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('template_categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل التصنيفات',
        type: 'error'
      })
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) {
      setFile(null)
      setFilePreview(null)
      return
    }
    
    // التحقق من نوع الملف
    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار ملف صورة صالح',
        type: 'error'
      })
      return
    }
    
    // التحقق من حجم الملف (الحد الأقصى 5 ميجابايت)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'خطأ',
        description: 'حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت',
        type: 'error'
      })
      return
    }
    
    setFile(selectedFile)
    
    // إنشاء معاينة للملف المختار
    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }
  
  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    
    if (!name.trim()) {
      newErrors.name = 'اسم القالب مطلوب'
    }
    
    if (!template?.image_url && !file) {
      newErrors.image = 'صورة القالب مطلوبة'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsLoading(true)
    
    try {
      let image_url = template?.image_url

      if (file) {
        // حذف الصورة القديمة إذا كانت موجودة
        if (template?.image_url) {
          const oldPath = template.image_url.split('/').pop()
          if (oldPath) {
            await supabase.storage
              .from('templates')
              .remove([oldPath])
          }
        }

        // تنظيف اسم الملف من الأحرف الخاصة والمسافات
        const safeFileName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, '-')
          .replace(/-+/g, '-')

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('templates')
          .upload(`${Date.now()}-${safeFileName}`, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('templates')
          .getPublicUrl(uploadData.path)

        image_url = publicUrl
      }

      if (template?.id) {
        // تحديث قالب موجود
        const { error } = await supabase
          .from('letter_templates')
          .update({
            name,
            description,
            category_id: categoryId || null,
            image_url,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)

        if (error) throw error
        
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث القالب بنجاح',
          type: 'success'
        })
      } else {
        // إنشاء قالب جديد
        const { error } = await supabase
          .from('letter_templates')
          .insert({
            name,
            description,
            category_id: categoryId || null,
            image_url: image_url!,
            is_active: isActive
          })

        if (error) throw error
        
        toast({
          title: 'تم الإضافة',
          description: 'تم إضافة القالب بنجاح',
          type: 'success'
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ القالب',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-lg">
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {template ? 'تعديل القالب' : 'إضافة قالب جديد'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">اسم القالب <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full p-2 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              required
              placeholder="أدخل اسم القالب"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg h-24 resize-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              placeholder="أدخل وصفًا مختصرًا للقالب"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">التصنيف</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value="">بدون تصنيف</option>
              {categories.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">صورة القالب <span className="text-red-500">*</span></label>
            
            <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
              errors.image ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}>
              {/* معاينة الصورة */}
              {filePreview || template?.image_url ? (
                <div className="relative mb-4">
                  <img 
                    src={filePreview || template?.image_url}
                    alt="معاينة الصورة"
                    className="max-h-60 max-w-full mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setFilePreview(null)
                      
                      // إذا كنا نحذف صورة القالب الأصلية وليس صورة جديدة
                      if (!filePreview && template?.image_url) {
                        setErrors({...errors, image: 'صورة القالب مطلوبة'})
                      }
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                    title="حذف الصورة"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <ImageOff className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">لم يتم اختيار صورة</p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <label className="flex items-center gap-2 justify-center px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer text-sm">
                  <Upload className="h-4 w-4" />
                  تحميل صورة
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                
                <button
                  type="button"
                  className="flex items-center gap-2 justify-center px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm"
                >
                  <Camera className="h-4 w-4" />
                  التقاط صورة
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                الصيغ المدعومة: JPG، PNG. الحد الأقصى: 5MB
              </p>
              {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
            </div>
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
              قالب مفعّل
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
                <span>حفظ</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}