import { useState, useEffect } from 'react';
import { 
  FileText, 
  FileEdit, 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  Filter, 
  AlertCircle, 
  RefreshCw,
  Eye,
  ClipboardList,
  ChevronDown,
  BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment-hijri';

export function AuditLogs() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState<any>(null);
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null}>({
    start: null,
    end: null
  });

  // استعلام لجلب سجلات الأحداث
  const { 
    data: logs = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['audit-logs', filterAction, filterTarget, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('performed_at', { ascending: false });
      
      // تطبيق فلتر نوع العملية
      if (filterAction !== 'all') {
        query = query.eq('action_type', filterAction);
      }
      
      // تطبيق فلتر نوع الكيان
      if (filterTarget !== 'all') {
        query = query.eq('target_type', filterTarget);
      }

      // تطبيق فلتر التاريخ
      if (dateRange.start) {
        query = query.gte('performed_at', dateRange.start);
      }
      
      if (dateRange.end) {
        query = query.lte('performed_at', dateRange.end);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // فلترة النتائج بناء على البحث
  const filteredLogs = logs.filter(log => 
    searchQuery === '' || 
    (log.summary && log.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (log.user_name && log.user_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // إظهار تفاصيل السجل
  const showLogDetails = (log: any) => {
    setSelectedLogDetails(log);
  };

  // أيقونة للعملية
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'update':
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'view':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // أيقونة للكيان
  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'letter':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'template':
        return <ClipboardList className="h-4 w-4 text-purple-500" />;
      case 'user':
        return <User className="h-4 w-4 text-orange-500" />;
      case 'system':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // تنسيق التاريخ
  const formatDate = (date: string) => {
    const momentDate = moment(date);
    return (
      <div className="flex flex-col">
        <span>{momentDate.format('YYYY/MM/DD HH:mm')}</span>
        <span className="text-xs text-gray-500">{momentDate.format('iYYYY/iMM/iDD')}</span>
      </div>
    );
  };

  // ترجمة نوع العملية
  const translateAction = (action: string): string => {
    switch (action) {
      case 'create': return 'إنشاء';
      case 'update': return 'تعديل';
      case 'delete': return 'حذف';
      case 'view': return 'عرض';
      default: return action;
    }
  };

  // ترجمة نوع الكيان
  const translateTarget = (target: string): string => {
    switch (target) {
      case 'letter': return 'خطاب';
      case 'template': return 'قالب';
      case 'user': return 'مستخدم';
      case 'system': return 'نظام';
      default: return target;
    }
  };

  // إذا لم يكن المستخدم مديراً
  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-lg shadow text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p className="max-w-md mx-auto">هذه الصفحة مخصصة للمدراء فقط. يرجى التواصل مع مدير النظام إذا كنت تعتقد أن هذه رسالة خطأ.</p>
      </div>
    );
  }

  return (
    <div>
      {/* نافذة تفاصيل السجل */}
      {selectedLogDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-auto p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-3xl w-full p-6">
            <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-4">
              <div className="flex items-center gap-3">
                {getActionIcon(selectedLogDetails.action_type)}
                <h3 className="text-xl font-bold">تفاصيل سجل الأحداث</h3>
              </div>
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ملخص</p>
                <p className="font-medium">{selectedLogDetails.summary}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تاريخ الحدث</p>
                <p className="font-medium">
                  {moment(selectedLogDetails.performed_at).format('YYYY/MM/DD HH:mm')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {moment(selectedLogDetails.performed_at).format('iYYYY/iMM/iDD')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المستخدم</p>
                <p className="font-medium">{selectedLogDetails.user_name || 'غير معروف'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedLogDetails.user_role === 'admin' 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                    : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}>
                  {selectedLogDetails.user_role === 'admin' ? 'مدير' : 'مستخدم'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">نوع العملية</p>
                <div className="flex items-center gap-2">
                  {getActionIcon(selectedLogDetails.action_type)}
                  <p className="font-medium">{translateAction(selectedLogDetails.action_type)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">نوع الكيان</p>
                <div className="flex items-center gap-2">
                  {getTargetIcon(selectedLogDetails.target_type)}
                  <p className="font-medium">{translateTarget(selectedLogDetails.target_type)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">معرّف الكيان</p>
                <p className="font-mono text-sm">{selectedLogDetails.target_id}</p>
              </div>
            </div>
            
            {/* عرض تفاصيل التغييرات إذا وجدت */}
            {selectedLogDetails.details && (
              <div className="mt-4 border rounded-lg dark:border-gray-700">
                <div className="border-b dark:border-gray-700 p-3 font-medium">
                  تفاصيل التغييرات
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 overflow-auto max-h-96 rounded-b-lg">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedLogDetails.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">سجلات الأحداث</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            سجل كامل للعمليات التي تمت على النظام
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في السجلات..."
              className="pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg w-60"
            />
          </div>
          
          <button 
            className="px-3 py-2 border dark:border-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm">فلترة</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="تحديث"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* أدوات الفلترة */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">نوع العملية</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="all">الجميع</option>
                <option value="create">إنشاء</option>
                <option value="update">تعديل</option>
                <option value="delete">حذف</option>
                <option value="view">عرض</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">نوع الكيان</label>
              <select
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value)}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="all">الجميع</option>
                <option value="letter">الخطابات</option>
                <option value="template">القوالب</option>
                <option value="user">المستخدمين</option>
                <option value="system">النظام</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">من تاريخ</label>
              <input
                type="date"
                value={dateRange.start || ''}
                onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => {
                setFilterAction('all');
                setFilterTarget('all');
                setDateRange({start: null, end: null});
                setSearchQuery('');
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
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل السجلات...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 p-6 rounded-lg">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5" />
            خطأ في تحميل السجلات
          </h3>
          <p>حدث خطأ أثناء محاولة تحميل سجلات الأحداث. يرجى المحاولة مرة أخرى.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center border dark:border-gray-800">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">لا توجد سجلات</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {searchQuery || filterAction !== 'all' || filterTarget !== 'all' || dateRange.start || dateRange.end
              ? 'لا توجد سجلات مطابقة لمعايير البحث الحالية'
              : 'لم يتم تسجيل أي أحداث في النظام حتى الآن'}
          </p>
          
          {(searchQuery || filterAction !== 'all' || filterTarget !== 'all' || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setFilterAction('all');
                setFilterTarget('all');
                setDateRange({start: null, end: null});
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              إزالة الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-right">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">الحدث</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">النوع</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">المستخدم</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredLogs.map(log => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer"
                    onClick={() => showLogDetails(log)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getActionIcon(log.action_type)}
                        </div>
                        <div>
                          <p className="font-medium">{log.summary}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {getTargetIcon(log.target_type)}
                            <span className="mr-1">{translateTarget(log.target_type)}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.action_type === 'create' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : log.action_type === 'update'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : log.action_type === 'delete'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {translateAction(log.action_type)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span>{log.user_name || 'غير معروف'}</span>
                        {log.user_role && (
                          <span className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block w-fit ${
                            log.user_role === 'admin' 
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {log.user_role === 'admin' ? 'مدير' : 'مستخدم'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(log.performed_at)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); 
                          showLogDetails(log);
                        }}
                        className="text-primary hover:text-primary/80"
                      >
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* ترويسة الصفحات (يمكن إضافتها لاحقاً) */}
          {/* <div className="py-4 px-4 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              عرض {filteredLogs.length} من {logs.length} سجل
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">السابق</button>
              <button className="px-3 py-1 bg-primary/10 dark:bg-primary/30 text-primary rounded-lg text-sm">1</button>
              <button className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">التالي</button>
            </div>
          </div> */}
        </div>
      )}
    </div>
  );
}