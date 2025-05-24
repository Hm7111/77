import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  File, 
  Search, 
  Trash, 
  Edit, 
  Eye, 
  Download, 
  Printer, 
  Filter, 
  SortAsc, 
  SortDesc,
  FileText,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { exportLetterToPDF, printLetter } from '../../lib/letter-utils';
import { useToast } from '../../hooks/useToast';
import { HighQualityExportButton } from './HighQualityExportButton';
import { PDFExportDialog } from './PDFExportDialog';
import { Letter } from '../../types/database';

interface LetterListProps {}

export function LettersList({}: LetterListProps) {
  const navigate = useNavigate();
  const { dbUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'draft'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'number'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  
  const { data: letters = [], isLoading, refetch } = useQuery({
    queryKey: ['letters', dbUser?.id],
    queryFn: async () => {
      if (!dbUser?.id) return [];
      
      const { data, error } = await supabase
        .from('letters')
        .select('*, letter_templates(*)')
        .eq('user_id', dbUser.id)
        .order(sortField, { ascending: sortDirection === 'asc' });
      
      if (error) throw error;
      return data;
    },
    enabled: !!dbUser?.id
  });

  // تحسين: استخدام useMemo لفلترة الخطابات
  const filteredLetters = useMemo(() => {
    return letters.filter(letter => {
      // فلتر الحالة
      if (statusFilter !== 'all' && letter.status !== statusFilter) return false;
      
      // فلتر البحث
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          letter.content.subject?.toLowerCase().includes(searchLower) ||
          letter.content.to?.toLowerCase().includes(searchLower) ||
          letter.number.toString().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [letters, search, statusFilter]);

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('letters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الخطاب بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting letter:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الخطاب',
        type: 'error'
      });
    }
  }

  async function handleExport(letter: Letter) {
    try {
      await exportLetterToPDF(letter);
      toast({
        title: 'تم التصدير',
        description: 'تم تصدير الخطاب بنجاح إلى ملف PDF',
        type: 'success'
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تصدير الخطاب',
        type: 'error'
      });
    }
  }

  async function handlePrint(letter: Letter) {
    try {
      await printLetter(letter);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء طباعة الخطاب',
        type: 'error'
      });
    }
  }
  
  // إظهار معاينة PDF بجودة عالية
  function handlePreviewHighQuality(letter: Letter) {
    setPreviewLetter(letter);
  }

  return (
    <div>
      {/* تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
            <p className="mb-6">هل أنت متأكد من رغبتك في حذف هذا الخطاب؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded"
              >
                إلغاء
              </button>
              <button 
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">إدارة الخطابات</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {filteredLetters.length} خطاب {statusFilter !== 'all' ? 
              statusFilter === 'completed' ? '(مكتمل)' : '(مسودة)' : ''}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-grow md:flex-grow-0 md:min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث في الخطابات..."
              className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <div className="relative">
            <button
              className="px-3 py-2 border dark:border-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900"
              onClick={(e) => {
                const dropdown = e.currentTarget.nextElementSibling;
                dropdown?.classList.toggle('hidden');
                
                // إغلاق القائمة عند النقر خارجها
                const handleOutsideClick = (e: MouseEvent) => {
                  if (!e.currentTarget?.contains(e.target as Node)) {
                    dropdown?.classList.add('hidden');
                    document.removeEventListener('click', handleOutsideClick);
                  }
                };
                
                setTimeout(() => {
                  document.addEventListener('click', handleOutsideClick);
                }, 0);
              }}
            >
              <Filter className="h-4 w-4" />
              <span>فلترة</span>
            </button>
            
            <div className="absolute left-0 mt-1 hidden z-10 bg-white dark:bg-gray-900 shadow-lg border dark:border-gray-700 rounded-lg w-48">
              <div className="p-3">
                <div className="mb-2">
                  <h4 className="text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">حالة الخطاب</h4>
                  <div className="space-y-1">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="status" 
                        className="mr-2" 
                        checked={statusFilter === 'all'}
                        onChange={() => setStatusFilter('all')}
                      />
                      <span className="text-sm">الكل</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="status" 
                        className="mr-2" 
                        checked={statusFilter === 'completed'}
                        onChange={() => setStatusFilter('completed')}
                      />
                      <span className="text-sm">مكتمل</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="status" 
                        className="mr-2" 
                        checked={statusFilter === 'draft'}
                        onChange={() => setStatusFilter('draft')}
                      />
                      <span className="text-sm">مسودة</span>
                    </label>
                  </div>
                </div>
                
                <div className="mb-2">
                  <h4 className="text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">الترتيب</h4>
                  <select 
                    className="w-full text-sm p-2 border dark:border-gray-700 rounded"
                    value={`${sortField}-${sortDirection}`}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split('-');
                      setSortField(field as any);
                      setSortDirection(direction as any);
                    }}
                  >
                    <option value="created_at-desc">الأحدث أولاً</option>
                    <option value="created_at-asc">الأقدم أولاً</option>
                    <option value="number-desc">الرقم (تنازلي)</option>
                    <option value="number-asc">الرقم (تصاعدي)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => navigate('new')}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء خطاب جديد</span>
          </button>
        </div>
      </div>

      {/* قائمة الخطابات */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
        </div>
      ) : filteredLetters.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <File className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">لا توجد خطابات</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {search || statusFilter !== 'all' ? 
              'لا توجد خطابات مطابقة لمعايير البحث الحالية' : 
              'لم تقم بإنشاء أي خطابات بعد'}
          </p>
          <button
            onClick={() => navigate('new')}
            className="bg-primary text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء خطاب جديد</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden border dark:border-gray-800">
          {/* رأس الجدول */}
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 py-3">
            <div className="px-4 text-center font-medium text-primary flex items-center justify-center gap-1 cursor-pointer"
              onClick={() => {
                if (sortField === 'number') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('number');
                  setSortDirection('desc');
                }
              }}
            >
              <span>رقم الخطاب</span>
              {sortField === 'number' && (sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
            </div>

            <div className="px-4 text-center font-medium text-primary border-r dark:border-gray-700">
              الموضوع
            </div>

            <div className="px-4 text-center font-medium text-primary border-r dark:border-gray-700">
              الجهة
            </div>

            <div className="px-4 text-center font-medium text-primary border-r dark:border-gray-700">
              القالب
            </div>

            <div className="px-4 text-center font-medium text-primary border-r dark:border-gray-700">
              الحالة
            </div>

            <div className="px-4 text-center font-medium text-primary flex items-center justify-center gap-1 cursor-pointer border-r dark:border-gray-700"
              onClick={() => {
                if (sortField === 'created_at') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('created_at');
                  setSortDirection('desc');
                }
              }}
            >
              <span>التاريخ</span>
              {sortField === 'created_at' && (sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
            </div>

            <div className="px-4 text-center font-medium text-primary border-r dark:border-gray-700">
              الإجراءات
            </div>
          </div>
          
          {/* بيانات الخطابات */}
          <div>
            {filteredLetters.map((letter) => (
              <div key={letter.id} className="grid grid-cols-7 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b dark:border-gray-700 transition-colors">
                <div className="px-4 py-4 flex items-center justify-center border-r dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-mono text-center">
                    {letter.number}/{letter.year}
                  </div>
                </div>

                <div className="px-4 py-4 border-r dark:border-gray-700">
                  <div className="truncate max-w-[200px]" title={letter.content.subject}>
                    {letter.content.subject || '<بلا موضوع>'}
                  </div>
                </div>

                <div className="px-4 py-4 border-r dark:border-gray-700">
                  <div className="truncate max-w-[200px]" title={letter.content.to}>
                    {letter.content.to || '<بلا جهة>'}
                  </div>
                </div>

                <div className="px-4 py-4 border-r dark:border-gray-700">
                  <div className="truncate flex items-center gap-1.5">
                    {letter.letter_templates?.image_url ? (
                      <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                        <img src={letter.letter_templates.image_url} className="w-full h-full object-cover" alt="" />
                      </div>
                    ) : (
                      <FileText className="h-4 w-4 text-gray-400" />
                    )}
                    <span>{letter.letter_templates?.name ?? 'غير محدد'}</span>
                  </div>
                </div>

                <div className="px-4 py-4 flex items-center justify-center border-r dark:border-gray-700">
                  <span 
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      letter.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                  >
                    {letter.status === 'completed' ? 'مكتمل' : 'مسودة'}
                  </span>
                </div>

                <div className="px-4 py-4 border-r dark:border-gray-700 flex items-center">
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                      <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{new Date(letter.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4 flex items-center justify-center">
                  <div className="flex flex-wrap justify-center gap-0.5">
                    <button 
                      onClick={() => navigate(`view/${letter.id}`)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="عرض الخطاب"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    <button 
                      onClick={() => navigate(`edit/${letter.id}`)}
                      className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors"
                      title="تعديل الخطاب"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button 
                      onClick={() => handlePrint(letter)}
                      className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors"
                      title="طباعة الخطاب"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    
                    <button 
                      onClick={() => handleExport(letter)}
                      className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors"
                      title="تصدير PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handlePreviewHighQuality(letter)}
                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="تصدير PDF بجودة عالية"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    
                    <button 
                      onClick={() => setShowDeleteConfirm(letter.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="حذف الخطاب"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* معاينة PDF بجودة عالية */}
      {previewLetter && (
        <PDFExportDialog 
          letter={previewLetter}
          isOpen={true}
          onClose={() => setPreviewLetter(null)}
        />
      )}
    </div>
  );
}