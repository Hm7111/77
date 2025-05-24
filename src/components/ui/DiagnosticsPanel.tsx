import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Database, 
  Key, 
  Wifi, 
  ShieldAlert, 
  FileText, 
  Download, 
  Trash2, 
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { 
  getErrorLog, 
  clearErrorLog, 
  exportErrorLog, 
  ErrorType, 
  ErrorDetails 
} from '../../lib/diagnostics';

interface DiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * لوحة تشخيص الأخطاء
 * تعرض سجل الأخطاء وتوفر أدوات للتحليل والتصدير
 */
export function DiagnosticsPanel({ isOpen, onClose }: DiagnosticsPanelProps) {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null);
  const [filter, setFilter] = useState<ErrorType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // تحميل سجل الأخطاء
  useEffect(() => {
    if (isOpen) {
      loadErrors();
    }
  }, [isOpen]);
  
  // تحميل الأخطاء من السجل
  const loadErrors = () => {
    setIsLoading(true);
    try {
      // الحصول على الأخطاء من السجل المحلي
      const errorLog = getErrorLog();
      
      // الحصول على الأخطاء المخزنة في التخزين المحلي
      const storedErrors = JSON.parse(localStorage.getItem('error_log') || '[]');
      
      // دمج الأخطاء وترتيبها حسب التاريخ (الأحدث أولاً)
      const allErrors = [...errorLog, ...storedErrors]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // إزالة التكرارات
      const uniqueErrors = allErrors.filter((error, index, self) => 
        index === self.findIndex(e => e.message === error.message && e.timestamp === error.timestamp)
      );
      
      setErrors(uniqueErrors);
    } catch (error) {
      console.error('Error loading error log:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // تصفية الأخطاء حسب النوع والبحث
  const filteredErrors = errors.filter(error => {
    const matchesFilter = filter === 'all' || error.type === filter;
    const matchesSearch = !searchTerm || 
      error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (error.code && error.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });
  
  // مسح سجل الأخطاء
  const handleClearLog = () => {
    if (confirm('هل أنت متأكد من رغبتك في مسح سجل الأخطاء؟')) {
      clearErrorLog();
      setErrors([]);
      setSelectedError(null);
    }
  };
  
  // تصدير سجل الأخطاء
  const handleExportLog = () => {
    const url = exportErrorLog();
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // الحصول على أيقونة نوع الخطأ
  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.DATABASE:
        return <Database className="h-5 w-5 text-blue-500" />;
      case ErrorType.AUTHENTICATION:
        return <Key className="h-5 w-5 text-purple-500" />;
      case ErrorType.NETWORK:
        return <Wifi className="h-5 w-5 text-red-500" />;
      case ErrorType.PERMISSION:
        return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
      case ErrorType.WORKFLOW:
        return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // الحصول على تسمية نوع الخطأ بالعربية
  const getErrorTypeLabel = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.DATABASE:
        return 'قاعدة البيانات';
      case ErrorType.AUTHENTICATION:
        return 'المصادقة';
      case ErrorType.NETWORK:
        return 'الشبكة';
      case ErrorType.VALIDATION:
        return 'التحقق من الصحة';
      case ErrorType.PERMISSION:
        return 'الصلاحيات';
      case ErrorType.WORKFLOW:
        return 'سير العمل';
      default:
        return 'غير معروف';
    }
  };
  
  // تنسيق التاريخ
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-hidden">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* رأس اللوحة */}
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold">لوحة تشخيص الأخطاء</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* أدوات التصفية والبحث */}
        <div className="p-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث في الأخطاء..."
                  className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ErrorType | 'all')}
                className="p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">جميع الأنواع</option>
                <option value={ErrorType.DATABASE}>قاعدة البيانات</option>
                <option value={ErrorType.AUTHENTICATION}>المصادقة</option>
                <option value={ErrorType.NETWORK}>الشبكة</option>
                <option value={ErrorType.VALIDATION}>التحقق من الصحة</option>
                <option value={ErrorType.PERMISSION}>الصلاحيات</option>
                <option value={ErrorType.WORKFLOW}>سير العمل</option>
                <option value={ErrorType.UNKNOWN}>غير معروف</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={loadErrors}
                className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 border dark:border-gray-700 rounded-lg"
                title="تحديث"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleExportLog}
                className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border dark:border-gray-700 rounded-lg"
                title="تصدير السجل"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={handleClearLog}
                className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border dark:border-gray-700 rounded-lg"
                title="مسح السجل"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* محتوى اللوحة */}
        <div className="flex flex-1 overflow-hidden">
          {/* قائمة الأخطاء */}
          <div className="w-1/3 border-l dark:border-gray-800 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
              </div>
            ) : filteredErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد أخطاء</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs">
                  {filter !== 'all' || searchTerm
                    ? 'لا توجد أخطاء تطابق معايير البحث الحالية'
                    : 'لم يتم تسجيل أي أخطاء حتى الآن'}
                </p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800">
                {filteredErrors.map((error, index) => (
                  <div
                    key={index}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      selectedError === error ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                    onClick={() => setSelectedError(error)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getErrorIcon(error.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium truncate">
                            {error.message}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            error.type === ErrorType.DATABASE ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            error.type === ErrorType.AUTHENTICATION ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                            error.type === ErrorType.NETWORK ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            error.type === ErrorType.PERMISSION ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            error.type === ErrorType.WORKFLOW ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {getErrorTypeLabel(error.type)}
                          </span>
                        </div>
                        {error.code && (
                          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded inline-block mb-1">
                            {error.code}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(error.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* تفاصيل الخطأ */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedError ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {getErrorIcon(selectedError.type)}
                    <span>{selectedError.message}</span>
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedError.type === ErrorType.DATABASE ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      selectedError.type === ErrorType.AUTHENTICATION ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                      selectedError.type === ErrorType.NETWORK ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      selectedError.type === ErrorType.PERMISSION ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      selectedError.type === ErrorType.WORKFLOW ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {getErrorTypeLabel(selectedError.type)}
                    </span>
                    {selectedError.code && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
                        {selectedError.code}
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {formatDate(selectedError.timestamp)}
                    </span>
                  </div>
                </div>
                
                {/* اقتراحات الحل */}
                {selectedError.suggestions && selectedError.suggestions.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">اقتراحات للحل:</h4>
                    <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300">
                      {selectedError.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* معلومات السياق */}
                <div>
                  <h4 className="font-semibold mb-2">معلومات السياق:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المسار</p>
                      <p className="font-medium">{selectedError.path || 'غير متاح'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">معرف المستخدم</p>
                      <p className="font-medium">{selectedError.userId || 'غير متاح'}</p>
                    </div>
                    {selectedError.context && Object.entries(selectedError.context).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{key}</p>
                        <p className="font-medium">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* تفاصيل الخطأ الأصلي */}
                {selectedError.originalError && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">تفاصيل الخطأ الأصلي:</h4>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-60">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(selectedError.originalError, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                  <AlertCircle className="h-10 w-10 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">اختر خطأ لعرض تفاصيله</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  اختر خطأ من القائمة على اليمين لعرض تفاصيله واقتراحات الحل
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}