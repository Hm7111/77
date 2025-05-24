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
  Calendar,
  MoreHorizontal,
  ChevronDown
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
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null);
  
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

  // Hide actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionsMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter and sort letters
  const filteredLetters = useMemo(() => {
    return letters.filter(letter => {
      // Status filter
      if (statusFilter !== 'all' && letter.status !== statusFilter) return false;
      
      // Search filter
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
      console.error('Error:', error);
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

  // Toggle actions menu for a specific letter
  function toggleActionsMenu(e: React.MouseEvent, letterId: string) {
    e.stopPropagation(); // Prevent parent click handlers
    setOpenActionsMenu(openActionsMenu === letterId ? null : letterId);
  }

  return (
    <div>
      {/* تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
            <p className="mb-6">هل أنت متأكد من رغبتك في حذف هذا الخطاب؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
              className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          
          <div className="relative">
            <button
              className="px-3 py-2 border dark:border-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
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
              <ChevronDown className="h-4 w-4 opacity-70" />
            </button>
            
            <div className="absolute left-0 mt-1 hidden z-10 bg-white dark:bg-gray-900 shadow-lg border dark:border-gray-700 rounded-lg w-56">
              <div className="p-3">
                <div className="mb-3">
                  <h4 className="text-xs font-medium mb-2 text-primary border-b pb-1">حالة الخطاب</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="status" 
                        className="mr-2 text-primary focus:ring-primary" 
                        checked={statusFilter === 'all'}
                        onChange={() => setStatusFilter('all')}
                      />
                      <span className="text-sm">الكل</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="status" 
                        className="mr-2 text-primary focus:ring-primary" 
                        checked={statusFilter === 'completed'}
                        onChange={() => setStatusFilter('completed')}
                      />
                      <span className="text-sm">مكتمل</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="status" 
                        className="mr-2 text-primary focus:ring-primary" 
                        checked={statusFilter === 'draft'}
                        onChange={() => setStatusFilter('draft')}
                      />
                      <span className="text-sm">مسودة</span>
                    </label>
                  </div>
                </div>
                
                <div className="mb-2">
                  <h4 className="text-xs font-medium mb-2 text-primary border-b pb-1">الترتيب</h4>
                  <select 
                    className="w-full text-sm p-2 border dark:border-gray-700 rounded focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء خطاب جديد</span>
          </button>
        </div>
      </div>

      {/* قائمة الخطابات */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">جارِ تحميل الخطابات...</p>
          </div>
        </div>
      ) : filteredLetters.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-10 text-center border dark:border-gray-800">
          <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5">
            <File className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-3">لا توجد خطابات</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {search || statusFilter !== 'all' ? 
              'لا توجد خطابات مطابقة لمعايير البحث الحالية' : 
              'لم تقم بإنشاء أي خطابات بعد. يمكنك البدء بإنشاء خطاب جديد الآن.'}
          </p>
          <button
            onClick={() => navigate('new')}
            className="bg-primary text-white px-5 py-2.5 rounded-lg inline-flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span>إنشاء خطاب جديد</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border dark:border-gray-800">
          {filteredLetters.map((letter) => (
            <div key={letter.id} 
              className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* معلومات الخطاب الرئيسية */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg font-mono text-sm">
                      {letter.number}/{letter.year}
                    </div>
                    
                    <span 
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        letter.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {letter.status === 'completed' ? 'مكتمل' : 'مسودة'}
                    </span>
                    
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(letter.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">
                    {letter.content.subject || '<بلا موضوع>'}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-x-6 text-sm">
                    <div className="text-gray-700 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400 ml-1">إلى:</span>
                      {letter.content.to || '<بلا جهة>'}
                    </div>
                    
                    <div className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 ml-1">القالب:</span>
                      {letter.letter_templates?.image_url ? (
                        <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                          <img src={letter.letter_templates.image_url} className="w-full h-full object-cover" alt="" />
                        </div>
                      ) : null}
                      <span>{letter.letter_templates?.name ?? 'غير محدد'}</span>
                    </div>
                  </div>
                </div>
                
                {/* أزرار الإجراءات */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <div className="flex items-center">
                    <button 
                      onClick={() => navigate(`view/${letter.id}`)}
                      className="px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                      title="عرض الخطاب"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">عرض</span>
                    </button>
                    
                    <button 
                      onClick={() => navigate(`edit/${letter.id}`)}
                      className="px-3 py-1.5 text-primary hover:text-primary/80 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                      title="تعديل الخطاب"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">تعديل</span>
                    </button>
                    
                    {/* قائمة المزيد من الإجراءات */}
                    <div className="relative">
                      <button
                        onClick={(e) => toggleActionsMenu(e, letter.id)}
                        className="px-2 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1 text-sm"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">المزيد</span>
                      </button>
                      
                      {openActionsMenu === letter.id && (
                        <div className="absolute left-0 mt-1 bg-white dark:bg-gray-900 shadow-lg border dark:border-gray-700 rounded-lg w-48 z-20 py-1">
                          <button 
                            onClick={() => handlePrint(letter)}
                            className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                          >
                            <Printer className="h-4 w-4" />
                            <span>طباعة الخطاب</span>
                          </button>
                          
                          <button 
                            onClick={() => handleExport(letter)}
                            className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>تصدير PDF</span>
                          </button>
                          
                          <button
                            onClick={() => handlePreviewHighQuality(letter)}
                            className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            <span>جودة عالية PDF</span>
                          </button>
                          
                          <div className="border-t dark:border-gray-700 my-1"></div>
                          
                          <button 
                            onClick={() => setShowDeleteConfirm(letter.id)}
                            className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash className="h-4 w-4" />
                            <span>حذف الخطاب</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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