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
          تعديل مناطق الكتابة وعناصر الخطاب
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

              <div className="mt-8 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30">
                <h4 className="text-lg font-semibold mb-2 text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  مواضع العناصر الثابتة
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                  يمكنك الآن تخصيص مواضع العناصر الثابتة في القالب مثل رقم الخطاب وتاريخه وموضع التوقيع من خلال الضغط على زر "تعديل مناطق الكتابة وعناصر الخطاب".
                </p>
                <button
                  onClick={handleEditZones}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 w-fit"
                >
                  <Settings className="h-4 w-4" />
                  تعديل مواضع العناصر
                </button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="info" className="border dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50 min-h-[300px]">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              كيفية استخدام مناطق الكتابة والعناصر المخصصة
            </h3>
            
            <p className="mb-4">
              مناطق الكتابة والعناصر المخصصة هي أدوات قوية لتخصيص قوالب الخطابات. تسمح لك بتحديد المساحات التي يمكن للمستخدمين الكتابة فيها، وتخصيص مواضع العناصر الثابتة مثل رقم الخطاب وتاريخه وموضع التوقيع.
            </p>
            
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-1.5 text-blue-800 dark:text-blue-400">
                  <Layers className="h-4 w-4" />
                  <span>مناطق الكتابة</span>
                </h4>
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  مناطق الكتابة تحدد المساحات المسموح للمستخدمين الكتابة فيها في القالب، وتتضمن خصائص مثل الموضع والحجم ونوع الخط وحجمه ومحاذاة النص.
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-1.5 text-green-800 dark:text-green-400">
                  <Settings className="h-4 w-4" />
                  <span>العناصر الثابتة المخصصة</span>
                </h4>
                <p className="text-green-700 dark:text-green-400 text-sm">
                  الميزة الجديدة تتيح لك تخصيص مواضع العناصر الثابتة في الخطاب مثل:
                </p>
                <ul className="list-disc mr-6 mt-2 space-y-1 text-sm text-green-700 dark:text-green-400">
                  <li>موضع رقم الخطاب وعرضه ومحاذاته</li>
                  <li>موضع تاريخ الخطاب وعرضه ومحاذاته</li>
                  <li>موضع وأبعاد التوقيع ومحاذاته</li>
                  <li>موضع رمز QR وحجمه</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-1.5 text-purple-800 dark:text-purple-400">
                  <DivideSquare className="h-4 w-4" />
                  <span>كيفية تخصيص المواضع</span>
                </h4>
                <p className="text-purple-700 dark:text-purple-400 text-sm">
                  لتخصيص مواضع العناصر:
                </p>
                <ol className="list-decimal mr-6 mt-2 space-y-1 text-sm text-purple-700 dark:text-purple-400">
                  <li>انقر على "تعديل مناطق الكتابة وعناصر الخطاب" في الأعلى</li>
                  <li>اختر تبويب "العناصر الثابتة" في محرر المناطق</li>
                  <li>اسحب العناصر (رقم الخطاب، التاريخ، التوقيع) لتحديد مواضعها</li>
                  <li>يمكنك تعديل أبعاد كل عنصر ومحاذاته من خلال لوحة الإعدادات</li>
                  <li>احفظ التغييرات عند الانتهاء</li>
                </ol>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}