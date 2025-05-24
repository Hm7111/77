import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowRight, Printer, Download, Share2, Copy, Eye, EyeOff, FileText, CheckCircle, History, AlertCircle, RefreshCw,
  FileCheck, Calendar, User, Building, Settings
} from 'lucide-react';
import QRCode from 'qrcode.react';
import moment from 'moment-hijri';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { Letter } from '../../types/database';
import { ExportOptionsDialog } from './ExportOptionsDialog';
import { exportToPDF } from '../../lib/pdf-export';
import { WorkflowStatus } from '../workflow/WorkflowStatus';
import { WorkflowTimeline } from '../workflow/WorkflowTimeline';
import { ApprovalRequestModal } from '../workflow/ApprovalRequestModal';

export function ViewableLetterEditor() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const letterPreviewRef = useRef<HTMLDivElement>(null);

  const [letter, setLetter] = useState<Letter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [scale, setScale] = useState(1);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [lineHeight, setLineHeight] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showGuides, setShowGuides] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // Check if we're coming from an approval context
  const [isFromApproval, setIsFromApproval] = useState(false);
  const [approvalRequestId, setApprovalRequestId] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const fromApproval = queryParams.get('fromApproval');
    const requestId = queryParams.get('requestId');
    
    if (fromApproval === 'true' && requestId) {
      setIsFromApproval(true);
      setApprovalRequestId(requestId);
      console.log('Viewing from approval context, request ID:', requestId);
    }
    
    loadLetter();
  }, [id, location.search, retryCount]);

  useEffect(() => {
    if (letter?.signature_id) {
      loadSignature(letter.signature_id);
    }
  }, [letter?.signature_id]);

  async function loadSignature(signatureId: string) {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('signature_url')
        .eq('id', signatureId)
        .single();
        
      if (error) {
        console.error('Error loading signature:', error);
        return;
      }
      
      if (data) {
        setSignatureUrl(data.signature_url);
      }
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }

  async function loadLetter() {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading letter with ID:', id);
      
      let letterData;
      
      // If we're viewing from an approval context, use the special RPC function
      if (isFromApproval && approvalRequestId) {
        console.log('Loading letter via approval request:', approvalRequestId);
        
        // First, get the letter ID associated with this request
        const { data: requestData, error: requestError } = await supabase.rpc(
          'get_letter_by_request_id',
          { p_request_id: approvalRequestId }
        );
        
        if (requestError) {
          console.error('Error fetching letter by request ID:', requestError);
          throw new Error('فشل في الحصول على معلومات الخطاب من طلب الموافقة');
        }
        
        if (!requestData || requestData.length === 0) {
          throw new Error('لم يتم العثور على الخطاب المرتبط بطلب الموافقة');
        }
        
        console.log('Letter data from request:', requestData);
        
        // Now load the full letter details
        const { data: letterDetailData, error: detailError } = await supabase.rpc(
          'get_letter_details_for_approval',
          { p_letter_id: requestData[0].letter_id }
        );
        
        if (detailError) {
          console.error('Error fetching letter details:', detailError);
          throw detailError;
        }
        
        if (!letterDetailData || letterDetailData.length === 0) {
          throw new Error('فشل في تحميل تفاصيل الخطاب');
        }
        
        letterData = letterDetailData[0];
        
        // Convert to full letter object structure
        const fullLetter: Letter = {
          id: letterData.id,
          user_id: '',  // Will be filled by regular fetch
          template_id: letterData.template_id,
          content: letterData.content,
          status: 'completed',
          number: letterData.number,
          year: letterData.year,
          branch_code: letterData.branch_code, // إضافة رمز الفرع
          letter_reference: letterData.letter_reference, // إضافة مرجع الخطاب
          created_at: new Date().toISOString(), // Will be updated
          updated_at: new Date().toISOString(),
          letter_templates: {
            id: letterData.template_id,
            name: letterData.template_name,
            image_url: letterData.template_image_url,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            description: '',
            variables: [],
            zones: []
          }
        };
        
        setLetter(fullLetter);
        
      } else {
        // Standard letter loading
        console.log('Loading letter through standard method');
        const { data, error } = await supabase
          .from('letters')
          .select('*, letter_templates(*)')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching letter:', error);
          throw error;
        }
        
        letterData = data;
        setLetter(data);
      }
      
      console.log('Letter loaded successfully:', letterData);
      
    } catch (error) {
      console.error('Error loading letter:', error);
      setLoadError(error instanceof Error ? error.message : 'لم نتمكن من تحميل الخطاب');
      
      toast({
        title: 'خطأ',
        description: 'لم نتمكن من تحميل الخطاب',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Retry loading letter
  function retryLoadLetter() {
    setRetryCount(prev => prev + 1);
  }

  // معالجة خيارات التصدير
  async function handleExportOptionsConfirm(options: {withTemplate: boolean, action: 'print' | 'export'}) {
    setShowExportOptions(false);
    
    if (!letter) return;
    
    try {
      setIsExporting(true);
      if (options.action === 'print') {
        // طباعة الخطاب
        setShowPrintPreview(true);
        setTimeout(() => {
          window.print();
          setShowPrintPreview(false);
        }, 500);
      } else {
        // تصدير PDF
        toast({
          title: 'جارِ التصدير بجودة عالية...',
          description: 'يتم إنشاء PDF بجودة طباعة متميزة',
          type: 'info'
        });
        
        // استخدام خاصية التقاط المكون مباشرة
        if (letterPreviewRef.current) {
          await exportToPDF(letter, {
            filename: `${letter.letter_reference || `خطاب-${letter.number}-${letter.year}`}.pdf`,
            showProgress: (progress) => {
              // يمكن إضافة شريط تقدم هنا
            },
            withTemplate: options.withTemplate,
            scale: 4.0, // دقة عالية جداً
            quality: 0.99 // أعلى جودة
          });
        }
        
        toast({
          title: 'تم التصدير',
          description: 'تم تصدير الخطاب بنجاح وبجودة عالية',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء عملية التصدير',
        type: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  }

  // نسخ رابط التحقق
  function copyVerificationUrl() {
    if (!letter?.verification_url) return;
    
    const url = `${window.location.origin}/verify/${letter.verification_url}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast({
          title: 'تم النسخ',
          description: 'تم نسخ رابط التحقق بنجاح',
          type: 'success'
        });
      })
      .catch(() => {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء نسخ الرابط',
          type: 'error'
        });
      });
  }

  // مشاركة الخطاب
  function handleShare() {
    if (!letter?.verification_url) {
      toast({
        title: 'غير متاح',
        description: 'لا يوجد رابط مشاركة لهذا الخطاب',
        type: 'warning'
      });
      return;
    }
    
    const url = `${window.location.origin}/verify/${letter.verification_url}`;
    
    if (navigator.share) {
      navigator.share({
        title: `خطاب ${letter.letter_reference || `${letter.number}/${letter.year}`}`,
        text: `مشاركة رابط التحقق من الخطاب رقم ${letter.letter_reference || `${letter.number}/${letter.year}`}`,
        url
      }).catch(err => {
        console.error('Error sharing:', err);
        copyToClipboard(url);
      });
    } else {
      copyToClipboard(url);
    }
  }
  
  // نسخ الرابط إلى الحافظة
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: 'تم النسخ',
          description: 'تم نسخ رابط التحقق إلى الحافظة',
          type: 'success'
        });
      })
      .catch(() => {
        toast({
          title: 'خطأ',
          description: 'لم نتمكن من نسخ الرابط',
          type: 'error'
        });
        
        // طريقة بديلة للنسخ
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
  }

  // تبديل حجم العرض
  const toggleScale = () => {
    setScale(prev => prev === 1 ? 0.8 : 1);
  };
  
  // ضبط ارتفاع السطر
  const handleLineHeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLineHeight(parseFloat(e.target.value));
  };

  // عرض نافذة خيارات التصدير
  const handleExportClick = () => {
    setShowExportOptions(true);
  };

  // التبديل بين عرض تفاصيل سير العمل
  const toggleWorkflowDetails = () => {
    setShowWorkflowDetails(!showWorkflowDetails);
  };

  // فتح نافذة طلب الموافقة
  const handleRequestApproval = () => {
    setShowApprovalModal(true);
  };
  
  // العودة للقائمة السابقة إذا كنا جئنا من شاشة الموافقات
  const handleGoBack = () => {
    if (isFromApproval) {
      navigate('/admin/approvals');
    } else {
      navigate('/admin/letters');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-x-2">
            <button
              onClick={handleGoBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">عرض الخطاب</h1>
          </div>
        </div>
        
        <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center flex flex-col items-center">
          <AlertCircle className="h-16 w-16 mb-4" />
          <p className="text-xl font-bold mb-2">لا يمكن العثور على الخطاب</p>
          <p className="mb-4">{loadError}</p>
          <div className="flex gap-4 mt-2">
            <button
              onClick={retryLoadLetter}
              className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
            
            <button
              onClick={handleGoBack}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
            >
              العودة للخلف
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-x-2">
            <button
              onClick={handleGoBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">عرض الخطاب</h1>
          </div>
        </div>
        
        <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center">
          <p className="text-xl font-bold mb-2">لا يمكن العثور على الخطاب</p>
          <p>الخطاب غير موجود أو ليس لديك صلاحية الوصول إليه</p>
        </div>
      </div>
    );
  }

  // Get template data from template_snapshot if available, otherwise from letter_templates
  const templateData = letter.template_snapshot || letter.letter_templates;
  
  // Get custom element positions from template letter_elements if available
  const letterElements = templateData?.letter_elements || {
    letterNumber: { x: 85, y: 25, width: 32, alignment: 'right', enabled: true },
    letterDate: { x: 40, y: 60, width: 120, alignment: 'center', enabled: true },
    signature: { x: 40, y: 700, width: 150, height: 80, alignment: 'center', enabled: true }
  };
  
  // Get QR position from template or default
  const qrPosition = templateData?.qr_position || {
    x: 40,
    y: 760, 
    size: 80,
    alignment: 'right'
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* نافذة طلب الموافقة */}
      {showApprovalModal && (
        <ApprovalRequestModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          letter={letter}
          onSuccess={() => {
            // إعادة تحميل الخطاب بعد إرسال طلب الموافقة
            loadLetter();
          }}
        />
      )}

      {/* نافذة خيارات التصدير */}
      <ExportOptionsDialog 
        isOpen={showExportOptions}
        letter={letter}
        onClose={() => setShowExportOptions(false)}
        onConfirm={handleExportOptionsConfirm}
        defaultAction="export"
      />
      
      {/* وضع الطباعة */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-white z-[9999] p-4 print:p-0">
          <div className="mb-4 print:hidden flex justify-between">
            <h2 className="text-xl font-bold">معاينة للطباعة</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="px-3 py-1 bg-primary text-white rounded"
              >
                <Printer className="h-4 w-4 inline mr-1" />
                طباعة
              </button>
              <button 
                onClick={() => setShowPrintPreview(false)}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded"
              >
                إلغاء
              </button>
            </div>
          </div>
          
          <div className="flex justify-center print:m-0">
            <div 
              className="w-[595px] h-[842px] bg-white relative print:scale-100"
              style={{
                backgroundImage: templateData?.image_url ? `url(${templateData.image_url})` : 'none',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                direction: 'rtl'
              }}
            >
              <div className="absolute inset-0">
                {/* مرجع الخطاب المركب - استخدام مواضع العناصر المخصصة */}
                {letterElements.letterNumber.enabled && (
                  <div 
                    className="absolute"
                    style={{
                      top: `${letterElements.letterNumber.y}px`,
                      left: `${letterElements.letterNumber.x}px`,
                      width: `${letterElements.letterNumber.width}px`,
                      textAlign: letterElements.letterNumber.alignment as "left" | "right" | "center"
                    }}
                  >
                    <span className="font-medium text-sm">
                      {letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}
                    </span>
                  </div>
                )}
                
                {/* تاريخ الخطاب - استخدام مواضع العناصر المخصصة */}
                {letterElements.letterDate.enabled && (
                  <div 
                    className="absolute"
                    style={{
                      top: `${letterElements.letterDate.y}px`,
                      left: `${letterElements.letterDate.x}px`,
                      width: `${letterElements.letterDate.width}px`,
                      textAlign: letterElements.letterDate.alignment as "left" | "right" | "center"
                    }}
                  >
                    {letter.content.date}
                  </div>
                )}
                
                {/* محتوى الخطاب */}
                <div 
                  dangerouslySetInnerHTML={{ __html: letter.content.body || '' }}
                  className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] p-6 text-sm bg-transparent overflow-y-auto"
                  style={{
                    fontFamily: 'Cairo',
                    fontSize: '14px',
                    lineHeight: lineHeight.toString() || '1.5',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                />
                
                {/* التوقيع - إذا كان الخطاب معتمداً */}
                {letter.signature_id && letter.workflow_status === 'approved' && letterElements.signature.enabled && signatureUrl && (
                  <div 
                    className="absolute flex flex-col items-center"
                    style={{
                      top: letterElements.signature.y + 'px',
                      left: letterElements.signature.x + 'px',
                      width: letterElements.signature.width + 'px',
                      height: letterElements.signature.height + 'px',
                      textAlign: letterElements.signature.alignment as "left" | "right" | "center"
                    }}
                  >
                    <img
                      src={signatureUrl}
                      alt="توقيع المعتمد"
                      className="h-20 object-contain"
                    />
                    <span className="text-xs text-gray-800 mt-1 font-bold">توقيع المعتمد</span>
                  </div>
                )}
                
                {/* رمز QR - موضع مخصص */}
                {letter.verification_url && qrPosition && (
                  <div 
                    className="absolute flex flex-col items-center"
                    style={{
                      top: qrPosition.y + 'px',
                      left: qrPosition.x + 'px',
                      width: qrPosition.size + 'px',
                      height: qrPosition.size + 'px'
                    }}
                  >
                    <QRCode
                      value={`${window.location.origin}/verify/${letter.verification_url}`}
                      size={qrPosition.size || 80}
                      level="H"
                      includeMargin
                      className="bg-white p-1.5 rounded"
                    />
                    <span className="text-xs text-gray-500 mt-1">رمز التحقق</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-x-2">
          <button
            onClick={handleGoBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">معاينة الخطاب</h1>
          
          {/* عرض مرجع الخطاب المركب */}
          <div className="mr-2 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-lg text-sm font-mono">
            {letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}
          </div>
          
          {letter.workflow_status && (
            <WorkflowStatus 
              status={letter.workflow_status} 
              size="md" 
              className="mr-2" 
            />
          )}
          {isFromApproval && (
            <span className="mr-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
              من طلبات الموافقة
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleExportClick}
            className="flex items-center gap-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            disabled={isExporting}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isExporting ? 'جارٍ التصدير...' : 'تصدير PDF'}
            </span>
          </button>

          {letter.verification_url && (
            <button
              onClick={handleShare}
              className="flex items-center gap-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>
          )}
          {letter.verification_url && (
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/verify/${letter.verification_url}`)}
              className="flex items-center gap-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">نسخ الرابط</span>
            </button>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{showDetails ? 'إخفاء التفاصيل' : 'إظهار التفاصيل'}</span>
          </button>
          <button 
            onClick={toggleScale}
            className="flex items-center gap-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <span className="hidden sm:inline">{scale === 1 ? 'تصغير' : 'تكبير'}</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">ارتفاع السطر:</span>
            <select
              value={lineHeight}
              onChange={handleLineHeightChange}
              className="text-xs p-1.5 border rounded"
            >
              <option value="0">0</option>
              <option value="0.5">0.5</option>
              <option value="1">1</option>
              <option value="1.5">1.5</option>
              <option value="1.8">1.8</option>
              <option value="2.0">2.0</option>
              <option value="2.5">2.5</option>
            </select>
          </div>
        </div>
      </div>

      {/* حالة سير العمل */}
      <div className="mb-6">
        {letter.workflow_status && letter.workflow_status !== 'draft' ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                حالة سير العمل
              </h3>
              <div>
                <button
                  onClick={toggleWorkflowDetails}
                  className="text-primary text-sm hover:underline flex items-center gap-1"
                >
                  {showWorkflowDetails ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span>إخفاء التفاصيل</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>عرض التفاصيل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">الحالة الحالية:</span>
                <WorkflowStatus status={letter.workflow_status} size="md" />
              </div>
              
              {letter.workflow_status === 'draft' && (
                <button
                  onClick={handleRequestApproval}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm flex items-center gap-1.5 ml-auto"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>طلب موافقة</span>
                </button>
              )}
            </div>
            
            {showWorkflowDetails && (
              <div className="mt-4">
                <WorkflowTimeline letter={letter} />
              </div>
            )}
          </div>
        ) : (
          letter.workflow_status === 'draft' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  حالة سير العمل
                </h3>
                <WorkflowStatus status="draft" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 my-3">
                هذا الخطاب في مرحلة المسودة. يمكنك طلب الموافقة عليه من المسؤول المختص.
              </p>
              <button
                onClick={handleRequestApproval}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>طلب موافقة</span>
              </button>
            </div>
          )
        )}
      </div>

      {showDetails && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">تفاصيل الخطاب</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">مرجع الخطاب</p>
              <p className="font-mono">
                {letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">الفرع</p>
              <p className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-gray-500" />
                <span>{letter.branch_code || 'عام'}</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">تاريخ الإنشاء</p>
              <p>{new Date(letter.created_at).toLocaleDateString('ar')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">الحالة</p>
              <p>
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                  letter.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {letter.status === 'completed' ? 'مكتمل' : 'مسودة'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">منشئ الخطاب</p>
              <p>{letter.creator_name || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">الموضوع</p>
              <p>{letter.content.subject || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">مرسل إلى</p>
              <p>{letter.content.to || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">القالب</p>
              <p>{templateData?.name || 'غير محدد'}</p>
            </div>
            {letter.verification_url && (
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-500 mb-1">رابط التحقق</p>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 p-2 rounded text-xs font-mono flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {`${window.location.origin}/verify/${letter.verification_url}`}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/verify/${letter.verification_url}`)}
                    className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
        <div className="flex justify-center">
          <div 
            ref={letterPreviewRef}
            className="letter-preview w-[595px] h-[842px] mx-auto bg-white relative transform transition-transform duration-300"
            style={{
              backgroundImage: templateData?.image_url ? `url(${templateData.image_url})` : 'none',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              direction: 'rtl',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
              transform: `scale(${scale})`,
              transformOrigin: 'top center'
            }}
          >
            <div className="absolute inset-0">
              {showGuides && (
                <>
                  {letterElements.letterNumber.enabled && (
                    <div 
                      className="absolute border-2 border-yellow-500 rounded pointer-events-none" 
                      style={{
                        top: `${letterElements.letterNumber.y}px`,
                        left: `${letterElements.letterNumber.x}px`,
                        width: `${letterElements.letterNumber.width}px`,
                        height: '20px'
                      }}
                    />
                  )}
                  
                  {letterElements.letterDate.enabled && (
                    <div 
                      className="absolute border-2 border-green-500 rounded pointer-events-none" 
                      style={{
                        top: `${letterElements.letterDate.y}px`,
                        left: `${letterElements.letterDate.x}px`,
                        width: `${letterElements.letterDate.width}px`,
                        height: '20px'
                      }}
                    />
                  )}
                  
                  {letterElements.signature.enabled && (
                    <div 
                      className="absolute border-2 border-purple-500 rounded pointer-events-none" 
                      style={{
                        top: `${letterElements.signature.y}px`,
                        left: `${letterElements.signature.x}px`,
                        width: `${letterElements.signature.width}px`,
                        height: `${letterElements.signature.height}px`
                      }}
                    />
                  )}
                  
                  <div className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] border-2 border-yellow-500 rounded pointer-events-none" />
                </>
              )}
            
              {/* مرجع الخطاب المركب - استخدام الموضع المخصص */}
              {letterElements.letterNumber.enabled && (
                <div 
                  className="absolute"
                  style={{
                    top: `${letterElements.letterNumber.y}px`,
                    left: `${letterElements.letterNumber.x}px`,
                    width: `${letterElements.letterNumber.width}px`,
                    textAlign: letterElements.letterNumber.alignment as "left" | "right" | "center"
                  }}
                >
                  <span className="font-medium text-sm">
                    {letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}
                  </span>
                </div>
              )}
              
              {/* تاريخ الخطاب - استخدام الموضع المخصص */}
              {letterElements.letterDate.enabled && (
                <div 
                  className="absolute"
                  style={{
                    top: `${letterElements.letterDate.y}px`,
                    left: `${letterElements.letterDate.x}px`,
                    width: `${letterElements.letterDate.width}px`,
                    textAlign: letterElements.letterDate.alignment as "left" | "right" | "center"
                  }}
                >
                  {letter.content.date}
                </div>
              )}
              
              {/* محتوى الخطاب */}
              <div 
                dangerouslySetInnerHTML={{ __html: letter.content.body ? letter.content.body : '' }}
                className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] p-6 text-sm overflow-y-auto"
                style={{
                  fontFamily: 'Cairo',
                  fontSize: '14px',
                  lineHeight: lineHeight.toString() || '1.5',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'right',
                  direction: 'rtl'
                }}
              />
              
              {/* التوقيع - إذا كان الخطاب معتمداً */}
              {letter.signature_id && letter.workflow_status === 'approved' && letterElements.signature.enabled && signatureUrl && (
                <div 
                  className="absolute flex flex-col items-center"
                  style={{
                    top: letterElements.signature.y + 'px',
                    left: letterElements.signature.x + 'px',
                    width: letterElements.signature.width + 'px',
                    height: letterElements.signature.height + 'px',
                    textAlign: letterElements.signature.alignment as "left" | "right" | "center"
                  }}
                >
                  <img
                    src={signatureUrl}
                    alt="توقيع المعتمد"
                    className="h-20 object-contain"
                  />
                  <span className="text-xs text-gray-800 mt-1 font-bold">توقيع المعتمد</span>
                </div>
              )}
              
              {/* رمز QR - موضع مخصص */}
              {letter.verification_url && qrPosition && (
                <div 
                  className="absolute flex flex-col items-center"
                  style={{
                    top: qrPosition.y + 'px',
                    left: qrPosition.x + 'px',
                    width: qrPosition.size + 'px',
                    height: qrPosition.size + 'px'
                  }}
                >
                  <QRCode
                    value={`${window.location.origin}/verify/${letter.verification_url}`}
                    size={qrPosition.size || 80}
                    level="H"
                    includeMargin
                    className="bg-white p-1.5 rounded"
                  />
                  <span className="text-xs text-gray-500 mt-1">رمز التحقق</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* أزرار الإجراءات السريعة */}
      {letter.workflow_status === 'draft' && (
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            الإجراءات المتاحة
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRequestApproval}
              className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>طلب موافقة</span>
            </button>
            
            <button
              onClick={() => navigate(`/admin/letters/edit/${letter.id}`)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>تعديل الخطاب</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Component for ClipboardCheck icon
function ClipboardCheck(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
      <rect x="9" y="3" width="6" height="4" rx="2"></rect>
      <path d="m9 14 2 2 4-4"></path>
    </svg>
  );
}