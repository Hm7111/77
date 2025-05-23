import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { TemplateZonePreview } from './TemplateZonePreview';
import { TemplateZoneEditor } from './TemplateZoneEditor';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { DivideSquare, Settings, Layers, Info, FileText, Palette } from 'lucide-react';
import type { Template, TemplateZone } from '../../types/database';

interface TemplateZonesPanelProps {
  templateId: string;
}

export function TemplateZonesPanel({ templateId }: TemplateZonesPanelProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [template, setTemplate] = useState<Template | null>(null);
  const [zones, setZones] = useState<TemplateZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();

  // تحميل بيانات القالب ومناطق الكتابة
  useEffect(() => {
    async function loadTemplateAndZones() {
      setIsLoading(true);
      try {
        // تحميل بيانات القالب
        const { data: templateData, error: templateError } = await supabase
          .from('letter_templates')
          .select('*')
          .eq('id', templateId)
          .single();
          
        if (templateError) throw templateError;
        setTemplate(templateData);
        
        // تحميل مناطق الكتابة للقالب
        const { data: zonesData, error: zonesError } = await supabase
          .from('template_zones')
          .select('*')
          .eq('template_id', templateId)
          .order('created_at');
          
        if (zonesError) throw zonesError;
        setZones(zonesData || []);
        
      } catch (error) {
        console.error('Error loading template data:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل بيانات القالب',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    if (templateId) {
      loadTemplateAndZones();
    }
  }, [templateId]);

  // بدء تعديل المناطق
  function handleEditZones() {
    setEditMode(true);
  }

  // إنهاء التعديل
  function handleFinishEditing() {
    setEditMode(false);
    // إعادة تحميل المناطق
    loadZones();
  }

  // تحميل مناطق الكتابة فقط
  async function loadZones() {
    try {
      const { data, error } = await supabase
        .from('template_zones')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at');
        
      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error reloading zones:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-bold mb-2">خطأ في تحميل القالب</h3>
        <p>تعذر العثور على القالب المطلوب</p>
      </div>
    );
  }

  // إذا كان وضع التعديل مفعلاً، نعرض المحرر
  if (editMode) {
    return (
      <TemplateZoneEditor
        template={template}
        onClose={handleFinishEditing}
        onSuccess={handleFinishEditing}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DivideSquare className="h-5 w-5 text-primary" />
            مناطق الكتابة - {template.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {zones.length > 0 
              ? `يحتوي هذا القالب على ${zones.length} منطقة كتابة`
              : 'لا يحتوي هذا القالب على مناطق كتابة حتى الآن'
            }
          </p>
        </div>
        
        <button
          onClick={handleEditZones}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          تعديل مناطق الكتابة
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="preview" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span>معاينة المناطق</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>تفاصيل المناطق</span>
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            <span>معلومات</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="border dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50 min-h-[600px]">
          <div className="flex justify-center">
            <TemplateZonePreview templateId={templateId} />
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="border dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50 min-h-[300px]">
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <DivideSquare className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد مناطق كتابة</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                لم يتم إضافة أي مناطق كتابة لهذا القالب بعد. انقر على "تعديل مناطق الكتابة" لإضافة مناطق جديدة.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.map(zone => (
                  <div key={zone.id} className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-1.5">
                        <DivideSquare className="h-4 w-4 text-primary" />
                        {zone.name}
                      </h4>
                      <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {zone.width}×{zone.height}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">الموضع:</span>
                        <span className="mr-2 font-mono">X: {zone.x}, Y: {zone.y}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">الخط:</span>
                        <span className="mr-2" style={{ fontFamily: zone.font_family }}>
                          {zone.font_family}, {zone.font_size}px
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">المحاذاة:</span>
                        <span className="mr-2">
                          {zone.alignment === 'right' ? 'يمين' : 
                           zone.alignment === 'center' ? 'وسط' : 'يسار'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t dark:border-gray-800">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-sm" style={{
                        fontFamily: zone.font_family,
                        fontSize: `${zone.font_size}px`,
                        textAlign: zone.alignment as 'left' | 'center' | 'right',
                        direction: 'rtl'
                      }}>
                        نص معاينة
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="info" className="border dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50 min-h-[300px]">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              كيفية استخدام مناطق الكتابة
            </h3>
            
            <p className="mb-4">
              مناطق الكتابة هي أداة قوية لتخصيص قوالب الخطابات. تسمح لك بتحديد المساحات التي يمكن للمستخدمين الكتابة فيها، وتحديد خصائص النص لكل منطقة.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">فوائد مناطق الكتابة:</h4>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>تنظيم محتوى الخطابات بشكل متناسق</li>
                  <li>تحديد أماكن النصوص بدقة على القالب</li>
                  <li>تخصيص خصائص الخط والمحاذاة لكل جزء من الخطاب</li>
                  <li>سهولة إنشاء خطابات متناسقة ومهنية</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">خصائص مناطق الكتابة:</h4>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>
                    <strong>الموضع والحجم:</strong> تحديد مكان وحجم منطقة الكتابة على القالب
                  </li>
                  <li>
                    <strong>نوع الخط:</strong> تحديد الخط الذي سيظهر به النص
                  </li>
                  <li>
                    <strong>حجم الخط:</strong> تحديد حجم النص في المنطقة
                  </li>
                  <li>
                    <strong>المحاذاة:</strong> تحديد محاذاة النص (يمين، وسط، يسار)
                  </li>
                </ul>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">خطوات إعداد المناطق:</h4>
                <ol className="list-decimal list-inside space-y-1 mr-4">
                  <li>انقر على "تعديل مناطق الكتابة" للبدء</li>
                  <li>استخدم زر "إضافة منطقة" لإضافة منطقة جديدة للقالب</li>
                  <li>اسحب المنطقة إلى المكان المناسب على القالب</li>
                  <li>استخدم المقابض لتغيير حجم المنطقة</li>
                  <li>عدل خصائص المنطقة من لوحة الإعدادات</li>
                  <li>انقر على "حفظ" لحفظ التغييرات</li>
                </ol>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}