import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, Edit, Copy, Eye, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { TemplateDialog } from './TemplateDialog'
import type { Template } from '../../types/database'

interface TemplateGalleryProps {
  isAdmin?: boolean
}

export function TemplateGallery({ isAdmin = false }: TemplateGalleryProps) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | undefined>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [templatesInUse, setTemplatesInUse] = useState<Record<string, number>>({})

  useEffect(() => {
    loadTemplates()
    loadCategories()
    if (isAdmin) {
      loadTemplatesUsage()
    }
  }, [isAdmin])

  useEffect(() => {
    filterTemplates()
  }, [searchQuery, templates, selectedCategory])

  async function loadTemplates() {
    setIsLoading(true)
    try {
      // Try to load templates with is_deleted filter first
      try {
        const { data, error } = await supabase
          .from('letter_templates')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })

        if (error) throw error
        setTemplates(data || [])
        setFilteredTemplates(data || [])
      } catch (initialError) {
        // If error is about is_deleted column not existing, try without the filter
        if (initialError.message && initialError.message.includes('is_deleted does not exist')) {
          console.warn('is_deleted column does not exist yet, loading all templates')
          const { data, error } = await supabase
            .from('letter_templates')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error
          setTemplates(data || [])
          setFilteredTemplates(data || [])
        } else {
          // If error is not about is_deleted, rethrow it
          throw initialError
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل القوالب',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadTemplatesUsage() {
    try {
      // Get count of letters per template using a simpler approach without group()
      const { data, error } = await supabase
        .from('letters')
        .select('template_id')
      
      if (error) throw error
      
      // Count occurrences of each template_id manually
      const usageMap: Record<string, number> = {}
      data.forEach(item => {
        if (item.template_id) {
          usageMap[item.template_id] = (usageMap[item.template_id] || 0) + 1
        }
      })
      
      setTemplatesInUse(usageMap)
    } catch (error) {
      console.error('Error loading template usage:', error)
    }
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
    }
  }

  function filterTemplates() {
    let filtered = [...templates]
    
    // تطبيق البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query))
      )
    }
    
    // تطبيق فلتر الفئة
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => 
        template.category_id === selectedCategory
      )
    }
    
    setFilteredTemplates(filtered)
  }

  function handleEdit(template: Template) {
    setSelectedTemplate(template)
    setIsDialogOpen(true)
  }

  function handleAdd() {
    setSelectedTemplate(undefined)
    setIsDialogOpen(true)
  }

  async function handleDuplicate(template: Template) {
    try {
      // إنشاء نسخة من القالب
      const { data, error } = await supabase
        .from('letter_templates')
        .insert({
          ...template,
          id: undefined, // يجب حذف المعرّف ليتم إنشاء معرّف جديد
          name: `${template.name} (نسخة)`,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'تم النسخ',
        description: 'تم نسخ القالب بنجاح',
        type: 'success'
      })
      
      loadTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء نسخ القالب',
        type: 'error'
      })
    }
  }

  async function handleDelete(id: string) {
    try {
      // التحقق من استخدام القالب
      const { count, error: countError } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', id)
      
      if (countError) throw countError
      
      // إذا كان القالب مستخدم في خطابات، نمنع الحذف
      if (count && count > 0) {
        toast({
          title: 'لا يمكن الحذف',
          description: `لا يمكن حذف هذا القالب لأنه مستخدم في ${count} خطاب. يمكنك تعطيله بدلاً من حذفه.`,
          type: 'error'
        })
        setShowDeleteConfirm(null)
        return
      }
      
      try {
        // محاولة استخدام الحذف الناعم (soft delete) للقالب
        const { error: updateError } = await supabase
          .from('letter_templates')
          .update({ is_deleted: true })
          .eq('id', id)

        if (updateError) throw updateError
      } catch (softDeleteError) {
        // إذا فشل الحذف الناعم (ربما لعدم وجود العمود بعد)، نستخدم الحذف الحقيقي
        if (softDeleteError.message && softDeleteError.message.includes('is_deleted does not exist')) {
          const { error: hardDeleteError } = await supabase
            .from('letter_templates')
            .delete()
            .eq('id', id)
            
          if (hardDeleteError) throw hardDeleteError
        } else {
          throw softDeleteError
        }
      }

      toast({
        title: 'تم الحذف',
        description: 'تم حذف القالب بنجاح',
        type: 'success'
      })
      
      loadTemplates()
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف القالب',
        type: 'error'
      })
    } finally {
      setShowDeleteConfirm(null)
    }
  }

  async function handleToggleActive(template: Template) {
    try {
      const { error } = await supabase
        .from('letter_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id)
      
      if (error) throw error
      
      toast({
        title: template.is_active ? 'تم تعطيل القالب' : 'تم تفعيل القالب',
        description: template.is_active 
          ? 'تم تعطيل القالب بنجاح' 
          : 'تم تفعيل القالب بنجاح',
        type: 'success'
      })
      
      loadTemplates()
    } catch (error) {
      console.error('Error toggling template active state:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة القالب',
        type: 'error'
      })
    }
  }

  function handlePreview(template: Template) {
    setPreviewTemplate(template)
  }

  return (
    <div>
      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">
              هل أنت متأكد من رغبتك في حذف هذا القالب؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-800 bg-gray-100 hover:bg-gray-200 rounded"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* نافذة معاينة القالب */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg max-h-full w-auto relative">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2 text-center">{previewTemplate.name}</h3>
              {previewTemplate.description && (
                <p className="text-gray-600 text-sm mb-4 text-center">{previewTemplate.description}</p>
              )}
              <img
                src={previewTemplate.image_url}
                alt={previewTemplate.name}
                className="max-h-[80vh] object-contain"
                style={{ maxWidth: 'min(80vw, 800px)' }}
              />
              <div className="flex justify-center mt-4 gap-3">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setPreviewTemplate(null)
                      handleEdit(previewTemplate)
                    }}
                    className="px-3 py-2 bg-primary text-white rounded flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    تعديل
                  </button>
                )}
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-3 py-2 bg-gray-100 text-gray-800 rounded"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold">قوالب الخطابات</h2>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن قالب..."
              className="w-full min-w-[200px] pl-3 pr-10 py-2 border rounded-lg text-sm"
            />
          </div>
          
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm min-w-[150px]"
            >
              <option value="all">جميع التصنيفات</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          )}
          
          {isAdmin && (
            <button
              onClick={handleAdd}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              إضافة قالب جديد
            </button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 h-48 rounded-lg mb-4"></div>
              <div className="bg-gray-200 dark:bg-gray-700 h-5 rounded w-2/3 mb-2"></div>
              <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded w-full mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded w-1/4"></div>
                <div className="bg-gray-200 dark:bg-gray-700 h-8 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          
          <h3 className="text-xl font-bold mb-2">
            {searchQuery || selectedCategory !== 'all'
              ? 'لا توجد قوالب مطابقة للبحث'
              : 'لا توجد قوالب متاحة'}
          </h3>
          
          {searchQuery || selectedCategory !== 'all' ? (
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              جرب تغيير معايير البحث أو اختيار تصنيف آخر لعرض المزيد من القوالب.
            </p>
          ) : (
            isAdmin ? (
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                لا توجد قوالب متاحة حتى الآن. أنت بحاجة إلى إضافة قوالب جديدة.
              </p>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                لا توجد قوالب متاحة حتى الآن. يرجى التواصل مع مدير النظام.
              </p>
            )
          )}
          
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 mr-2"
            >
              إعادة ضبط البحث
            </button>
          )}
          
          {isAdmin && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة قالب جديد
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => {
            // العثور على الفئة المتعلقة بهذا القالب
            const category = categories.find(c => c.id === template.category_id)
            // عدد الخطابات التي تستخدم هذا القالب
            const usageCount = templatesInUse[template.id] || 0
            
            return (
              <div key={template.id} className="border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                <div 
                  className="aspect-[1/1.414] cursor-pointer relative group overflow-hidden"
                  onClick={() => handlePreview(template)}
                >
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-lg line-clamp-1" title={template.name}>
                      {template.name}
                    </h3>
                    {template.is_active ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    ) : (
                      <span className="inline-flex h-2 w-2 rounded-full bg-gray-300"></span>
                    )}
                  </div>
                  
                  {category && (
                    <div className="mb-2">
                      <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                        {category.name}
                      </span>
                    </div>
                  )}
                  
                  {template.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3" title={template.description}>
                      {template.description}
                    </p>
                  )}
                  
                  {isAdmin && usageCount > 0 && (
                    <div className="mb-2">
                      <span className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                        مستخدم في {usageCount} خطاب
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-500" title={new Date(template.updated_at).toLocaleString()}>
                      {new Date(template.updated_at).toLocaleDateString()}
                    </span>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(template)
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="معاينة"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(template)
                            }}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicate(template)
                            }}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            title="نسخ"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleActive(template)
                            }}
                            className={`p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
                              template.is_active ? 'hover:text-yellow-600' : 'hover:text-green-600' 
                            }`}
                            title={template.is_active ? 'تعطيل القالب' : 'تفعيل القالب'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {template.is_active ? (
                                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                              ) : (
                                <path d="M18 8V4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM9 1v3M15 1v3M9 16l2 2 4-4" />
                              )}
                            </svg>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(template.id)
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TemplateDialog
        template={selectedTemplate}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          loadTemplates()
          setIsDialogOpen(false)
        }}
      />
    </div>
  )
}