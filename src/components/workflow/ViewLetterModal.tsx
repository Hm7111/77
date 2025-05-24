import { useState, useEffect, useRef } from 'react';
import { X, Eye, Download, FileText, RefreshCw, AlertCircle, Calendar, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { Letter } from '../../types/database';
import { exportToPDF } from '../../lib/pdf-export';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import moment from 'moment-hijri';

interface ViewLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letterId: string;
  requestId?: string; // Optional request ID if viewing from approval context
}

/**
 * نافذة لعرض الخطاب في واجهة الموافقة
 */
export function ViewLetterModal({ isOpen, onClose, letterId, requestId }: ViewLetterModalProps) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const letterRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const debugInfo = useRef<Record<string, any>>({});
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && letterId) {
      loadLetter();
    }
  }, [isOpen, letterId, requestId, retryCount]);

  useEffect(() => {
    if (letter?.signature_id) {
      loadSignature(letter.signature_id);
    }
  }, [letter?.signature_id]);

  async function loadSignature(signatureId: string) {
    try {
      // Remove .single() to handle cases where zero or multiple rows are returned
      const { data, error } = await supabase
        .from('signatures')
        .select('signature_url')
        .eq('id', signatureId);
        
      if (error) {
        console.error('Error loading signature:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // If we have data, use the first signature
        setSignatureUrl(data[0].signature_url);
        
        // Log a warning if multiple signatures were found
        if (data.length > 1) {
          console.warn('Multiple signatures found for ID:', signatureId, 'Using the first one.');
        }
      } else {
        console.log('No signature found for ID:', signatureId);
        setSignatureUrl(null); // Reset the signature URL if none found
      }
    } catch (error) {
      console.error('Error loading signature:', error);
      setSignatureUrl(null); // Reset on error
    }
  }

  async function loadLetter() {
    if (!letterId) return;
    
    setIsLoading(true);
    setError(null);
    debugInfo.current = { 
      letterId, 
      requestId,
      timestamp: new Date().toISOString(),
      retryCount
    };

    try {
      console.log('Loading letter:', letterId, 'from request:', requestId);
      
      let letterData: any;

      // If we have a request ID, use the special RPC function
      if (requestId) {
        console.log('Loading via request ID');
        
        // First get the letter ID associated with this request
        const { data: requestData, error: requestError } = await supabase.rpc(
          'get_letter_by_request_id',
          { p_request_id: requestId }
        );
        
        if (requestError) {
          console.error('Error fetching letter by request ID:', requestError);
          debugInfo.current.requestError = requestError;
          throw new Error(`فشل في الحصول على معلومات الخطاب من طلب الموافقة: ${requestError.message}`);
        }
        
        if (!requestData || requestData.length === 0) {
          debugInfo.current.requestData = requestData;
          throw new Error('لم يتم العثور على الخطاب المرتبط بطلب الموافقة');
        }
        
        console.log('Letter data from request:', requestData);
        debugInfo.current.requestData = requestData;
        
        // Now load the full letter details
        const { data: letterDetailData, error: detailError } = await supabase.rpc(
          'get_letter_details_for_approval',
          { p_letter_id: requestData[0].letter_id }
        );
        
        if (detailError) {
          console.error('Error fetching letter details:', detailError);
          debugInfo.current.detailError = detailError;
          throw detailError;
        }
        
        if (!letterDetailData || letterDetailData.length === 0) {
          debugInfo.current.letterDetailData = letterDetailData;
          throw new Error('فشل في تحميل تفاصيل الخطاب');
        }
        
        letterData = letterDetailData[0];
        
        // Convert to full letter object structure
        const fullLetter: Letter = {
          id: letterData.letter_id,
          user_id: requestData[0].user_id,
          template_id: letterData.template_id,
          content: letterData.content,
          status: 'completed',
          number: letterData.number,
          year: letterData.year,
          created_at: new Date().toISOString(), // Will be updated
          updated_at: new Date().toISOString(),
          signature_id: letterData.signature_id, // تضمين معرف التوقيع
          letter_templates: {
            id: letterData.template_id,
            name: letterData.template_name,
            image_url: letterData.template_image_url,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            description: '',
            variables: [],
            zones: [],
            // إضافة مواضع العناصر المخصصة إذا كانت متوفرة
            letter_elements: letterData.letter_elements || {
              letterNumber: { x: 85, y: 25, width: 32, alignment: 'right', enabled: true },
              letterDate: { x: 40, y: 60, width: 120, alignment: 'center', enabled: true },
              signature: { x: 40, y: 700, width: 150, height: 80, alignment: 'center', enabled: true }
            },
            // إضافة موضع QR إذا كان متوفر
            qr_position: letterData.qr_position || {
              x: 40,
              y: 760,
              size: 80,
              alignment: 'right'
            }
          }
        };
        
        setLetter(fullLetter);
        
      } else {
        // Standard letter loading
        console.log('Loading letter through standard method');
        const { data, error } = await supabase
          .from('letters')
          .select('*, letter_templates(*)')
          .eq('id', letterId)
          .single();

        if (error) {
          console.error('Error fetching letter:', error);
          debugInfo.current.letterError = error;
          throw error;
        }
        
        letterData = data;
        setLetter(data);
      }
      
      console.log('Letter loaded successfully:', letterData);
      debugInfo.current.letterData = letterData;
      
    } catch (error) {
      console.error('Error loading letter:', error);
      debugInfo.current.error = error;
      setError(error instanceof Error ? error.message : 'لم نتمكن من تحميل الخطاب');
      
      toast({
        title: 'خطأ',
        description: 'لم نتمكن من تحميل الخطاب',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // إعادة تحميل الخطاب
  const handleRetryLoadLetter = () => {
    setRetryCount(prev => prev + 1);
  };

  async function handleExport() {
    if (!letter) return;
    
    setIsExporting(true);
    try {
      await exportToPDF(letter, {
        scale: 3.0,
        filename: `خطاب-${letter.number || 0}-${letter.year || new Date().getFullYear()}.pdf`,
      });
      
      toast({
        title: 'تم التصدير',
        description: 'تم تصدير الخطاب بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تصدير الملف',
        type: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  }

  function openInNewWindow() {
    if (!letter) return;
    
    // Open in new window with the letter ID and request ID (if available)
    const url = requestId 
      ? `/admin/letters/view/${letter.id}?fromApproval=true&requestId=${requestId}`
      : `/admin/letters/view/${letter.id}`;
      
    window.open(url, '_blank');
  }

  if (!isOpen) return null;

  // Get template data from template_snapshot if available
  const templateData = letter?.template_snapshot || letter?.letter_templates;

  // Get custom element positions from template if available
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center overflow-auto p-4 backdrop-blur-sm" onClick={onClose}>
      <ErrorBoundary>
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isLoading ? 'جاري تحميل الخطاب...' : letter ? `معاينة الخطاب ${letter.number}/${letter.year}` : 'معاينة الخطاب'}
            </h3>
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-5">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">جاري تحميل الخطاب...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-lg text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                  <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">تعذر تحميل الخطاب</h3>
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <div className="flex justify-center gap-3">
                  <button 
                    onClick={handleRetryLoadLetter}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            ) : !letter ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <FileText className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">لم يتم العثور على الخطاب</h3>
                <p className="text-gray-600 dark:text-gray-400">الخطاب غير موجود أو تم حذفه</p>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الموضوع</p>
                      <p className="font-medium text-gray-900 dark:text-white">{letter.content.subject || 'غير محدد'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">مرسل إلى</p>
                      <p className="font-medium text-gray-900 dark:text-white">{letter.content.to || 'غير محدد'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">مرجع الخطاب</p>
                      <p className="font-medium text-gray-900 dark:text-white font-mono">{letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">التاريخ</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="font-medium text-gray-900 dark:text-white">
                          {letter.content.date || moment(letter.created_at).format('iYYYY/iM/iD')}
                        </p>
                      </div>
                    </div>
                    
                    {letter.creator_name && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المنشئ</p>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="font-medium text-gray-900 dark:text-white">{letter.creator_name}</p>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
                
                <div className="relative mx-auto w-[595px] h-[842px]" ref={letterRef} style={{
                  backgroundImage: templateData?.image_url ? `url(${templateData.image_url})` : 'none',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                  direction: 'rtl'
                }}>
                  <div className="absolute inset-0">
                    {/* مرجع الخطاب المركب - استخدام الموضع المخصص من letterElements */}
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
                      dangerouslySetInnerHTML={{ __html: letter.content.body || '' }}
                      className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] p-6 text-sm bg-transparent overflow-y-auto"
                      style={{
                        fontFamily: 'Cairo',
                        fontSize: '14px',
                        lineHeight: '1.5',
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
                        <div style={{fontSize: "10px", color: "#666", marginTop: "4px", fontWeight: "bold"}}>توقيع المعتمد</div>
                      </div>
                    )}
                    
                    {/* رمز QR */}
                    {letter.verification_url && (
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
                          size={qrPosition.size}
                          level="H"
                          includeMargin
                          className="bg-white p-1.5 rounded"
                        />
                        <div style={{fontSize: "10px", color: "#666", marginTop: "4px"}}>رمز التحقق</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t dark:border-gray-800 flex justify-between">
            <div className="flex gap-2">
              <button
                onClick={openInNewWindow}
                className="px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                disabled={!letter}
              >
                <Eye className="h-4 w-4" />
                فتح في نافذة جديدة
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
                disabled={!letter || isExporting}
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}

// QRCode component
function QRCode(props: {
  value: string;
  size: number;
  level: string;
  includeMargin: boolean;
  className: string;
}) {
  return (
    <div className={props.className} style={{ width: props.size, height: props.size }}>
      <img 
        src={`https://api.qrserver.com/v1/create-qr-code/?size=${props.size}x${props.size}&data=${encodeURIComponent(props.value)}`} 
        alt="QR Code"
        className="w-full h-full object-contain"
      />
    </div>
  );
}