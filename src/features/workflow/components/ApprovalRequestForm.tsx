import { useState, useEffect } from 'react';
import { CheckCircle, Calendar, User, X } from 'lucide-react';
import { useApprovalRequests } from '../hooks/useApprovalRequests';
import { Letter } from '../types';
import { useToast } from '../../../hooks/useToast';

interface ApprovalRequestFormProps {
  letter: Letter;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * نموذج طلب الموافقة على خطاب
 */
export function ApprovalRequestForm({ letter, onClose, onSuccess }: ApprovalRequestFormProps) {
  const { createRequest, getAvailableApprovers, isLoading } = useApprovalRequests();
  const { toast } = useToast();
  
  const [approverId, setApproverId] = useState<string>('');
  const [comments, setComments] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [approvers, setApprovers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // تحميل المستخدمين المتاحين للموافقة
  useEffect(() => {
    loadApprovers();
  }, []);
  
  async function loadApprovers() {
    const data = await getAvailableApprovers();
    setApprovers(data);
    
    if (data.length === 0) {
      toast({
        title: 'تنبيه',
        description: 'لا يوجد مستخدمين متاحين للموافقة',
        type: 'warning'
      });
    }
  }
  
  // فلترة المستخدمين حسب البحث
  const filteredApprovers = approvers.filter(user => 
    !searchTerm || 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // إرسال طلب الموافقة
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!approverId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المستخدم المعتمد',
        type: 'error'
      });
      return;
    }
    
    const result = await createRequest({
      letterId: letter.id,
      approverId,
      comments,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });
    
    if (result) {
      onClose();
      if (onSuccess) onSuccess();
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 text-blue-800 dark:text-blue-300 text-sm">
        <p className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>
            بعد إرسال الطلب، سيتم إشعار الشخص المعتمد للمراجعة والموافقة على الخطاب. يمكنك متابعة حالة الطلب في تفاصيل الخطاب.
          </span>
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">معلومات الخطاب</label>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">العنوان:</span>
            <span className="text-sm font-medium">{letter?.content?.subject || 'غير محدد'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">الرقم:</span>
            <span className="text-sm font-medium">{letter?.number}/{letter?.year}</span>
          </div>
        </div>
      </div>
      
      <div>
        <label htmlFor="approver" className="block text-sm font-medium mb-2">اختيار الشخص المعتمد <span className="text-red-500">*</span></label>
        <div className="relative mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث عن مستخدم..."
            className="w-full pr-10 pl-4 py-2.5 border dark:border-gray-700 rounded-lg focus:ring-primary focus:border-primary"
          />
        </div>
        
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
          ) : filteredApprovers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {approvers.length === 0 ? 
                "لا يوجد مستخدمين متاحين للموافقة" : 
                "لا يوجد مستخدمين مطابقين للبحث"}
            </div>
          ) : (
            filteredApprovers.map(user => (
              <div 
                key={user.id}
                className={`p-3 flex items-center gap-3 cursor-pointer border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  approverId === user.id ? 'bg-primary/5 dark:bg-primary/10' : ''
                }`}
                onClick={() => setApproverId(user.id)}
              >
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    approverId === user.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                    {user.branches && ` • ${user.branches.name}`}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    approverId === user.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {approverId === user.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium mb-2">
          <Calendar className="inline-block h-4 w-4 ml-1" />
          تاريخ الاستحقاق (اختياري)
        </label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full p-2 border dark:border-gray-700 rounded-lg"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      
      <div>
        <label htmlFor="comments" className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
        <textarea
          id="comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="w-full p-2 border dark:border-gray-700 rounded-lg resize-none h-24"
          placeholder="أضف أي ملاحظات أو تعليقات إضافية..."
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isLoading || !approverId || approvers.length === 0}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>جارٍ الإرسال...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>إرسال للموافقة</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}