import { useState, useRef, useEffect } from 'react'
import { X, Plus, Move, Type, Save } from 'lucide-react'
import type { Template, TemplateZone, TemplateVariable } from '../../types/database'
import { supabase } from '../../lib/supabase'

interface Props {
  template?: Template
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TemplateEditor({ template, isOpen, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [categoryId, setCategoryId] = useState(template?.category_id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [zones, setZones] = useState<TemplateZone[]>([])
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [categories, setCategories] = useState([])
  const [availableVariables, setAvailableVariables] = useState([])

  useEffect(() => {
    loadCategories()
    loadVariables()
    if (template?.id) {
      loadZones()
    }
  }, [template?.id])

  async function loadCategories() {
    const { data } = await supabase
      .from('template_categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  async function loadVariables() {
    const { data } = await supabase
      .from('template_variables')
      .select('*')
      .order('name')
    setAvailableVariables(data || [])
  }

  async function loadZones() {
    if (!template?.id) return
    const { data } = await supabase
      .from('template_zones')
      .select('*')
      .eq('template_id', template.id)
      .order('created_at')
    setZones(data || [])
  }

  function handleAddZone() {
    if (!previewRef.current) return
    
    const rect = previewRef.current.getBoundingClientRect()
    const newZone: Partial<TemplateZone> = {
      name: `منطقة_${zones.length + 1}`,
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      font_size: 14,
      font_family: 'Cairo',
      alignment: 'right'
    }
    
    setZones([...zones, newZone as TemplateZone])
  }

  function handleZoneDrag(index: number, x: number, y: number) {
    const newZones = [...zones]
    newZones[index] = { ...newZones[index], x, y }
    setZones(newZones)
  }

  function handleZoneResize(index: number, width: number, height: number) {
    const newZones = [...zones]
    newZones[index] = { ...newZones[index], width, height }
    setZones(newZones)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      let image_url = template?.image_url

      if (file) {
        if (template?.image_url) {
          const oldPath = template.image_url.split('/').pop()
          if (oldPath) {
            await supabase.storage
              .from('templates')
              .remove([oldPath])
          }
        }

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

      const templateData = {
        name,
        description,
        category_id: categoryId || null,
        image_url: image_url!,
        is_active: true,
        variables: variables.map(v => ({ name: v.name, value: v.default_value })),
        zones: zones.map(z => ({
          name: z.name,
          x: z.x,
          y: z.y,
          width: z.width,
          height: z.height,
          fontSize: z.font_size,
          fontFamily: z.font_family,
          alignment: z.alignment
        })),
        updated_at: new Date().toISOString()
      }

      if (template?.id) {
        const { error } = await supabase
          .from('letter_templates')
          .update(templateData)
          .eq('id', template.id)

        if (error) throw error

        // تحديث مناطق الكتابة
        await supabase
          .from('template_zones')
          .delete()
          .eq('template_id', template.id)

        for (const zone of zones) {
          await supabase
            .from('template_zones')
            .insert({
              ...zone,
              template_id: template.id
            })
        }
      } else {
        const { data, error } = await supabase
          .from('letter_templates')
          .insert(templateData)
          .select()
          .single()

        if (error) throw error

        // إضافة مناطق الكتابة
        for (const zone of zones) {
          await supabase
            .from('template_zones')
            .insert({
              ...zone,
              template_id: data.id
            })
        }
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء حفظ القالب')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {template ? 'تعديل القالب' : 'إضافة قالب جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex">
          {/* منطقة المعاينة */}
          <div className="flex-1 border-l p-4 bg-gray-50">
            <div className="bg-white rounded-lg shadow relative" ref={previewRef}>
              {template?.image_url && (
                <img
                  src={template.image_url}
                  alt={template.name}
                  className="w-full"
                />
              )}
              
              {/* مناطق الكتابة */}
              {zones.map((zone, index) => (
                <div
                  key={index}
                  className={`absolute border-2 ${
                    selectedZone === zone.id ? 'border-primary' : 'border-gray-400 border-dashed'
                  } bg-white/50 cursor-move`}
                  style={{
                    left: zone.x,
                    top: zone.y,
                    width: zone.width,
                    height: zone.height
                  }}
                  onClick={() => setSelectedZone(zone.id)}
                >
                  <div className="absolute -top-6 right-0 text-xs bg-white px-2 py-1 rounded border">
                    {zone.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* منطقة الإعدادات */}
          <div className="w-96 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم القالب</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">الوصف</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded-lg h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">التصنيف</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">بدون تصنيف</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">صورة القالب</label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full p-2 border rounded-lg"
                required={!template?.image_url}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">مناطق الكتابة</label>
                <button
                  type="button"
                  onClick={handleAddZone}
                  className="text-primary hover:text-primary/80"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {zones.map((zone, index) => (
                  <div
                    key={index}
                    className={`p-2 border rounded-lg ${
                      selectedZone === zone.id ? 'border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-x-2 mb-2">
                      <Move className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) => {
                          const newZones = [...zones]
                          newZones[index] = { ...zone, name: e.target.value }
                          setZones(newZones)
                        }}
                        className="flex-1 p-1 border rounded text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={zone.font_size}
                        onChange={(e) => {
                          const newZones = [...zones]
                          newZones[index] = { ...zone, font_size: +e.target.value }
                          setZones(newZones)
                        }}
                        className="p-1 border rounded text-sm"
                        placeholder="حجم الخط"
                      />
                      <select
                        value={zone.alignment}
                        onChange={(e) => {
                          const newZones = [...zones]
                          newZones[index] = { ...zone, alignment: e.target.value }
                          setZones(newZones)
                        }}
                        className="p-1 border rounded text-sm"
                      >
                        <option value="right">يمين</option>
                        <option value="center">وسط</option>
                        <option value="left">يسار</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">المتغيرات المتاحة</label>
              <div className="space-y-2">
                {availableVariables.map((variable: any) => (
                  <div key={variable.id} className="flex items-center gap-x-2">
                    <input
                      type="checkbox"
                      checked={variables.some(v => v.id === variable.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVariables([...variables, variable])
                        } else {
                          setVariables(variables.filter(v => v.id !== variable.id))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{variable.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground p-2 rounded-lg flex items-center justify-center gap-x-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'جارٍ الحفظ...' : 'حفظ القالب'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}