import { useState, useEffect, useMemo } from 'react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { useToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Clock, Search, CalendarClock, FileText, FileCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { ApprovalRequestModal } from './ApprovalRequestModal';
import { ApprovalDecisionModal } from './ApprovalDecisionModal';
import { ViewLetterModal } from '../letters/ViewLetterModal';
import { WorkflowStatus } from './WorkflowStatus';
import { supabase } from '../../lib/supabase';
import { Letter } from '../../types/database';

interface ApprovalListProps {
  role: 'requester' | 'approver';
}

export function ApprovalList({ role }: ApprovalListProps) {
  const { getPendingApprovals, isLoading: workflowLoading } = useWorkflow();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewLetterModalOpen, setViewLetterModalOpen] = useState(false);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'approver') {
      loadPendingApprovals();
    } else {
      loadMyRequests();
    }
  }, [role]);

  // تحميل طلبات الموافقة المعلقة
  async function loadPendingApprovals() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPendingApprovals();
      console.log('Loaded pending approvals:', data);
      setApprovals(data);
      if (data.length === 0) {
        toast({
          title: 'معلومات',
          description: 'لا توجد طلبات موافقة معلقة حالياً',
          type: 'info'
        });
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      setError('حدث خطأ أثناء تحميل طلبات الموافقة المعلقة');
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل طلبات الموافقة المعلقة',
        type: 'error'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // تحميل طلبات الموافقة التي أنشأها المستخدم
  async function loadMyRequests() {
    setIsLoading(true);
    setError(null);
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      
      if (!userId) {
        throw new Error('لم يتم العثور على المستخدم');
      }
      
      console.log('Loading approval requests for user ID:', userId);
      
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          letters:letter_id (*),
          approver:assigned_to (full_name, email)
        `)
        .eq('requested_by', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading approval requests:', error);
        throw error;
      }
      
      console.log('Loaded my approval requests:', data);
      setApprovals(data || []);
      
      if (data && data.length === 0) {
        toast({
          title: 'معلومات',
          description: 'لم تقم بإنشاء أي طلبات موافقة بعد',
          type: 'info'
        });
      }
    } catch (error) {
      console.error('Error loading my approval requests:', error);
      setError('حدث خطأ أثناء تحميل طلبات الموافقة');
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب طلبات الموافقة الخاصة بك',
        type: 'error'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // تحديث البيانات بعد الإجراء
  const handleSuccess = () => {
    if (role === 'approver') {
      loadPendingApprovals();
    } else {
      loadMyRequests();
    }
    
    // تحديث بيانات الخطابات
    queryClient.invalidateQueries({ queryKey: ['letters'] });
  };

  // فلترة الطلبات بناءً على البحث
  const filteredApprovals = useMemo(() => {
    return approvals.filter(approval => {
      if (!searchTerm) return true;
      
      // البحث في الطلبات المعلقة (للمعتمدين)
      if (role === 'approver') {
        return (
          (approval.letter_subject && approval.letter_subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (approval.requester_name && approval.requester_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      // البحث في طلباتي (للمستخدمين)
      return (
        (approval.letters?.content?.subject && approval.letters.content.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (approval.approver?.full_name && approval.approver.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [approvals, searchTerm, role]);

  // فتح نافذة اتخاذ القرار
  const openDecisionModal = (request: any) => {
    console.log('Opening decision modal for request:', request);
    setSelectedRequest(request);
    setShowDecisionModal(true);
  };

  // عرض تفاصيل الخطاب في نافذة منبثقة
  const handleViewLetter = (letterId: string, requestId?: string) => {
    console.log('Opening letter in modal:', letterId, 'Request ID:', requestId);
    setSelectedLetterId(letterId);
    setSelectedRequestId(requestId || null);
    setViewLetterModalOpen(true);
  };

  // عرض تفاصيل الخطاب في صفحة منفصلة
  const handleViewLetterInNewPage = (letterId: string, requestId?: string) => {
    if (requestId) {
      window.open(`/admin/letters/view/${letterId}?fromApproval=true&requestId=${requestId}`, '_blank');
    } else {
      window.open(`/admin/letters/view/${letterId}`, '_blank');
    }
  };

  return (
    <div>
      {/* نافذة طلب الموافقة */}
      {showRequestModal && selectedLetter && (
        <ApprovalRequestModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          letter={selectedLetter}
          onSuccess={handleSuccess}
        />
      )}

      {/* نافذة اتخاذ القرار */}
      {showDecisionModal && selectedRequest && (
        <ApprovalDecisionModal
          isOpen={showDecisionModal}
          onClose={() => setShowDecisionModal(false)}
          request={selectedRequest}
          onApprove={handleSuccess}
          onReject={handleSuccess}
        />
      )}
      
      {/* نافذة عرض الخطاب */}
      {viewLetterModalOpen && selectedLetterId && (
        <ViewLetterModal
          isOpen={viewLetterModalOpen}
          onClose={() => setViewLetterModalOpen(false)}
          letterId={selectedLetterId}
          requestId={selectedRequestId || undefined}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {role === 'approver' ? (
              <>
                <ClipboardCheck className="h-5 w-5 text-primary" />
                طلبات الموافقة المعلقة
              </>
            ) : (
              <>
                <FileCheck className="h-5 w-5 text-primary" />
                طلبات الموافقة الخاصة بي
              </>
            )}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {role === 'approver'
              ? 'الطلبات التي تحتاج إلى موافقتك'
              : 'الطلبات التي أنشأتها وحالتها'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="بحث في الطلبات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg w-full"
            />
          </div>
          <button
            onClick={() => (role === 'approver' ? loadPendingApprovals() : loadMyRequests())}
            className="p-2.5 border dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="تحديث"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* عرض السجلات */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل الطلبات...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-900/30 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-red-700 dark:text-red-300">{error}</h3>
          <p className="text-red-600 dark:text-red-400 mb-4">حاول تحديث الصفحة أو إعادة المحاولة لاحقًا.</p>
          <button
            onClick={() => (role === 'approver' ? loadPendingApprovals() : loadMyRequests())}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 inline-block mr-1" /> إعادة المحاولة
          </button>
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-8 text-center">
          {role === 'approver' ? (
            <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          ) : (
            <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد طلبات موافقة'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {searchTerm 
              ? 'لم يتم العثور على طلبات تطابق معايير البحث. جرب استخدام كلمات مفتاحية أخرى.'
              : role === 'approver'
              ? 'لا توجد طلبات تنتظر موافقتك حالياً.'
              : 'لم تقم بإنشاء أي طلبات موافقة حتى الآن.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الخطاب</th>
                  {role === 'approver' ? (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المرسل</th>
                  ) : (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المعتمد</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">تاريخ الطلب</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredApprovals.map((approval) => {
                  // تحديد البيانات بناءً على نوع القائمة
                  const letterSubject = role === 'approver' 
                    ? approval.letter_subject 
                    : approval.letters?.content?.subject;
                  
                  const letterNumber = role === 'approver'
                    ? null 
                    : `${approval.letters?.number}/${approval.letters?.year}`;
                  
                  const personName = role === 'approver'
                    ? approval.requester_name
                    : approval.approver?.full_name;
                  
                  const requestDate = new Date(approval.created_at).toLocaleDateString('ar-SA');
                  
                  const letterId = role === 'approver'
                    ? approval.letter_id
                    : approval.letters?.id;
                  
                  // تحديد ID طلب الموافقة للمرجعية
                  const requestId = approval.request_id || approval.id;
                  
                  return (
                    <tr key={approval.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{letterSubject || 'غير معروف'}</p>
                            {letterNumber && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                رقم الخطاب: {letterNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          </div>
                          <span className="font-medium">{personName || 'غير معروف'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <CalendarClock className="h-4 w-4 text-gray-400" />
                          <span>{requestDate}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <WorkflowStatus status={approval.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewLetter(letterId, requestId)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="عرض الخطاب"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          
                          {role === 'approver' && approval.status === 'submitted' && (
                            <button
                              onClick={() => openDecisionModal(approval)}
                              className="p-1.5 text-primary hover:text-primary/80 hover:bg-primary/5 dark:hover:bg-primary/10 rounded"
                              title="اتخاذ قرار"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}