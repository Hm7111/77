import { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'
import { Plus, Trash2 } from 'lucide-react'
import type { Template } from '../types/database'
import { supabase } from '../lib/supabase'
import { TemplateDialog } from '../components/templates/TemplateDialog'

export function Settings() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        alert('حدث خطأ أثناء تحميل القوالب')
        return
      }

      setTemplates(data)
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء تحميل القوالب')
    }
  }

  function handleEdit(template: Template) {
    setSelectedTemplate(template)
    setIsDialogOpen(true)
  }

  function handleAdd() {
    setSelectedTemplate(undefined)
    setIsDialogOpen(true)
  }

  async function handleDelete(template: Template) {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return
    
    try {
      // حذف الصورة من التخزين
      const oldPath = template.image_url.split('/').pop()
      if (oldPath) {
        await supabase.storage
          .from('templates')
          .remove([oldPath])
      }

      // حذف القالب من قاعدة البيانات
      const { error } = await supabase
        .from('letter_templates')
        .delete()
        .eq('id', template.id)

      if (error) throw error

      loadTemplates()
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء حذف القالب')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>
          
          <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">قوالب الخطابات</h2>
          <button
            onClick={handleAdd}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            إضافة قالب جديد
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4">
                <img
                  src={template.image_url}
                  alt={template.name}
                  className="w-full h-48 object-contain bg-gray-50 rounded-lg mb-4"
                />
                <h3 className="font-medium mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${template.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {template.is_active ? 'مفعل' : 'غير مفعل'}
                  </span>
                  <div className="flex items-center gap-x-3">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-sm text-primary hover:underline"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
          </div>
          
          <TemplateDialog
            template={selectedTemplate}
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={loadTemplates}
          />
        </main>
      </div>
    </div>
  )
}