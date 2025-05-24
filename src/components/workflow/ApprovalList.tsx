import { useState, useEffect, useMemo } from 'react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { useToast } from '../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ClipboardCheck, 
  CheckSquare, 
  FileCheck, 
  Clock, 
  Search, 
  Calendar, 
  User, 
  Filter, 
  AlertCircle, 
  RefreshCw,
  Eye,
  ClipboardList,
  ChevronDown,
  BookOpen,
  FileText,
  SortAsc,
  SortDesc,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ApprovalRequestModal } from './ApprovalRequestModal';
import { ApprovalDecisionModal } from './ApprovalDecisionModal';
import { ViewLetterModal } from '../letters/ViewLetterModal';
import { WorkflowStatus } from './WorkflowStatus';
import { supabase } from '../../lib/supabase';
import { Letter } from '../../types/database';
import moment from 'moment-hijri';

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
  const [sortField, setSortField] = useState<'created_at' | 'subject'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewLetterModalOpen, setViewLetterModalOpen] = useState(false);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
    let filtered = approvals.filter(approval => {
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
    
    // تطبيق فلتر الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(approval => approval.status === statusFilter);
    }
    
    // تطبيق الترتيب
    return filtered.sort((a, b) => {
      const fieldA = role === 'approver' 
        ? (a.letter_subject || '') 
        : (a.letters?.content?.subject || '');
      const fieldB = role === 'approver' 
        ? (b.letter_subject || '') 
        : (b.letters?.content?.subject || '');
      
      if (sortField === 'subject') {
        return sortDirection === 'asc' 
          ? fieldA.localeCompare(fieldB) 
          : fieldB.localeCompare(fieldA);
      } else {
        const dateA = new Date(a.created_at || a.requested_at).getTime();
        const dateB = new Date(b.created_at || b.requested_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
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
        <div className="flex flex-col">
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
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-grow md:flex-grow-0 md:min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="بحث في الطلبات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 border dark:border-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="فلترة"
          >
            <Filter className="h-4 w-4 text-gray-500" />
          </button>
          
          <button
            onClick={() => (role === 'approver' ? loadPendingApprovals() : loadMyRequests())}
            className="p-2.5 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            title="تحديث"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* أدوات الفلترة */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">حالة الطلب</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="all">جميع الحالات</option>
                <option value="submitted">تم الإرسال</option>
                <option value="under_review">قيد المراجعة</option>
                <option value="approved">تمت الموافقة</option>
                <option value="rejected">مرفوض</option>
                <option value="finalized">نهائي</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">ترتيب حسب</label>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortField(field as 'created_at' | 'subject');
                  setSortDirection(direction as 'asc' | 'desc');
                }}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="created_at-desc">الأحدث أولاً</option>
                <option value="created_at-asc">الأقدم أولاً</option>
                <option value="subject-asc">الموضوع (أ-ي)</option>
                <option value="subject-desc">الموضوع (ي-أ)</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => {
                setStatusFilter('all');
                setSortField('created_at');
                setSortDirection('desc');
                setSearchTerm('');
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              إعادة ضبط
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              تطبيق
            </button>
          </div>
        </div>
      )}
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
            <ClipboardCheck className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          ) : (
            <FileCheck className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          )}
          <h3 className="text-xl font-bold mb-2">
            {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد طلبات موافقة'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
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
            <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <div className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-800 grid grid-cols-5 py-4">
                <div className="px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 cursor-pointer select-none"
                  onClick={() => {
                    if (sortField === 'subject') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('subject');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <span className="font-bold">الخطاب</span>
                  {sortField === 'subject' && (
                    sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                  )}
                </div>
                <div className="px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 select-none text-center">
                  <span className="font-bold">{role === 'approver' ? 'المرسل' : 'المعتمد'}</span>
                </div>
                <div className="px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 cursor-pointer select-none"
                  onClick={() => {
                    if (sortField === 'created_at') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('created_at');
                      setSortDirection('desc');
                    }
                  }}
                >
                  <span className="font-bold">تاريخ الطلب</span>
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                  )}
                </div>
                <div className="px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 select-none text-center">
                  <span className="font-bold">الحالة</span>
                </div>
                <div className="px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 select-none">
                  <span className="font-bold">الإجراءات</span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
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
                  
                  const requestDate = approval.created_at || approval.requested_at;
                  
                  const letterId = role === 'approver'
                    ? approval.letter_id
                    : approval.letters?.id;
                  
                  // تحديد ID طلب الموافقة للمرجعية
                  const requestId = approval.request_id || approval.id;
                  
                  // تحديد أيقونة الحالة
                  const getStatusIcon = (status: string) => {
                    switch(status) {
                      case 'submitted': return <Clock className="h-4 w-4 text-blue-500" />;
                      case 'under_review': return <Eye className="h-4 w-4 text-amber-500" />;
                      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
                      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
                      default: return <Clock className="h-4 w-4 text-gray-500" />;
                    }
                  };
                  
                  return (
                    <div key={approval.id} className="grid grid-cols-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b dark:border-gray-800 last:border-b-0">
                      <div className="px-4 flex items-center">
                        <div className="flex items-start gap-3 w-full">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shadow-sm">
                              <FileText className="h-5 w-5 text-primary dark:text-primary-foreground" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-white truncate mb-1">{letterSubject || 'غير معروف'}</p>
                            {letterNumber && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{letterNumber}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="px-4 flex items-center justify-start">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg mx-auto">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{personName || 'غير معروف'}</span>
                        </div>
                      </div>
                      
                      <div className="px-4 flex items-center justify-start">
                        <div className="flex flex-col bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg mx-auto">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 mb-0.5">
                            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">{moment(requestDate).format('iYYYY/iM/iD')}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(requestDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="px-4 flex items-center justify-start">
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg mx-auto">
                          {getStatusIcon(approval.status)}
                          <WorkflowStatus status={approval.status} />
                        </div>
                      </div>
                      
                      <div className="px-4 flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewLetter(letterId, requestId)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center gap-1.5 transition-colors"
                          title="عرض الخطاب"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">عرض</span>
                        </button>
                        
                        {role === 'approver' && approval.status === 'submitted' && (
                          <button
                            onClick={() => openDecisionModal(approval)}
                            className="p-2 text-primary hover:text-primary/80 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg flex items-center gap-1.5 transition-colors"
                            title="اتخاذ قرار"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            <span className="text-xs font-medium hidden sm:inline">اتخاذ قرار</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}