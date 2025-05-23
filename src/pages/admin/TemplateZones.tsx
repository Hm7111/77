import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { 
  FileText, Edit, Eye, Plus, Search, Filter,
  LayoutTemplate, DivideSquare, Layers, Settings
} from 'lucide-react'
import { TemplateZoneEditor } from '../../components/templates/TemplateZoneEditor'
import type { Template } from '../../types/database'

export function TemplateZones() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .order('name')
        
      if (error) throw error
      setTemplates(data || [])
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

  // فتح محرر مناطق الكتابة
  function openZoneEditor(template: Template) {
    setSelectedTemplate(template)
    setShowEditor(true)
  }

  // تصفية القوالب حسب البحث
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div>
      {/* محرر مناطق الكتابة */}
      {showEditor && selectedTemplate && (
        <TemplateZoneEditor
          template={selectedTemplate}
          onClose={() => setShowEditor(false)}
          onSuccess={() => {
            loadTemplates()
            setShowEditor(false)
          }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <DivideSquare className="h-5 w-5 text-primary" />
            مناطق الكتابة في القوالب
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            تخصيص مناطق الكتابة في قوالب الخطابات لتحديد مواقع وأحجام وتنسيقات النصوص
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن قالب..."
              className="pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg w-60"
            />
          </div>
        </div>
      </div>

      {/* دليل الاستخدام */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 text-blue-800 dark:text-blue-300">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          دليل استخدام مناطق الكتابة
        </h3>
        <p className="mb-3">
          مناطق الكتابة هي المساحات المخصصة في القالب حيث يمكن إدخال النصوص. يمكنك تحديد مواقع وأحجام وتنسيقات هذه المناطق.
        </p>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>اختر القالب الذي تريد تعديل مناطق الكتابة فيه</li>
          <li>قم بإضافة مناطق كتابة جديدة أو تعديل المناطق الموجودة</li>
          <li>اسحب المناطق لتغيير موضعها، واستخدم المقابض لتغيير الحجم</li>
          <li>حدد نوع وحجم الخط ومحاذاة النص لكل منطقة</li>
          <li>احفظ التغييرات عند الانتهاء</li>
        </ol>
      </div>

      {/* عرض القوالب */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="border dark:border-gray-800 rounded-lg p-4 animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 h-40 mb-4 rounded"></div>
              <div className="bg-gray-200 dark:bg-gray-700 h-5 w-3/4 mb-2 rounded"></div>
              <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center border dark:border-gray-800">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          
          <h3 className="text-xl font-bold mb-2">
            {searchQuery ? 'لا توجد قوالب مطابقة للبحث' : 'لا توجد قوالب متاحة'}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            {searchQuery 
              ? 'حاول استخدام مصطلحات بحث مختلفة أو تصفح جميع القوالب المتاحة'
              : 'لا توجد قوالب متاحة حتى الآن. يرجى إضافة قوالب من صفحة إعدادات القوالب أولاً.'
            }
          </p>
          
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              إظهار كل القوالب
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <div 
              key={template.id} 
              className="border dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[1/1.414] group">
                <img 
                  src={template.image_url} 
                  alt={template.name}
                  className="w-full h-full object-contain"
                />
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => openZoneEditor(template)}
                    className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg shadow flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4 text-primary" />
                    <span>تعديل المناطق</span>
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="font-medium mb-1 flex items-center justify-between">
                  <h3 className="truncate">{template.name}</h3>
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {template.zones && Array.isArray(template.zones) 
                      ? template.zones.length 
                      : 0} منطقة
                  </span>
                </div>
                
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {template.description}
                  </p>
                )}
                
                <button
                  onClick={() => openZoneEditor(template)}
                  className="mt-3 w-full text-primary border border-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1"
                >
                  <Layers className="h-4 w-4" />
                  تعديل مناطق الكتابة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* رسالة إذا لم يتم العثور على نتائج */}
      {!isLoading && filteredTemplates.length === 0 && searchQuery && (
        <div className="text-center p-8">
          <p className="text-lg">لم يتم العثور على نتائج مطابقة لـ "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}