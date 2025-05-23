import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Save, FileText, Clock, Calendar, PlusCircle, Settings, 
  Eye, Download, Printer, CheckCircle, Share2, Copy, Sliders,
  BookTemplate as FileTemplate, ListPlus, RefreshCw, QrCode
} from 'lucide-react';
import QRCode from 'qrcode.react';
import moment from 'moment-hijri';
import { useLetters } from '../../../../hooks/useLetters';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { exportLetterToPDF, printLetter } from '../../../../lib/letter-utils';
import { RichTextEditor } from '../../../../components/letters/RichTextEditor';
import { useToast } from '../../../../hooks/useToast';
import { TextTemplateSelector } from '../../../../components/letters/TextTemplateSelector';
import { EditorSelector } from '../../../../components/letters/EditorSelector';
import Stepper from './Stepper';
import BasicInfoStep from './BasicInfoStep';
import ContentStep from './ContentStep/index';
import FinalStep from './FinalStep';
// Lazy loaded components
const TemplateStep = lazy(() => import('./TemplateStep'));

const MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

export function LetterEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const letterPreviewRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const { saveDraft, createLetter } = useLetters();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateId, setTemplateId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [content, setContent] = useState<Record<string, string>>({
    date: moment().format('iDD/iMM/iYYYY'),
    subject: '',
    to: ''
  });
  const { dbUser, user } = useAuth();
  const [currentYear] = useState(new Date().getFullYear());
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [showEditorControls, setShowEditorControls] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [editorConfig, setEditorConfig] = useState({
    fontSize: '16px',
    lineHeight: 1.5,
    fontFamily: 'Cairo',
  });
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateLoadError, setTemplateLoadError] = useState(false);

  // Editor state
  const [editorState, setEditorState] = useState({
    editorStyle: 'outside',
    previewScale: 'fit',
    livePreview: true,
    showQRInEditor: false,
    showTemplateSelector: false,
    editorType: 'tinymce',
  });

  // Load templates and setup autosave
  useEffect(() => {
    loadTemplates();
    
    let autosaveInterval: ReturnType<typeof setInterval>;
    
    if (autosaveEnabled) {
      autosaveInterval = setInterval(() => {
        if (templateId && content.body && dbUser?.id) {
          handleAutosave();
        }
      }, 60000); // Save every minute
    }
    
    return () => {
      if (autosaveInterval) clearInterval(autosaveInterval);
    };
  }, [templateId, content, dbUser?.id, autosaveEnabled]);

  // Load letter number when template is selected
  useEffect(() => {
    if (templateId) {
      loadNextNumber();
      loadSelectedTemplate();
    }
  }, [templateId]);

  // Load templates from database
  async function loadTemplates() {
    setLoadingTemplates(true);
    setTemplateLoadError(false);
    
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
      setTemplateLoadError(false);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplateLoadError(true);
      
      let errorMessage = 'حدث خطأ أثناء تحميل القوالب';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.';
      } else if (error instanceof Error) {
        errorMessage = `حدث خطأ: ${error.message}`;
      }
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
    } finally {
      setLoadingTemplates(false);
    }
  }

  // Load selected template details
  async function loadSelectedTemplate() {
    if (!templateId) return;
    
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (error) throw error;
      setSelectedTemplate(data);
    } catch (error) {
      console.error('Error loading template details:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل تفاصيل القالب',
        type: 'warning'
      });
    }
  }

  // Load next letter number
  async function loadNextNumber() {
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('number')
        .eq('year', currentYear)
        .order('number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const nextNum = data && data.length > 0 ? data[0].number + 1 : 1;
      setNextNumber(nextNum);
      setContent(prev => ({ ...prev, number: String(nextNum) }));
    } catch (error) {
      console.error('Error loading next number:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل رقم الخطاب التالي',
        type: 'warning'
      });
    }
  }

  // Autosave draft
  async function handleAutosave() {
    if (!dbUser?.id || !templateId || !content.body) return;
    
    try {
      await saveDraft({
        user_id: dbUser.id,
        template_id: templateId,
        content,
        status: 'draft',
        number: nextNumber,
        year: currentYear,
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending'
      });
      
      console.log('تم الحفظ التلقائي للمسودة');
    } catch (error) {
      console.error('Error auto-saving draft:', error);
    }
  }

  // Submit letter
  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsLoading(true);
    const verificationUrl = crypto.randomUUID();

    try {
      if (!dbUser?.id || !templateId) {
        throw new Error('يجب تسجيل الدخول واختيار قالب');
      }

      if (!content.subject || !content.to) {
        throw new Error('يجب إدخال موضوع الخطاب والجهة المرسل إليها');
      }

      if (!content.body) {
        throw new Error('يجب إدخال محتوى الخطاب');
      }

      // Store template snapshot data in content to ensure it's preserved
      const templateSnapshot = selectedTemplate ? {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        image_url: selectedTemplate.image_url,
        variables: selectedTemplate.variables,
        zones: selectedTemplate.zones,
        version: selectedTemplate.version
      } : null;

      const draft = await saveDraft({
        user_id: dbUser.id,
        template_id: templateId,
        template_snapshot: templateSnapshot,
        content: {
          ...content,
          verification_url: verificationUrl
        },
        status: 'completed',
        number: nextNumber,
        year: currentYear,
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending',
        verification_url: verificationUrl
      });

      await createLetter(draft);
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ الخطاب بنجاح',
        type: 'success'
      });
      
      setIsSaved(true);
      setTimeout(() => navigate('/admin/letters'), 2000);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء إنشاء الخطاب';
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Save as draft
  async function saveAsDraft() {
    if (!dbUser?.id || !templateId) return;
    
    setIsLoading(true);
    try {
      await saveDraft({
        user_id: dbUser.id,
        template_id: templateId,
        content,
        status: 'draft',
        number: nextNumber,
        year: currentYear,
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending'
      });
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ المسودة بنجاح',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/letters'), 1000);
    } catch (error) {
      console.error('Error saving draft:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ المسودة',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Date picker handling
  function handleDateClick() {
    setShowDatePicker(true);
  }

  function handleDateSelect(day: number, month: number, year: number) {
    const date = moment()
      .iYear(year)
      .iMonth(month)
      .iDate(day)
      .format('iDD/iMM/iYYYY');
    setContent(prev => ({ ...prev, date }));
    setShowDatePicker(false);
  }

  // Print letter
  async function handlePrint() {
    if (!templateId || !content.body) return;
    
    try {
      toast({
        title: 'جارِ الطباعة...',
        description: 'يتم تجهيز الخطاب للطباعة',
        type: 'info'
      });
      
      // Create a temporary letter object for print purposes
      const tempLetter = {
        id: '',
        user_id: dbUser?.id || '',
        template_id: templateId,
        template_snapshot: selectedTemplate ? {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          image_url: selectedTemplate.image_url,
          variables: selectedTemplate.variables,
          zones: selectedTemplate.zones,
          version: selectedTemplate.version
        } : undefined,
        content,
        status: 'draft',
        number: nextNumber || 0,
        year: currentYear,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        letter_templates: selectedTemplate
      };
      
      await printLetter(tempLetter);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الطباعة',
        type: 'error'
      });
    }
  }

  // Export to PDF
  async function handleExportPDF() {
    if (!templateId || !content.body) return;
    
    setIsExporting(true);
    try {
      toast({
        title: 'جارِ التصدير...',
        description: 'يتم تصدير الخطاب كملف PDF',
        type: 'info'
      });
      
      // Create a temporary letter object for export purposes
      const tempLetter = {
        id: '',
        user_id: dbUser?.id || '',
        template_id: templateId,
        template_snapshot: selectedTemplate ? {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          image_url: selectedTemplate.image_url,
          variables: selectedTemplate.variables,
          zones: selectedTemplate.zones,
          version: selectedTemplate.version
        } : undefined,
        content,
        status: 'draft',
        number: nextNumber || 0,
        year: currentYear,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        letter_templates: selectedTemplate
      };
      
      await exportLetterToPDF(tempLetter);
      
      toast({
        title: 'تم التصدير',
        description: 'تم تصدير الخطاب بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تصدير الملف',
        type: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  }

  // Handle template selection
  function handleSelectTemplate(id: string) {
    setTemplateId(id);
    setActiveStep(3); // Move to content step
  }

  // Handle content changes
  function handleContentChange(newContent: Partial<Record<string, string>>) {
    setContent(prev => ({ ...prev, ...newContent }));
  }

  // Handle editor config changes
  function handleFontSizeChange(size: string) {
    setEditorConfig(prev => ({ ...prev, fontSize: size }));
  }

  function handleLineHeightChange(height: number) {
    setEditorConfig(prev => ({ ...prev, lineHeight: height }));
  }

  // Toggle editor configuration
  function toggleShowTemplateSelector() {
    setEditorState(prev => ({
      ...prev,
      showTemplateSelector: !prev.showTemplateSelector
    }));
  }

  // Define steps
  const steps = [
    { title: 'البيانات الأساسية', description: 'إدخال الموضوع والجهة' },
    { title: 'اختيار القالب', description: 'اختيار قالب الخطاب المناسب' },
    { title: 'محتوى الخطاب', description: 'كتابة محتوى الخطاب وتنسيقه' },
    { title: 'المعاينة والحفظ', description: 'معاينة الخطاب قبل الحفظ' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Text template selector */}
      {editorState.showTemplateSelector && (
        <TextTemplateSelector
          onSelectTemplate={(templateContent) => {
            if (!content.body) {
              setContent(prev => ({ ...prev, body: templateContent }));
            } else {
              setContent(prev => ({ ...prev, body: prev.body + '\n\n' + templateContent }));
            }
            setEditorState(prev => ({ ...prev, showTemplateSelector: false }));
          }}
          onClose={() => setEditorState(prev => ({ ...prev, showTemplateSelector: false }))}
        />
      )}
    
      {/* Success message overlay */}
      {isSaved && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full flex flex-col items-center animate-fade-in">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">تم حفظ الخطاب بنجاح</h2>
            <p className="text-gray-600 mb-6 text-center">
              تم حفظ الخطاب بنجاح وإضافته إلى سجل الخطابات
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/admin/letters')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800"
              >
                عرض كافة الخطابات
              </button>
              <button
                onClick={() => {
                  setIsSaved(false);
                  navigate('new');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                إنشاء خطاب جديد
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-x-2">
          <button
            onClick={() => navigate('/admin/letters')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">إنشاء خطاب جديد</h1>
        </div>
        <div className="flex items-center gap-x-2">
          {templateId && (
            <>
              <button
                onClick={handlePrint}
                className="flex items-center gap-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={!content.body}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={!content.body || isExporting}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isExporting ? 'جارٍ التصدير...' : 'تصدير PDF'}
                </span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`p-2 rounded-lg ${
              showGuides ? 'bg-yellow-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
            title={showGuides ? 'إخفاء النقاط الإرشادية' : 'إظهار النقاط الإرشادية'}
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`p-2 rounded-lg ${
              previewMode ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'
            }`}
            title={previewMode ? 'تحرير' : 'معاينة'}
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !templateId || !content.body}
            className="flex items-center gap-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isLoading ? 'جارٍ الحفظ...' : 'حفظ الخطاب'}
            </span>
          </button>
        </div>
      </div>

      {/* Multi-step form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Stepper component */}
        <Stepper 
          activeStep={activeStep} 
          setActiveStep={setActiveStep}
          steps={steps}
          content={content}
        />

        {/* Step content */}
        {activeStep === 1 && (
          <BasicInfoStep
            content={content}
            onContentChange={handleContentChange}
            onNextStep={() => setActiveStep(2)}
            autosaveEnabled={autosaveEnabled}
            onToggleAutosave={() => setAutosaveEnabled(!autosaveEnabled)}
          />
        )}

        {activeStep === 2 && (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-600">جاري تحميل القوالب...</p>
            </div>
          }>
            <TemplateStep
              templates={templates}
              selectedTemplateId={templateId}
              onSelectTemplate={handleSelectTemplate}
              isLoading={loadingTemplates}
              onPreviousStep={() => setActiveStep(1)}
            />
          </Suspense>
        )}

        {activeStep === 3 && selectedTemplate && (
          <ContentStep
            content={content}
            onContentChange={handleContentChange}
            selectedTemplate={selectedTemplate}
            editorConfig={editorConfig}
            editorState={{
              ...editorState,
              previewMode,
              showGuides,
              showEditorControls,
              autosaveEnabled
            }}
            onLineHeightChange={handleLineHeightChange}
            onFontSizeChange={handleFontSizeChange}
            letterPreviewRef={letterPreviewRef}
            nextNumber={nextNumber}
            currentYear={currentYear}
            MONTHS_AR={MONTHS_AR}
            showDatePicker={showDatePicker}
            onDateClick={handleDateClick}
            onDateSelect={handleDateSelect}
            onNextStep={() => setActiveStep(4)}
            onPrevStep={() => setActiveStep(2)}
            onManualSave={handleAutosave}
            onShowTemplateSelector={toggleShowTemplateSelector}
          />
        )}

        {activeStep === 4 && selectedTemplate && (
          <FinalStep
            content={content}
            template={selectedTemplate}
            nextNumber={nextNumber}
            currentYear={currentYear}
            onSubmit={handleSubmit}
            onSaveAsDraft={saveAsDraft}
            onPrintClick={handlePrint}
            onExportClick={handleExportPDF}
            isLoading={isLoading}
            prevStep={() => setActiveStep(3)}
          />
        )}
      </div>
    </div>
  );
}