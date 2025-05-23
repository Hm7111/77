import { useState, useEffect, useRef } from 'react';
import { X, Check, ThumbsDown, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useWorkflow } from '../../hooks/useWorkflow';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Letter, ApprovalRequest, Signature } from '../../types/database';
import { SignatureUploader } from '../profile/SignatureUploader';
import { ErrorBoundary } from '../ui/ErrorBoundary';

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ApprovalRequest & {
    letters?: Letter;
    users?: { full_name: string; email: string };
  };
  onApprove?: () => void;
  onReject?: () => void;
}

export function ApprovalDecisionModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
}: ApprovalDecisionModalProps) {
  const { approveRequest, rejectRequest, isLoading } = useWorkflow();
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('');
  const [tab, setTab] = useState<'approve' | 'reject'>('approve');
  const [viewContent, setViewContent] = useState(false);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const debugRef = useRef<any>({});
  const [retryCount, setRetryCount] = useState(0);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // تحميل التوقيعات
  useEffect(() => {
    if (isOpen && dbUser) {
      loadSignatures();
      loadLetter();
    }
  }, [isOpen, dbUser, request?.letter_id, retryCount]);

  async function loadSignatures() {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('user_id', dbUser?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignatures(data || []);

      // تعيين التوقيع الأحدث كافتراضي
      if (data && data.length > 0) {
        setSelectedSignatureId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading signatures:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل التوقيعات',
        type: 'error',
      });
    }
  }

  // تحميل تفاصيل الخطاب
  async function loadLetter() {
    if (!request?.letter_id && !request?.id) {
      return;
    }
    
    setLoadingLetter(true);
    setLetterError(null);
    
    try {
      // حفظ معلومات التشخيص
      debugRef.current = {
        requestId: request.id,
        letterId: request.letter_id,
        timestamp: new Date().toISOString(),
        retryCount
      };
      
      console.log('Loading letter details for request:', request.id);
      
      // طريقة 1: الحصول على معرف الخطاب من طلب الموافقة
      let letterId = request.letter_id;
      
      // إذا لم يكن معرف الخطاب موجودًا، استخدم RPC للحصول عليه
      if (!letterId) {
        console.log('Letter ID not available, fetching via RPC');
        const { data: letterIdData, error: letterIdError } = await supabase.rpc(
          'get_letter_by_request_id',
          { p_request_id: request.id }
        );
        
        if (letterIdError) {
          console.error('Error fetching letter ID:', letterIdError);
          debugRef.current.letterIdError = letterIdError;
          throw new Error(`خطأ في استرجاع معرّف الخطاب: ${letterIdError.message || 'خطأ غير معروف'}`);
        }
        
        if (!letterIdData || letterIdData.length === 0) {
          throw new Error('لم يتم العثور على معرّف الخطاب المرتبط بطلب الموافقة');
        }
        
        console.log('Retrieved letter ID data:', letterIdData);
        letterId = letterIdData[0].letter_id;
      }
      
      if (!letterId) {
        throw new Error('معرّف الخطاب غير موجود أو غير صالح');
      }
      
      debugRef.current.resolvedLetterId = letterId;
      
      // طريقة 2: استخدام RPC للحصول على تفاصيل الخطاب
      console.log('Fetching letter details for ID:', letterId);
      const { data: letterDetails, error: letterDetailsError } = await supabase.rpc(
        'get_letter_details_for_approval',
        { p_letter_id: letterId }
      );
      
      if (letterDetailsError) {
        console.error('Error fetching letter details:', letterDetailsError);
        debugRef.current.letterDetailsError = letterDetailsError;
        throw letterDetailsError;
      }
      
      if (!letterDetails || letterDetails.length === 0) {
        throw new Error('فشل في تحميل تفاصيل الخطاب');
      }
      
      console.log('Successfully loaded letter details:', letterDetails);
      
      // تحويل البيانات إلى الشكل المطلوب
      const fullLetter: Letter = {
        id: letterDetails[0].letter_id,
        user_id: request.requested_by,
        template_id: letterDetails[0].template_id,
        content: letterDetails[0].content,
        status: 'completed',
        number: letterDetails[0].number,
        year: letterDetails[0].year,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        letter_templates: {
          id: letterDetails[0].template_id,
          name: letterDetails[0].template_name,
          image_url: letterDetails[0].template_image_url,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: '',
          variables: [],
          zones: []
        }
      };
      
      setLetter(fullLetter);
      
    } catch (error) {
      console.error('Error loading letter:', error);
      debugRef.current.finalError = error;
      setLetterError(error instanceof Error ? error.message : 'لم نتمكن من تحميل الخطاب');
      
      toast({
        title: 'خطأ',
        description: 'تعذر تحميل بيانات الخطاب. يرجى المحاولة مرة أخرى.',
        type: 'error',
      });
    } finally {
      setLoadingLetter(false);
    }
  }

  // إعادة تحميل الخطاب
  const handleRetryLoadLetter = () => {
    setRetryCount(prev => prev + 1);
  };

  // معالجة الموافقة
  async function handleApprove() {
    // التحقق من معرف الطلب والمعلومات المطلوبة الأخرى
    if (!request?.id) {
      console.error('معرف الطلب غير موجود:', request);
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على بيانات الطلب. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.',
        type: 'error',
      });
      return;
    }

    if (!selectedSignatureId) {
      console.error('لم يتم اختيار توقيع');
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار توقيع أو رفع توقيع جديد',
        type: 'error',
      });
      return;
    }

    if (!request.letter_id) {
      console.error('معرف الخطاب غير موجود:', request);
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على بيانات الخطاب المرتبطة بهذا الطلب.',
        type: 'error',
      });
      return;
    }

    try {
      setIsLoading(true);
      setApprovalError(null);
      console.log('Approving request with ID:', request.id);
      console.log('For letter ID:', request.letter_id);
      console.log('With signature ID:', selectedSignatureId);
      console.log('Comments:', comments);
      
      // استخدام RPC المحسنة
      const { data, error } = await supabase.rpc('approve_letter_with_signature', {
        p_request_id: request.id,
        p_signature_id: selectedSignatureId,
        p_comments: comments || null
      });

      if (error) {
        console.error("Error from RPC call:", error, error.message, error.details);
        // عرض معلومات تصحيح الأخطاء الإضافية
        console.log("Debug info:", debugRef.current);
        setApprovalError(error.message);
        throw error;
      }

      toast({
        title: 'تمت الموافقة',
        description: 'تم الموافقة على الخطاب بنجاح',
        type: 'success',
      });
      
      onClose();
      if (onApprove) onApprove();
    } catch (error) {
      console.error('Error approving letter:', error);
      
      let errorMessage = 'حدث خطأ أثناء الموافقة على الخطاب';
      
      if (error instanceof Error) {
        // تنظيف رسالة الخطأ وإظهار جزء مفيد فقط
        const cleanedMessage = error.message.includes('|') ? 
          error.message.split('|')[0].trim() : 
          error.message;
        errorMessage = cleanedMessage;
      }
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // عرض رسالة الخطأ التفصيلية للمساعدة في التشخيص
  const renderErrorDetails = () => {
    if (!approvalError) return null;
    
    return (
      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
        <h4 className="font-medium text-red-800 dark:text-red-300 mb-1">تفاصيل الخطأ:</h4>
        <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">{approvalError}</p>
      </div>
    );
  };

  // معالجة الرفض
  async function handleReject() {
    // التحقق من معرف الطلب
    if (!request?.id) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على بيانات الطلب. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.',
        type: 'error',
      });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال سبب الرفض',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('reject_letter', {
        p_request_id: request.id,
        p_reason: rejectionReason
      });
      
      if (error) {
        console.error("Error from reject RPC call:", error);
        throw error;
      }

      toast({
        title: 'تم الرفض',
        description: 'تم رفض الخطاب بنجاح',
        type: 'success',
      });
      
      onClose();
      if (onReject) onReject();
    } catch (error) {
      console.error('Error rejecting letter:', error);
      
      let errorMessage = 'حدث خطأ أثناء رفض الخطاب';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // عند تحميل توقيع جديد
  const handleSignatureUploaded = (signatureUrl: string, signatureId: string) => {
    setSelectedSignatureId(signatureId);
    // تحديث قائمة التوقيعات
    loadSignatures();
  };

  // مشاهدة محتوى الخطاب
  const handleViewLetter = () => {
    if (letter?.id) {
      window.open(`/admin/letters/view/${letter.id}`, '_blank');
    } else if (request?.letter_id) {
      window.open(`/admin/letters/view/${request.letter_id}`, '_blank');
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <h3 className="font-semibold text-lg flex items-center">
            {tab === 'approve' ? (
              <Check className="h-5 w-5 text-green-500 ml-2" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-red-500 ml-2" />
            )}
            {tab === 'approve' ? 'الموافقة على الخطاب' : 'رفض الخطاب'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <ErrorBoundary>
          <div>
            {/* معلومات الخطاب */}
            <div className="p-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  معلومات الخطاب
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">الموضوع</span>
                    <span className="font-medium">
                      {letter?.content?.subject || request.letters?.content?.subject || 'غير معروف'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">رقم الخطاب</span>
                    <span className="font-medium">
                      {letter ? `${letter.number}/${letter.year}` : 'غير معروف'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">مقدم من</span>
                    <span className="font-medium">{request.users?.full_name || 'غير معروف'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">تاريخ الطلب</span>
                    <span className="font-medium">
                      {new Date(request.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  {request.due_date && (
                    <div>
                      <span className="block text-gray-500 dark:text-gray-400">تاريخ الاستحقاق</span>
                      <span className="font-medium">
                        {new Date(request.due_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  )}
                </div>
                {request.comments && (
                  <div className="mt-2">
                    <span className="block text-gray-500 dark:text-gray-400">ملاحظات</span>
                    <p className="p-2 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded text-sm">
                      {request.comments}
                    </p>
                  </div>
                )}
                
                {/* معاينة الخطاب */}
                <div className="mt-2">
                  <div className="flex justify-between items-center">
                    <span className="block text-gray-500 dark:text-gray-400">معاينة الخطاب</span>
                    <div className="flex gap-1">
                      <button
                        onClick={handleViewLetter}
                        disabled={!letter && !request.letter_id}
                        className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        فتح في صفحة جديدة
                      </button>
                    </div>
                  </div>

                  {loadingLetter ? (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 flex justify-center">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-t-primary border-primary/30 rounded-full animate-spin mb-2"></div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل الخطاب...</span>
                      </div>
                    </div>
                  ) : letterError ? (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-red-700 dark:text-red-300 font-medium mb-1">{letterError}</p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          قد تكون هناك مشكلة في الصلاحيات أو عدم وجود الخطاب.
                        </p>
                        <button
                          onClick={handleRetryLoadLetter}
                          className="mt-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          إعادة المحاولة
                        </button>
                      </div>
                    </div>
                  ) : letter ? (
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                          <img 
                            src={letter.letter_templates?.image_url || "/placeholder-template.png"} 
                            alt="قالب الخطاب"
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                        <div>
                          <h5 className="font-medium">{letter.letter_templates?.name || "خطاب"}</h5>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <span>رقم: {letter.number}/{letter.year}</span>
                            <span className="inline-block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span>تاريخ: {letter.content?.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700 text-sm">
                        <div 
                          dangerouslySetInnerHTML={{ __html: letter.content?.body || 'لا يوجد محتوى' }}
                          className="dir-rtl"
                          style={{
                            fontFamily: 'Cairo, sans-serif',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            textAlign: 'right',
                            direction: 'rtl'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
                      لم يتم العثور على معلومات الخطاب
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* عرض تفاصيل الخطأ إذا وجد */}
            {renderErrorDetails()}

            {/* اختيار الإجراء */}
            <div className="p-4">
              <div className="flex rounded-md overflow-hidden">
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium ${
                    tab === 'approve'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setTab('approve')}
                >
                  <Check className="h-4 w-4 inline-block ml-1" />
                  موافقة
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium ${
                    tab === 'reject'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setTab('reject')}
                >
                  <ThumbsDown className="h-4 w-4 inline-block ml-1" />
                  رفض
                </button>
              </div>
            </div>

            {/* نموذج الموافقة */}
            {tab === 'approve' && (
              <div className="p-4 space-y-4">
                {signatures.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      اختيار التوقيع
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {signatures.map((sig) => (
                        <div
                          key={sig.id}
                          onClick={() => setSelectedSignatureId(sig.id)}
                          className={`border p-3 rounded-lg cursor-pointer ${
                            selectedSignatureId === sig.id
                              ? 'border-primary bg-primary/5 dark:bg-primary/10'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="bg-white dark:bg-gray-800 p-2 rounded flex justify-center items-center h-24">
                            <img
                              src={sig.signature_url}
                              alt="التوقيع"
                              className="max-h-full object-contain"
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(sig.created_at).toLocaleDateString()}
                            </span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              selectedSignatureId === sig.id 
                                ? 'bg-primary border-primary text-white' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {selectedSignatureId === sig.id && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">لم يتم العثور على توقيع</p>
                      <p className="text-sm">يرجى رفع توقيعك أدناه للموافقة على الخطاب</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    إضافة توقيع جديد
                  </label>
                  <SignatureUploader
                    onSuccess={handleSignatureUploaded}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="comments" className="block text-sm font-medium mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg h-24 resize-none"
                    placeholder="أضف أي ملاحظات أو تعليقات على الموافقة..."
                  />
                </div>
              </div>
            )}

            {/* نموذج الرفض */}
            {tab === 'reject' && (
              <div className="p-4 space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-red-800 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p>
                    سيتم إعادة الخطاب إلى المرسل مع توضيح سبب الرفض.
                  </p>
                </div>

                <div>
                  <label htmlFor="rejectionReason" className="block text-sm font-medium mb-2">
                    سبب الرفض <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 border dark:border-gray-700 rounded-lg h-24 resize-none"
                    placeholder="يرجى توضيح سبب رفض الخطاب..."
                    required
                  />
                </div>
              </div>
            )}

            {/* أزرار الإجراءات */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                إلغاء
              </button>

              {tab === 'approve' ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isLoading || !selectedSignatureId || !request?.id}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>جارٍ الموافقة...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>موافقة</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isLoading || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>جارٍ الرفض...</span>
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="h-4 w-4" />
                      <span>رفض</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}