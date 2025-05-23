import { useEffect, useState } from 'react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { supabase } from '../../lib/supabase';
import type { ApprovalLog, Letter, WorkflowState } from '../../types/database';
import { 
  Clock, CheckCircle, X, FileText, User, Calendar,
  AlertCircle, CheckSquare, Hourglass, FileSignature, RefreshCw
} from 'lucide-react';

interface WorkflowTimelineProps {
  letter: Letter;
  onRefresh?: () => void;
}

export function WorkflowTimeline({ letter, onRefresh }: WorkflowTimelineProps) {
  const [approvalLogs, setApprovalLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getApprovalLogs } = useWorkflow();
  
  useEffect(() => {
    if (letter && letter.approval_id) {
      loadApprovalData();
    }
  }, [letter]);
  
  // تحميل بيانات الموافقة
  async function loadApprovalData() {
    if (!letter.approval_id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // تحميل بيانات طلب الموافقة
      const { data: requestData, error: requestError } = await supabase
        .from('approval_requests')
        .select(`
          *,
          requester:requested_by (id, full_name, email),
          approver:assigned_to (id, full_name, email)
        `)
        .eq('id', letter.approval_id)
        .single();
      
      if (requestError) {
        console.error('Error loading approval request:', requestError);
        throw requestError;
      }
      
      setApprovalRequest(requestData);
      
      // تحميل سجلات الموافقة
      const logs = await getApprovalLogs(letter.approval_id);
      setApprovalLogs(logs || []);
      console.log('Approval logs loaded:', logs);
    } catch (error) {
      console.error('Error loading approval data:', error);
      setError('حدث خطأ أثناء تحميل بيانات سير العمل');
    } finally {
      setIsLoading(false);
    }
  }
  
  // إعادة تحميل البيانات
  const handleRefresh = () => {
    loadApprovalData();
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // الحصول على معلومات الحالة
  const getStatusInfo = (status: WorkflowState) => {
    switch(status) {
      case 'draft':
        return {
          label: 'مسودة',
          icon: <Clock className="h-5 w-5 text-gray-500" />,
          color: 'text-gray-500 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800'
        };
      case 'submitted':
        return {
          label: 'تم الإرسال',
          icon: <FileText className="h-5 w-5 text-blue-500" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        };
      case 'under_review':
        return {
          label: 'قيد المراجعة',
          icon: <Hourglass className="h-5 w-5 text-amber-500" />,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30'
        };
      case 'approved':
        return {
          label: 'معتمد',
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30'
        };
      case 'rejected':
        return {
          label: 'مرفوض',
          icon: <X className="h-5 w-5 text-red-500" />,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30'
        };
      case 'finalized':
        return {
          label: 'نهائي',
          icon: <CheckSquare className="h-5 w-5 text-purple-500" />,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30'
        };
      default:
        return {
          label: status,
          icon: <AlertCircle className="h-5 w-5 text-gray-500" />,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800'
        };
    }
  };
  
  // تحويل نوع الإجراء إلى نص مفهوم
  const getActionLabel = (action: string) => {
    switch(action) {
      case 'submit':
        return 'إرسال للموافقة';
      case 'approve':
        return 'موافقة';
      case 'reject':
        return 'رفض';
      case 'finalize':
        return 'تحويل إلى نهائي';
      case 'review':
        return 'قيد المراجعة';
      default:
        return action;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-4 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
            <div className="mt-2">
              <button
                onClick={handleRefresh}
                className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 px-3 py-1 rounded-md flex items-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!letter.approval_id && letter.workflow_status === 'draft') {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mb-3">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium mb-2">الخطاب في حالة مسودة</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-3">لم يتم إرسال هذا الخطاب للموافقة بعد.</p>
      </div>
    );
  }
  
  if (!letter.approval_id) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium mb-2">لا توجد معلومات سير عمل</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          هذا الخطاب {letter.workflow_status === 'approved' ? 'معتمد' : letter.workflow_status === 'finalized' ? 'نهائي' : 'غير معروف الحالة'} 
          ولكن لا توجد معلومات تفصيلية عن سير العمل.
        </p>
      </div>
    );
  }
  
  if (!approvalRequest) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium mb-2">لا يمكن تحميل بيانات سير العمل</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-3">تعذر تحميل بيانات طلب الموافقة.</p>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 overflow-hidden shadow-sm">
      {/* معلومات الطلب */}
      <div className="p-5 border-b dark:border-gray-800">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          معلومات طلب الموافقة
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">مرسل الطلب</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <p className="font-medium">{approvalRequest.requester?.full_name || 'غير معروف'}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">معتمد الطلب</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <p className="font-medium">{approvalRequest.approver?.full_name || 'غير معروف'}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تاريخ الإرسال</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <p className="font-medium">{new Date(approvalRequest.created_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>
          
          {approvalRequest.due_date && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تاريخ الاستحقاق</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <p className="font-medium">{new Date(approvalRequest.due_date).toLocaleDateString('ar-SA')}</p>
              </div>
            </div>
          )}
          
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الحالة الحالية</p>
            <div className="flex items-center gap-2">
              {getStatusInfo(approvalRequest.status as WorkflowState).icon}
              <p className="font-medium">{getStatusInfo(approvalRequest.status as WorkflowState).label}</p>
            </div>
          </div>
        </div>
        
        {approvalRequest.comments && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات الطلب</p>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
              {approvalRequest.comments}
            </div>
          </div>
        )}
        
        {/* عرض سبب الرفض إذا كان مرفوضاً */}
        {approvalRequest.status === 'rejected' && approvalRequest.rejection_reason && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">سبب الرفض</p>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-sm text-red-800 dark:text-red-300">
              {approvalRequest.rejection_reason}
            </div>
          </div>
        )}
        
        {/* معلومات التوقيع إذا كان معتمداً */}
        {letter.signature_id && letter.workflow_status === 'approved' && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">التوقيع</p>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSignature className="h-5 w-5 text-green-500" />
                <p className="text-green-800 dark:text-green-300 text-sm">
                  تم توقيع الخطاب بواسطة {approvalRequest.approver?.full_name || 'المعتمد'} 
                  {approvalRequest.approved_at && ` بتاريخ ${new Date(approvalRequest.approved_at).toLocaleDateString('ar-SA')}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* تاريخ سير العمل */}
      <div className="p-5">
        <h3 className="font-semibold mb-4">تاريخ سير العمل</h3>
        
        {approvalLogs.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            لا توجد سجلات لتاريخ سير العمل
          </div>
        ) : (
          <div className="space-y-8">
            {approvalLogs.map((log, index) => {
              const statusInfo = getStatusInfo(log.status as WorkflowState);
              
              return (
                <div key={log.id} className="flex gap-4 relative">
                  {/* الخط العمودي الذي يربط بين الخطوات */}
                  {index < approvalLogs.length - 1 && (
                    <div className="absolute right-3 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
                  )}
                  
                  {/* دائرة الحالة */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${statusInfo.bgColor} flex-shrink-0`}>
                    {statusInfo.icon}
                  </div>
                  
                  {/* تفاصيل الإجراء */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-medium ${statusInfo.color}`}>
                        {getActionLabel(log.action)}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleDateString('ar-SA')} - {new Date(log.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>{log.users?.full_name || 'غير معروف'}</span>
                    </div>
                    
                    {log.comments && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                        {log.comments}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}