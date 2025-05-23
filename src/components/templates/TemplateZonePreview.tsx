import { useState, useEffect } from 'react'
import { DivideSquare, Info, Maximize2, Maximize as ArrowsMaximize } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Template, TemplateZone } from '../../types/database'

interface TemplateZonePreviewProps {
  templateId: string;
  showGuides?: boolean;
}

export function TemplateZonePreview({ templateId, showGuides = true }: TemplateZonePreviewProps) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [zones, setZones] = useState<TemplateZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // تحميل القالب ومناطق الكتابة
  useEffect(() => {
    async function loadTemplateAndZones() {
      setIsLoading(true)
      setError(null)
      
      try {
        // تحميل القالب
        const { data: templateData, error: templateError } = await supabase
          .from('letter_templates')
          .select('*')
          .eq('id', templateId)
          .single()
        
        if (templateError) throw templateError
        
        setTemplate(templateData)
        
        // تحميل مناطق الكتابة
        const { data: zonesData, error: zonesError } = await supabase
          .from('template_zones')
          .select('*')
          .eq('template_id', templateId)
          .order('created_at')
        
        if (zonesError) throw zonesError
        
        setZones(zonesData || [])
      } catch (error) {
        console.error('Error loading template zones:', error)
        setError('حدث خطأ أثناء تحميل مناطق الكتابة للقالب')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (templateId) {
      loadTemplateAndZones()
    }
  }, [templateId])

  // تبديل وضع ملء الشاشة
  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen)
  }

  // نعرض حالة التحميل
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96 border dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
      </div>
    )
  }

  // نعرض حالة الخطأ
  if (error) {
    return (
      <div className="flex justify-center items-center h-96 border dark:border-gray-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold mb-2">خطأ في التحميل</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // نعرض حالة عدم وجود قالب
  if (!template) {
    return (
      <div className="flex justify-center items-center h-96 border dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
        <div className="text-center">
          <DivideSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold mb-2">لا يوجد قالب</h3>
          <p className="text-gray-600 dark:text-gray-400">لم يتم العثور على القالب المطلوب</p>
        </div>
      </div>
    )
  }

  // تحديد استايل للحاوية استناداً إلى حالة ملء الشاشة
  const containerStyle = isFullscreen
    ? { 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
      }
    : {};

  return (
    <div style={containerStyle as React.CSSProperties} className={isFullscreen ? 'p-4' : ''}>
      <div className={`relative ${isFullscreen ? 'max-h-full max-w-full' : 'h-[842px] w-[595px]'} mx-auto bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg`}>
        {/* صورة القالب */}
        <img
          src={template.image_url}
          alt={template.name}
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* مناطق الكتابة */}
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`absolute ${
              showGuides ? 'border-2 border-dashed border-primary/50' : ''
            } ${
              hoveredZone === zone.id ? 'bg-primary/10' : 'bg-transparent'
            }`}
            style={{
              left: zone.x,
              top: zone.y,
              width: zone.width,
              height: zone.height,
            }}
            onMouseEnter={() => setHoveredZone(zone.id)}
            onMouseLeave={() => setHoveredZone(null)}
            title={zone.name}
          >
            {/* اسم المنطقة - يظهر عند التحويم أو عند تفعيل الأدلة */}
            {(hoveredZone === zone.id || showGuides) && (
              <div className="absolute -top-6 right-0 text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded-lg shadow-sm border dark:border-gray-700">
                {zone.name}
              </div>
            )}
          </div>
        ))}

        {/* زر ملء الشاشة */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 bg-white dark:bg-gray-900 rounded-full p-2 shadow-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <ArrowsMaximize className="h-5 w-5" />
          )}
        </button>

        {/* رسالة إذا لم تكن هناك مناطق */}
        {zones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md text-center">
              <Info className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-bold mb-2">لا توجد مناطق كتابة</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                لم يتم إضافة أي مناطق كتابة لهذا القالب بعد. يمكنك إضافة المناطق من خلال محرر مناطق الكتابة.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}