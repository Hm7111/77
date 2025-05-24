import { useState, useEffect } from 'react';
import { CheckCircle, ThumbsDown, AlertCircle } from 'lucide-react';
import { useApprovalDecisions } from '../hooks/useApprovalDecisions';
import { ApprovalRequest, Signature } from '../types';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';

interface ApprovalDecisionFormProps {
  request: ApprovalRequest;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * نموذج اتخاذ قرار بشأن طلب موافقة (موافقة أو رفض)
 */
export function ApprovalDecisionForm({ request, onClose, onSuccess }: ApprovalDecisionFormProps) {
  const { approveRequest, rejectRequest, isLoading } = useApprovalDecisions();
  const { dbUser } = useAuth();
  const { toast } = useToast();
  
  const [tab, setTab] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('');
  
  // تحميل التوقيعات
  useEffect(() => {
    if (dbUser) {
      loadSignatures();
    }
  }, [dbUser]);
  
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
  
  // معالجة الموافقة
  async function handleApprove() {
    if (!selectedSignatureId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار توقيع أو رفع توقيع جديد',
        type: 'error',
      });
      return;
    }
    
    const success = await approveRequest({
      requestId: request.id,
      comments,
      signatureId: selectedSignatureId
    });
    
    if (success) {
      onClose();
      if (onSuccess) onSuccess();
    }
  }
  
  // معالجة الرفض
  async function handleReject() {
    if (!rejectionReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال سبب الرفض',
        type: 'error',
      });
      return;
    }
    
    const success = await rejectRequest({
      requestId: request.id,
      reason: rejectionReason
    });
    
    if (success) {
      onClose();
      if (onSuccess) onSuccess();
    }
  }
  
  return (
    <div className="space-y-4">
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
            <CheckCircle className="h-4 w-4 inline-block ml-1" />
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
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
                <p className="text-sm">يرجى رفع توقيعك من صفحة الإعدادات قبل الموافقة على الخطاب</p>
              </div>
            </div>
          )}

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
          
          <div className="pt-4">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isLoading || !selectedSignatureId}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جارٍ الموافقة...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>موافقة</span>
                </>
              )}
            </button>
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
          
          <div className="pt-4">
            <button
              type="button"
              onClick={handleReject}
              disabled={isLoading || !rejectionReason.trim()}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
          </div>
        </div>
      )}
    </div>
  );
}