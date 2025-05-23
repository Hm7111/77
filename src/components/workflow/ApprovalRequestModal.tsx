import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useWorkflow } from '../../hooks/useWorkflow';
import { useToast } from '../../hooks/useToast';
import { X, CheckCircle, Calendar, Clock, User, Search, AlertCircle } from 'lucide-react';
import { Letter, User as UserType } from '../../types/database';
import { ErrorBoundary } from '../ui/ErrorBoundary';

interface ApprovalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: Letter | null;
  onSuccess?: () => void;
}

export function ApprovalRequestModal({ isOpen, onClose, letter, onSuccess }: ApprovalRequestModalProps) {
  const { dbUser } = useAuth();
  const { requestApproval, isLoading } = useWorkflow();
  const { toast } = useToast();
  const [approverId, setApproverId] = useState<string>('');
  const [comments, setComments] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // تحميل المستخدمين عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // تحميل المستخدمين من قاعدة البيانات
  async function loadUsers() {
    try {
      setIsSearching(true);
      setLoadError(null);
      
      console.log('Loading users, current user ID:', dbUser?.id);
      
      // استخدام وظيفة RPC مخصصة لجلب المستخدمين المتاحين للموافقة
      const { data, error } = await supabase.rpc('get_available_approvers');

      if (error) {
        console.error('Error loading users with RPC:', error);
        // محاولة استخدام الطريقة البديلة إذا فشلت وظيفة RPC
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('id, full_name, email, role, is_active, branches(name, code)')
          .eq('is_active', true)
          .neq('id', dbUser?.id)
          .order('full_name');
        
        if (fallbackError) {
          console.error('Fallback error loading users:', fallbackError);
          setLoadError(`فشل في تحميل المستخدمين: ${fallbackError.message}`);
          throw fallbackError;
        }
        
        setUsers(fallbackData || []);
        console.log('Found users (fallback):', fallbackData ? fallbackData.length : 0, fallbackData);
      } else {
        setUsers(data || []);
        console.log('Found users (RPC):', data ? data.length : 0, data);
      }
      
      if (!data || data.length === 0) {
        toast({
          title: 'تنبيه',
          description: 'لا يوجد مستخدمين آخرين متاحين للموافقة. يرجى إضافة مستخدمين جدد.',
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setLoadError('حدث خطأ أثناء تحميل المستخدمين');
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل المستخدمين',
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  }

  // تقديم طلب الموافقة
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!letter) return;
    
    if (!approverId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المستخدم المعتمد',
        type: 'error'
      });
      return;
    }
    
    try {
      console.log('Sending approval request:', { letter, approverId, comments, dueDate });
      const result = await requestApproval(
        letter.id,
        approverId,
        comments,
        dueDate ? new Date(dueDate) : undefined
      );
      
      if (result) {
        toast({
          title: 'تم إرسال الطلب',
          description: 'تم إرسال طلب الموافقة بنجاح',
          type: 'success'
        });
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error requesting approval:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال طلب الموافقة',
        type: 'error'
      });
    }
  }

  // فلترة المستخدمين بناءً على البحث
  const filteredUsers = users.filter(user => 
    !searchTerm || 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-lg overflow-hidden shadow-xl">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-800">
          <h3 className="text-lg font-semibold flex items-center">
            <CheckCircle className="h-5 w-5 text-primary ml-2" />
            طلب موافقة على الخطاب
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <ErrorBoundary>
          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
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
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="البحث عن مستخدم..."
                    className="w-full pr-10 pl-4 py-2.5 border dark:border-gray-700 rounded-lg focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div className="border dark:border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex justify-center items-center p-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    </div>
                  ) : loadError ? (
                    <div className="p-4 text-center text-red-500 dark:text-red-400 flex flex-col items-center">
                      <AlertCircle className="h-6 w-6 mb-2" />
                      <p>{loadError}</p>
                      <button 
                        onClick={loadUsers}
                        className="mt-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      {users.length === 0 ? 
                        "لا يوجد مستخدمين آخرين متاحين للموافقة. يرجى إضافة مستخدمين جدد من صفحة إدارة المستخدمين." : 
                        "لا يوجد مستخدمين مطابقين للبحث"}
                    </div>
                  ) : (
                    filteredUsers.map(user => (
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

                {users.length === 0 && (
                  <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
                    <div className="flex items-center gap-3 text-yellow-800 dark:text-yellow-300">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">لا يوجد مستخدمين متاحين للموافقة</p>
                        <p className="text-sm mt-1">
                          يرجى التأكد من أن هناك مستخدمين آخرين في النظام بحالة "نشط". يمكنك إضافة مستخدمين جدد من خلال صفحة إدارة المستخدمين.
                        </p>
                        <a 
                          href="/admin/users" 
                          target="_blank" 
                          className="inline-block mt-2 text-sm bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-3 py-1.5 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/60"
                        >
                          الانتقال إلى إدارة المستخدمين
                        </a>
                      </div>
                    </div>
                  </div>
                )}
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
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading || !approverId || users.length === 0}
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
        </ErrorBoundary>
      </div>
    </div>
  );
}