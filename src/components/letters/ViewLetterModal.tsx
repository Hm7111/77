import { useState, useEffect, useRef } from 'react';
import { X, Eye, Download, FileText, RefreshCw, AlertCircle, Calendar, User, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { Letter } from '../../types/database';
import { exportToPDF } from '../../lib/pdf-export';

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

  useEffect(() => {
    if (isOpen && letterId) {
      loadLetter();
    }
  }, [isOpen, letterId, requestId]);

  async function loadLetter() {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading letter:', letterId, 'from request:', requestId);
      
      let letterData;

      // If we have a request ID, use the special RPC function
      if (requestId) {
        console.log('Loading via request ID');
        
        // First get the letter ID associated with this request
        const { data: requestData, error: requestError } = await supabase.rpc(
          'get_letter_by_request_id_v2',
          { p_request_id: requestId }
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
          'get_letter_details_for_approval_v2',
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
          id: letterData.letter_id || letterData.id,
          user_id: '',  // Will be filled by regular fetch
          template_id: letterData.template_id,
          content: letterData.content,
          status: 'completed',
          number: letterData.number,
          year: letterData.year,
          created_at: new Date().toISOString(), // Will be updated
          updated_at: new Date().toISOString(),
          verification_url: letterData.verification_url,
          branch_code: letterData.branch_code,
          letter_reference: letterData.letter_reference,
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
          .eq('id', letterId)
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

  async function handleExport() {
    if (!letter) return;
    
    setIsExporting(true);
    try {
      await exportToPDF(letter, {
        scale: 3.0,
        filename: `${letter.letter_reference || `خطاب-${letter.number}-${letter.year}`}.pdf`,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-auto p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isLoading ? 'جاري تحميل الخطاب...' : letter ? `معاينة الخطاب ${letter.letter_reference || `${letter.number}/${letter.year}`}` : 'معاينة الخطاب'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg text-center">
              <div className="inline-block p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">تعذر تحميل الخطاب</h3>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={loadLetter}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          ) : !letter ? (
            <div className="text-center py-16">
              <p className="text-gray-600 dark:text-gray-400">لم يتم العثور على الخطاب</p>
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الموضوع</p>
                    <p className="font-medium">{letter.content.subject || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">مرسل إلى</p>
                    <p className="font-medium">{letter.content.to || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المرجع</p>
                    <p className="font-medium font-mono text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block">
                      {letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">التاريخ</p>
                    <p className="font-medium">{letter.content.date || new Date(letter.created_at).toLocaleDateString('ar')}</p>
                  </div>
                  {letter.branch_code && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الفرع</p>
                      <p className="font-medium flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span>{letter.branch_code}</span>
                      </p>
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
                  {/* رقم الخطاب - مرجع الخطاب المركب */}
                  <div className="absolute top-[25px] left-[85px] w-32 text-right">
                    <span className="font-medium text-sm">
                      {letter.letter_reference || `${letter.branch_code || ''}-${letter.number}/${letter.year}`}
                    </span>
                  </div>
                  <div className="absolute top-[60px] left-[40px] w-32 p-1 text-sm font-semibold text-center">
                    {letter.content.date}
                  </div>
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
                  
                  {/* QR code */}
                  {letter.verification_url && (
                    <div className="absolute bottom-[40px] right-[40px] flex flex-col items-center">
                      <QRCode
                        value={`${window.location.origin}/verify/${letter.verification_url}`}
                        size={80}
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
          )}
        </div>
        
        <div className="p-4 border-t dark:border-gray-800 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg"
          >
            إغلاق
          </button>
          <div className="flex gap-2">
            <button
              onClick={openInNewWindow}
              className="px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg flex items-center gap-2"
              disabled={!letter}
            >
              <Eye className="h-4 w-4" />
              فتح في نافذة جديدة
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
              disabled={!letter || isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
            </button>
          </div>
        </div>
      </div>
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