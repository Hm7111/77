import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Save, FileText, Clock, Calendar, PlusCircle, Settings, 
  Eye, Download, Printer, CheckCircle, Share2, Copy, Sliders,
  BookTemplate as FileTemplate, ListPlus, RefreshCw, QrCode
} from 'lucide-react'
import QRCode from 'qrcode.react'
import moment from 'moment-hijri'
import { useLetters } from '../../hooks/useLetters'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { exportLetterToPDF, printLetter } from '../../lib/letter-utils'
import TemplateSelector from './TemplateSelector'
import { RichTextEditor } from './RichTextEditor'
import { useToast } from '../../hooks/useToast'
import { TextTemplateSelector } from './TextTemplateSelector'
import { EditorSelector } from './EditorSelector'
import { useNextNumber } from '../../features/letters/hooks/useNextNumber'

const MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
]

export function LetterEditor() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const letterPreviewRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const { saveDraft, createLetter } = useLetters()
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateId, setTemplateId] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [content, setContent] = useState<Record<string, string>>({
    date: moment().format('iDD/iMM/iYYYY'),
    subject: '',
    to: ''
  })
  const { dbUser, user } = useAuth()
  const { 
    loadNextNumber, 
    nextNumber, 
    currentYear,
    branchCode, 
    letterReference 
  } = useNextNumber()
  
  const [previewMode, setPreviewMode] = useState(false)
  const [showGuides, setShowGuides] = useState(false)
  const [showEditorControls, setShowEditorControls] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [editorConfig, setEditorConfig] = useState({
    fontSize: '16px',
    lineHeight: 0,
    fontFamily: 'Cairo',
  })
  // Add loading state for templates
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templateLoadError, setTemplateLoadError] = useState(false)

  // حالة النمط الحالي للمحرر (داخل القالب / خارج القالب)
  const [editorStyle, setEditorStyle] = useState<'inside' | 'outside'>('outside')

  // حجم المعاينة
  const [previewScale, setPreviewScale] = useState<'fit' | 'actual'>('fit')

  // حالة المعاينة التلقائية
  const [livePreview, setLivePreview] = useState(true)
  
  // إضافة حالة لإظهار محدد النماذج النصية
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  
  // إضافة حالة لإخفاء رمز QR في المحرر
  const [showQRInEditor, setShowQRInEditor] = useState(false)
  
  // حالة نوع المحرر
  const [editorType, setEditorType] = useState<'tinymce'>('tinymce')

  useEffect(() => {
    loadTemplates()
    
    // حفظ المسودة تلقائياً كل دقيقة
    let autosaveInterval: ReturnType<typeof setInterval>
    
    if (autosaveEnabled) {
      autosaveInterval = setInterval(() => {
        if (templateId && content.body && dbUser?.id) {
          handleAutosave()
        }
      }, 60000)
    }
    
    return () => {
      if (autosaveInterval) clearInterval(autosaveInterval)
    }
  }, [templateId, content, dbUser?.id, autosaveEnabled])

  useEffect(() => {
    if (templateId) {
      loadNextNumber(templateId)
      // Load selected template details
      loadSelectedTemplate()
    }
  }, [templateId])

  async function loadTemplates() {
    setLoadingTemplates(true)
    setTemplateLoadError(false)
    
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTemplates(data)
      setTemplateLoadError(false)
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplateLoadError(true)
      
      // Provide more specific error message based on error type
      let errorMessage = 'حدث خطأ أثناء تحميل القوالب'
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.'
      } else if (error instanceof Error) {
        errorMessage = `حدث خطأ: ${error.message}`
      }
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      })
    } finally {
      setLoadingTemplates(false)
    }
  }

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

  async function handleAutosave() {
    if (!dbUser?.id || !templateId || !content.body) return
    
    try {
      // استخدام الترقيم المركب للخطاب
      const result = await loadNextNumber(templateId);
      
      if (!result) return;
      
      await saveDraft({
        user_id: dbUser.id,
        template_id: templateId,
        content,
        status: 'draft',
        number: result.number,
        year: currentYear,
        branch_code: result.branchCode, // إضافة رمز الفرع
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending',
        letter_reference: result.reference // إضافة مرجع الخطاب المركب
      })
      
      console.log('تم الحفظ التلقائي للمسودة')
    } catch (error) {
      console.error('Error auto-saving draft:', error)
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setIsLoading(true)
    const verificationUrl = crypto.randomUUID()

    try {
      if (!dbUser?.id || !templateId) {
        throw new Error('يجب تسجيل الدخول واختيار قالب')
      }

      if (!content.subject || !content.to) {
        throw new Error('يجب إدخال موضوع الخطاب والجهة المرسل إليها')
      }

      if (!content.body) {
        throw new Error('يجب إدخال محتوى الخطاب')
      }

      // الحصول على معلومات الترقيم
      const result = await loadNextNumber(templateId);
      
      if (!result) {
        throw new Error('فشل في الحصول على رقم الخطاب التالي');
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
          verification_url: verificationUrl,
          reference: result.reference // إضافة المرجع المركب للخطاب
        },
        status: 'completed',
        number: result.number,
        year: currentYear,
        branch_code: result.branchCode, // إضافة رمز الفرع
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending',
        verification_url: verificationUrl,
        letter_reference: result.reference // إضافة مرجع الخطاب المركب
      })

      await createLetter(draft)
      
      // إظهار رسالة النجاح
      toast({
        title: 'تم الحفظ',
        description: `تم حفظ الخطاب ${result.reference} بنجاح`,
        type: 'success'
      })
      
      setIsSaved(true)
      setTimeout(() => navigate('/admin/letters'), 2000)
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء إنشاء الخطاب'
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleDateClick() {
    setShowDatePicker(true)
  }

  function handleDateSelect(day: number, month: number, year: number) {
    const date = moment()
      .iYear(year)
      .iMonth(month)
      .iDate(day)
      .format('iDD/iMM/iYYYY')
    setContent(prev => ({ ...prev, date }))
    setShowDatePicker(false)
    
    // إغلاق التقويم عند النقر خارجه
    document.addEventListener('click', () => setShowDatePicker(false), { once: true })
  }

  async function handlePrint() {
    if (!templateId || !content.body) return
    
    try {
      toast({
        title: 'جارِ الطباعة...',
        description: 'يتم تجهيز الخطاب للطباعة',
        type: 'info'
      })
      
      // الحصول على معلومات الترقيم
      const result = await loadNextNumber(templateId);
      
      if (!result) {
        throw new Error('فشل في الحصول على معلومات الترقيم');
      }
      
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
        content: {
          ...content,
          reference: result.reference // إضافة مرجع الخطاب
        },
        status: 'draft',
        number: result.number,
        year: currentYear,
        branch_code: result.branchCode, // إضافة رمز الفرع
        letter_reference: result.reference, // إضافة مرجع الخطاب
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        letter_templates: selectedTemplate
      }
      
      await printLetter(tempLetter)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الطباعة',
        type: 'error'
      })
    }
  }

  async function handleExportPDF() {
    if (!templateId || !content.body) return
    
    setIsExporting(true)
    try {
      toast({
        title: 'جارِ التصدير...',
        description: 'يتم تصدير الخطاب كملف PDF',
        type: 'info'
      })
      
      // الحصول على معلومات الترقيم
      const result = await loadNextNumber(templateId);
      
      if (!result) {
        throw new Error('فشل في الحصول على معلومات الترقيم');
      }
      
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
        content: {
          ...content,
          reference: result.reference // إضافة مرجع الخطاب
        },
        status: 'draft',
        number: result.number,
        year: currentYear,
        branch_code: result.branchCode, // إضافة رمز الفرع
        letter_reference: result.reference, // إضافة مرجع الخطاب
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        letter_templates: selectedTemplate
      }
      
      await exportLetterToPDF(tempLetter)
      
      toast({
        title: 'تم التصدير',
        description: 'تم تصدير الخطاب بنجاح',
        type: 'success'
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تصدير الملف',
        type: 'error'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // نسخ رابط رمز QR
  function copyVerificationUrl() {
    if (!content.verification_url) return
    
    const url = `${window.location.origin}/verify/${content.verification_url}`
    navigator.clipboard.writeText(url)
      .then(() => {
        toast({
          title: 'تم النسخ',
          description: 'تم نسخ رابط التحقق بنجاح',
          type: 'success'
        })
      })
      .catch(() => {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء نسخ الرابط',
          type: 'error'
        })
      })
  }

  function toggleEditorStyle() {
    setEditorStyle(prev => prev === 'inside' ? 'outside' : 'inside')
  }

  // وظيفة لتغيير حجم المعاينة
  function togglePreviewScale() {
    setPreviewScale(prev => prev === 'fit' ? 'actual' : 'fit')
  }
  
  // وظيفة لتكبير منطقة المعاينة
  const zoomPreview = () => {
    if (letterPreviewRef.current) {
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4'
      
      const content = document.createElement('div')
      content.className = 'bg-white rounded-lg max-h-[90vh] overflow-auto relative'
      
      // زر الإغلاق
      const closeBtn = document.createElement('button')
      closeBtn.className = 'absolute top-2 right-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 z-10'
      closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      closeBtn.onclick = () => document.body.removeChild(modal)
      
      // نسخة من المعاينة
      const preview = letterPreviewRef.current.cloneNode(true) as HTMLDivElement
      preview.style.transform = 'scale(1)'
      preview.style.transformOrigin = 'top center'
      preview.style.overflow = 'hidden'
      
      content.appendChild(closeBtn)
      content.appendChild(preview)
      modal.appendChild(content)
      
      // أزرار التصدير والطباعة
      const actions = document.createElement('div')
      actions.className = 'flex items-center justify-center gap-4 p-4 bg-white border-t sticky bottom-0'
      
      const printBtn = document.createElement('button')
      printBtn.className = 'flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-800'
      printBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>طباعة'
      printBtn.onclick = handlePrint
      
      const exportBtn = document.createElement('button')
      exportBtn.className = 'flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90'
      exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>تصدير PDF'
      exportBtn.onclick = handleExportPDF
      
      actions.appendChild(printBtn)
      actions.appendChild(exportBtn)
      content.appendChild(actions)
      
      document.body.appendChild(modal)
    }
  }

  // وظيفة للتعامل مع النماذج النصية
  function handleInsertTemplate(templateContent: string) {
    // إذا لم يكن هناك محتوى سابق، نضع النموذج مباشرة
    if (!content.body) {
      setContent(prev => ({ ...prev, body: templateContent }));
    } else {
      // إذا كان هناك محتوى، نضيف النموذج إليه
      setContent(prev => ({ ...prev, body: prev.body + '\n\n' + templateContent }));
    }
  }

  // دالة للتبديل بين إظهار/إخفاء رمز QR في المحرر
  function toggleQRVisibility() {
    setShowQRInEditor(!showQRInEditor);
  }

  // معالجة تغيير ارتفاع السطر
  const handleLineHeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseFloat(e.target.value);
    setEditorConfig({...editorConfig, lineHeight: value});
  };

  const today = moment()
  const currentHijriYear = today.iYear()
  const currentHijriMonth = today.iMonth()
  const currentHijriDay = today.iDate()
  const daysInMonth = today.iDaysInMonth()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showTemplateSelector && (
        <TextTemplateSelector
          onSelectTemplate={handleInsertTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    
      {isSaved && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full flex flex-col items-center animate-fade-in">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">تم حفظ الخطاب بنجاح</h2>
            <p className="text-gray-600 mb-6 text-center">
              تم حفظ الخطاب {letterReference || ''} بنجاح وإضافته إلى سجل الخطابات
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
                  setIsSaved(false)
                  navigate('new')
                  window.location.reload()
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

      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
        {/* خطوات إنشاء الخطاب */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {[
              { icon: Settings, title: 'البيانات الأساسية', description: 'إدخال الموضوع والجهة' },
              { icon: FileText, title: 'اختيار القالب', description: 'اختيار قالب الخطاب المناسب' },
              { icon: FileText, title: 'محتوى الخطاب', description: 'كتابة محتوى الخطاب وتنسيقه' },
              { icon: Eye, title: 'المعاينة والحفظ', description: 'معاينة الخطاب قبل الحفظ' }
            ].map((s, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-y-2 z-10 cursor-pointer ${
                  activeStep === i + 1 ? 'text-primary' : 'text-gray-400'
                }`}
                onClick={() => {
                  // التحقق من إكمال الخطوات السابقة
                  if (i === 0 || (i === 1 && content.subject && content.to) || 
                      (i === 2 && templateId) || (i === 3 && content.body)) {
                    setActiveStep(i + 1)
                  } else {
                    toast({
                      title: 'يجب إكمال الخطوات السابقة',
                      description: 'الرجاء إكمال الخطوات السابقة قبل المتابعة',
                      type: 'warning'
                    })
                  }
                }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeStep === i + 1 ? 'bg-primary text-white' : 'bg-gray-100'
                }`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-sm font-medium whitespace-nowrap">{s.title}</span>
                  <span className="text-xs text-gray-500 hidden md:block">{s.description}</span>
                </div>
              </div>
            ))}
            <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-200 -z-10">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((activeStep - 1) / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* محتوى الخطوة */}
        {activeStep === 1 && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">البيانات الأساسية للخطاب</h3>
            <div>
              <label className="block text-sm font-medium mb-2">موضوع الخطاب <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={content.subject ?? ''}
                onChange={(e) => setContent(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="أدخل موضوع الخطاب (للأرشفة والبحث)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">صادر إلى <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={content.to ?? ''}
                onChange={(e) => setContent(prev => ({ ...prev, to: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="أدخل الجهة المرسل إليها (للأرشفة والبحث)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">التصنيف (اختياري)</label>
              <select
                value={content.category ?? ''}
                onChange={(e) => setContent(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="">بدون تصنيف</option>
                <option value="رسمي">خطاب رسمي</option>
                <option value="داخلي">خطاب داخلي</option>
                <option value="تعميم">تعميم</option>
                <option value="قرار إداري">قرار إداري</option>
                <option value="مذكرة داخلية">مذكرة داخلية</option>
                <option value="خطاب تعريف">خطاب تعريف</option>
                <option value="دعوة">دعوة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
              <textarea
                value={content.notes ?? ''}
                onChange={(e) => setContent(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all h-24 resize-none"
                placeholder="أدخل أي ملاحظات إضافية عن الخطاب (للأرشفة الداخلية فقط)"
              />
            </div>
            <div className="pt-4 flex justify-between">
              <div>
                <label className="flex items-center gap-x-2">
                  <input 
                    type="checkbox"
                    checked={autosaveEnabled}
                    onChange={(e) => setAutosaveEnabled(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span className="text-sm">حفظ تلقائي للمسودة</span>
                </label>
              </div>
              <button
                onClick={() => {
                  if (content.subject && content.to) {
                    setActiveStep(2)
                  } else {
                    toast({
                      title: 'حقول مطلوبة',
                      description: 'يجب إدخال موضوع الخطاب والجهة المرسل إليها',
                      type: 'error'
                    })
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                التالي
              </button>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">اختر القالب المناسب</h3>
            
            {/* Add template error message and retry button */}
            {templateLoadError && (
              <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-red-800">تعذر تحميل القوالب</h3>
                    <div className="mt-1 text-sm text-red-700">
                      <p>تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.</p>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={loadTemplates}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        إعادة المحاولة
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {loadingTemplates ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">جاري تحميل القوالب...</p>
              </div>
            ) : (
              <TemplateSelector
                templates={templates}
                selectedId={templateId}
                onSelect={(id) => {
                  setTemplateId(id)
                  setActiveStep(3)
                }}
              />
            )}
            
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                السابق
              </button>
              
              <button
                onClick={() => {
                  if (templateId) {
                    setActiveStep(3)
                  } else {
                    toast({
                      title: 'اختيار القالب',
                      description: 'يجب اختيار قالب قبل المتابعة',
                      type: 'warning'
                    })
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                disabled={!templateId}
              >
                التالي
              </button>
            </div>
          </div>
        )}
        
        {selectedTemplate && activeStep >= 3 && (
          <div className="space-y-6">
            {/* شريط التحكم العلوي */}
            <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleEditorStyle}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${
                    editorStyle === 'inside' ? 'bg-primary text-white' : 'bg-gray-200'
                  }`}
                  title={editorStyle === 'inside' ? 'تبديل إلى المحرر الخارجي' : 'تبديل إلى المحرر الداخلي'}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  {editorStyle === 'inside' ? 'محرر داخلي' : 'محرر خارجي'}
                </button>
                
                <button
                  onClick={() => setLivePreview(!livePreview)}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${
                    livePreview ? 'bg-green-600 text-white' : 'bg-gray-200'
                  }`}
                  title={livePreview ? 'إيقاف المعاينة التلقائية' : 'تشغيل المعاينة التلقائية'}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {livePreview ? 'معاينة تلقائية' : 'معاينة يدوية'}
                </button>
                
                <button
                  onClick={() => setShowEditorControls(!showEditorControls)}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${
                    showEditorControls ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                  title={showEditorControls ? 'إخفاء أدوات التحرير' : 'إظهار أدوات التحرير'}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {showEditorControls ? 'إخفاء الأدوات' : 'إظهار الأدوات'}
                </button>
                
                {/* زر تبديل نوع المحرر */}
                <EditorSelector
                  currentEditor={editorType}
                  onSelectEditor={setEditorType}
                />
                
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 bg-purple-600 text-white"
                  title="إضافة نص جاهز"
                >
                  <FileTemplate className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">إضافة نص جاهز</span>
                </button>
                
                {previewMode && (
                  <button
                    onClick={togglePreviewScale}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 bg-gray-200`}
                  >
                    {previewScale === 'fit' ? 'الحجم الطبيعي' : 'احتواء الصفحة'}
                  </button>
                )}

                <button
                  onClick={() => handleAutosave()}
                  className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 bg-gray-200"
                  title="حفظ مؤقت"
                >
                  <History className="h-3.5 w-3.5" />
                  حفظ مؤقت
                </button>
                
                <button
                  onClick={toggleQRVisibility}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${
                    showQRInEditor ? 'bg-orange-500 text-white' : 'bg-gray-200'
                  }`}
                  title={showQRInEditor ? 'إخفاء رمز QR' : 'إظهار رمز QR'}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">رمز QR</span>
                </button>
              </div>
              
              <div className="flex items-center gap-1 mr-auto">
                {/* عرض مرجع الخطاب المركب */}
                {branchCode && (
                  <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-lg text-sm font-mono mr-2">
                    {branchCode}-{nextNumber}/{currentYear}
                  </div>
                )}
                
                <span className="text-xs text-gray-500">حجم الخط:</span>
                <select
                  value={editorConfig.fontSize}
                  onChange={(e) => setEditorConfig({...editorConfig, fontSize: e.target.value})}
                  className="text-xs p-1.5 border rounded"
                >
                  {['14px', '15px', '16px', '17px', '18px'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                
                <span className="text-xs text-gray-500 mr-2">ارتفاع السطر:</span>
                <select
                  value={editorConfig.lineHeight}
                  onChange={handleLineHeightChange}
                  className="text-xs p-1.5 border rounded"
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="1.5">1.5</option>
                  <option value="1.8">1.8</option>
                  <option value="2">2</option>
                  <option value="2.2">2.2</option>
                </select>
              </div>
            </div>

            <div className={`flex ${previewMode ? 'flex-col' : 'lg:flex-row'} gap-6`}>
              {/* محرر النصوص - دائمًا مرئي إذا كان الأسلوب "خارجي" أو في وضع التحرير */}
              <div className={`relative ${previewMode ? 'hidden' : editorStyle === 'inside' ? 'hidden' : 'flex-1'}`}>
                <div className="sticky top-4">
                  <h3 className="text-lg font-semibold mb-4">محرر النصوص</h3>
                  <div className="bg-white rounded-lg border shadow-sm">
                    {showEditorControls && <RichTextEditor
                      value={content.body ?? ''}
                      onChange={(value) => setContent(prev => ({ ...prev, body: value }))}
                      style={{
                        fontSize: editorConfig.fontSize,
                        lineHeight: String(editorConfig.lineHeight)
                      }}
                      onShowTemplateSelector={() => setShowTemplateSelector(true)}
                      editorType={editorType}
                    />}
                  </div>
                  
                  {/* أزرار النماذج النصية */}
                  <div className="mt-4">
                    <button 
                      onClick={() => setShowTemplateSelector(true)}
                      className="w-full px-4 py-2 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                    >
                      <ListPlus className="h-4 w-4 text-primary" />
                      <span>إضافة نموذج نصي جاهز</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* معاينة القالب */}
              <div className={`${previewMode ? 'w-full' : editorStyle === 'inside' ? 'w-full' : 'flex-1'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">معاينة الخطاب</h3>
                  <button
                    onClick={zoomPreview}
                    className="text-gray-600 hover:text-gray-900 p-1"
                    title="تكبير المعاينة"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                  </button>
                </div>
                
                <div className={`
                  relative mx-auto overflow-hidden bg-white rounded-lg shadow
                  ${previewScale === 'fit' && previewMode ? 'max-w-full h-auto' : ''}
                `}>
                  <div
                    ref={letterPreviewRef}
                    className={`w-[595px] h-[842px] bg-white ${previewScale === 'fit' && previewMode ? 'scale-[0.7] sm:scale-[0.85] md:scale-[1]' : ''} mx-auto transition-transform origin-top`}
                    style={{
                      backgroundImage: selectedTemplate ? `url(${selectedTemplate.image_url})` : 'none',
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      direction: 'rtl'
                    }}
                  >
                    <div className="absolute inset-0">
                      {showGuides && (
                        <>
                          <div className="absolute top-[25px] left-[85px] w-10 h-8 border-2 border-yellow-500 rounded pointer-events-none" />
                          <div className="absolute top-[60px] left-[40px] w-32 h-8 border-2 border-yellow-500 rounded pointer-events-none" />
                          <div className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] border-2 border-yellow-500 rounded pointer-events-none" />
                        </>
                      )}
                      
                      {/* مرجع الخطاب المركب */}
                      <div className="absolute top-[5px] right-[35px] text-sm font-semibold text-blue-600">
                        {letterReference || (branchCode ? `${branchCode}-${nextNumber || '?'}/${currentYear}` : '')}
                      </div>
                      
                      {/* رقم الخطاب */}
                      <input
                        type="text"
                        value={content.number ?? nextNumber ?? ''}
                        readOnly
                        className="absolute top-[25px] left-[85px] w-10 p-1 text-sm font-semibold bg-transparent text-center focus:outline-none"
                      />
                      
                      {/* تاريخ الخطاب */}
                      <input
                        type="text"
                        value={content.date ?? ''}
                        onClick={handleDateClick}
                        readOnly={previewMode}
                        className="absolute top-[60px] left-[40px] w-32 p-1 text-sm font-semibold bg-transparent text-center cursor-pointer focus:outline-none"
                      />
                      
                      {/* منتقي التاريخ */}
                      {showDatePicker && !previewMode && (
                        <div className="absolute top-[90px] left-[120px] w-64 bg-white rounded-lg shadow-lg border p-2 z-10">
                          <div className="text-center mb-2 font-semibold">
                            {MONTHS_AR[currentHijriMonth]} {currentHijriYear}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleDateSelect(day, currentHijriMonth, currentHijriYear)}
                                className={`p-1 text-sm rounded hover:bg-gray-100 ${
                                  day === currentHijriDay ? 'bg-primary text-white hover:bg-primary/90' : ''
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* المحتوى - إما محرر WYSIWYG داخل القالب أو العرض فقط */}
                      {editorStyle === 'inside' && !previewMode ? (
                        <div className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] p-6">
                          <div className="w-full h-full">
                            {showEditorControls && <RichTextEditor
                              value={content.body ?? ''}
                              onChange={(value) => setContent(prev => ({ ...prev, body: value }))}
                              style={{
                                fontSize: editorConfig.fontSize,
                                lineHeight: String(editorConfig.lineHeight),
                                fontFamily: editorConfig.fontFamily,
                                height: '100%',
                                overflow: 'auto',
                              }}
                              inlineMode
                              onShowTemplateSelector={() => setShowTemplateSelector(true)}
                              editorType={editorType}
                              allowEditorSelection={false}
                            />}
                          </div>
                        </div>
                      ) : (
                        <div 
                          dangerouslySetInnerHTML={{ __html: content.body ? content.body : '' }}
                          className={`absolute top-[120px] right-[35px] left-[40px] bottom-[120px] p-6 text-sm bg-transparent ${
                            editorStyle === 'inside' && !previewMode ? 'border border-dashed border-gray-300' : ''
                          }`}
                          style={{
                            fontFamily: 'Cairo',
                            fontSize: editorConfig.fontSize,
                            lineHeight: editorConfig.lineHeight,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            textAlign: 'right',
                            direction: 'rtl'
                          }}
                        />
                      )}
                      
                      {/* رمز QR - عرضه فقط في وضع المعاينة أو إذا تم تفعيله يدوياً */}
                      {(previewMode || showQRInEditor) && (
                        <div className="absolute bottom-[40px] right-[40px] flex flex-col items-center gap-1">
                          {content.verification_url ? (
                            <>
                              <QRCode
                                value={`${window.location.origin}/verify/${content.verification_url}`}
                                size={80}
                                level="H"
                                includeMargin
                                className="bg-white p-1.5 rounded"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={copyVerificationUrl}
                                  className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                                  title="نسخ رابط التحقق"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                
                                <button
                                  onClick={() => window.open(`${window.location.origin}/verify/${content.verification_url}`, '_blank')}
                                  className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                                  title="فتح صفحة التحقق"
                                >
                                  <Share2 className="h-3 w-3" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="w-[80px] h-[80px] border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50 text-xs text-gray-500 text-center p-2">
                              سيظهر رمز QR بعد حفظ الخطاب
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* أزرار التنقل وإضافة النماذج النصية */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 text-sm border rounded-lg"
                >
                  السابق
                </button>
                
                {/* زر إضافة نموذج نصي */}
                {activeStep === 3 && (
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="px-4 py-2 text-sm border border-primary text-primary rounded-lg flex items-center gap-x-2"
                  >
                    <FileTemplate className="h-4 w-4" />
                    إضافة نص جاهز
                  </button>
                )}
              </div>
              
              {activeStep === 3 ? (
                <button
                  onClick={() => {
                    if (content.body) {
                      setActiveStep(4)
                    } else {
                      toast({
                        title: 'محتوى الخطاب مطلوب',
                        description: 'يجب كتابة محتوى الخطاب قبل المتابعة',
                        type: 'warning'
                      })
                    }
                  }}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg"
                >
                  التالي (المعاينة النهائية)
                </button>
              ) : activeStep === 4 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg flex items-center gap-x-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? 'جارٍ الحفظ...' : 'حفظ الخطاب'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if ((activeStep === 1 && content.subject && content.to) || 
                        (activeStep === 2 && templateId)) {
                      setActiveStep(prev => Math.min(4, prev + 1))
                    } else {
                      toast({
                        title: 'بيانات مطلوبة',
                        description: activeStep === 1 
                          ? 'يجب إدخال موضوع الخطاب والجهة المرسل إليها' 
                          : 'يجب اختيار قالب للخطاب',
                        type: 'warning'
                      })
                    }
                  }}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg"
                >
                  التالي
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}