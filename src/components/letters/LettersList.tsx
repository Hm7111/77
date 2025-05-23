import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Trash2, Edit2, Eye, RefreshCw, WifiOff,
  Calendar, CheckSquare, Filter, Clock, FileText
} from 'lucide-react'
import { useLetters } from '../../hooks/useLetters'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import moment from 'moment-hijri'
import { Letter } from '../../types/database'
import { ExportOptionsDialog } from './ExportOptionsDialog'
import { exportToPDF } from '../../lib/pdf-export'

interface Filters {
  status: 'all' | 'draft' | 'completed';
  date: 'all' | 'today' | 'week' | 'month' | 'year';
  search: string;
  category?: string;
}

interface SortOption {
  field: 'created_at' | 'number' | 'subject';
  direction: 'asc' | 'desc';
}

export function LettersList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectionError, setConnectionError] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null)
  
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    date: 'all',
    search: ''
  })
  
  const [sort, setSort] = useState<SortOption>({
    field: 'created_at',
    direction: 'desc'
  })
  
  const { letters, isLoading, isOffline } = useLetters()
  
  // حفظ معايير التصفية والفرز في التخزين المحلي
  useEffect(() => {
    const savedFilters = localStorage.getItem('letterFilters')
    const savedSort = localStorage.getItem('letterSort')
    
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters))
      } catch (e) {
        console.error('Error parsing saved filters:', e)
      }
    }
    
    if (savedSort) {
      try {
        setSort(JSON.parse(savedSort))
      } catch (e) {
        console.error('Error parsing saved sort:', e)
      }
    }
    
    return () => {
      localStorage.setItem('letterFilters', JSON.stringify(filters))
      localStorage.setItem('letterSort', JSON.stringify(sort))
    }
  }, [])

  // حفظ التغييرات في معايير التصفية والفرز
  useEffect(() => {
    localStorage.setItem('letterFilters', JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    localStorage.setItem('letterSort', JSON.stringify(sort))
  }, [sort])

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['letters'] })
      setConnectionError(false)
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث البيانات بنجاح',
        type: 'success'
      })
    } catch (error) {
      console.error('Error refreshing data:', error)
      setConnectionError(true)
      toast({
        title: 'خطأ',
        description: 'فشل الاتصال بالخادم',
        type: 'error'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('letters')
        .delete()
        .eq('id', id)

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['letters'] })
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الخطاب بنجاح',
        type: 'success'
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الخطاب',
        type: 'error'
      })
    } finally {
      setShowDeleteConfirm(null)
    }
  }

  // معالجة خيارات التصدير
  function handleExportClick(letter: Letter) {
    setSelectedLetter(letter);
    setShowExportOptions(true);
  }

  async function handleExportOptionsConfirm(options: {withTemplate: boolean, action: 'print' | 'export'}) {
    setShowExportOptions(false);
    
    if (!selectedLetter) return;
    
    if (options.action === 'print') {
      // سيتم تنفيذها في مكون آخر
    } else {
      try {
        toast({
          title: 'جارِ التصدير بجودة عالية...',
          description: 'يتم إنشاء PDF بجودة طباعة متميزة',
          type: 'info'
        });
        
        await exportToPDF(selectedLetter, {
          filename: `خطاب-${selectedLetter.number || '0'}-${selectedLetter.year || new Date().getFullYear()}.pdf`,
          withTemplate: options.withTemplate,
          scale: 4.0, // زيادة الدقة للحصول على أعلى جودة
          quality: 0.99 // أعلى جودة ممكنة
        });
        
        toast({
          title: 'تم التصدير',
          description: 'تم تصدير الخطاب بجودة عالية متميزة',
          type: 'success'
        });
      } catch (error) {
        console.error('Error exporting PDF:', error);
        
        toast({
          title: 'خطأ',
          description: error instanceof Error ? error.message : 'حدث خطأ أثناء تصدير الملف',
          type: 'error'
        });
      }
    }
  }
  
  // استخراج الفئات المتاحة من الخطابات
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    
    letters?.forEach(letter => {
      const category = letter.content?.category
      if (category) categories.add(category)
    })
    
    return Array.from(categories).sort()
  }, [letters])

  // تطبيق التصفية والفرز
  const filteredLetters = useMemo(() => {
    if (!letters) return []
    
    return letters
      .filter(letter => {
        // تطبيق البحث
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch = !searchTerm ||
          letter.number?.toString().includes(searchTerm) ||
          (letter.content?.subject || '').toLowerCase().includes(searchTerm) ||
          (letter.content?.to || '').toLowerCase().includes(searchTerm) ||
          (letter.creator_name || '').toLowerCase().includes(searchTerm)
        
        // تطبيق تصفية الحالة
        const matchesStatus = filters.status === 'all' || letter.status === filters.status
        
        // تطبيق تصفية التاريخ
        const date = new Date(letter.created_at)
        const now = new Date()
        
        let matchesDate = true
        switch (filters.date) {
          case 'today':
            matchesDate = date.toDateString() === now.toDateString()
            break
          case 'week': {
            const weekAgo = new Date()
            weekAgo.setDate(now.getDate() - 7)
            matchesDate = date >= weekAgo
            break
          }
          case 'month': {
            const monthAgo = new Date()
            monthAgo.setMonth(now.getMonth() - 1)
            matchesDate = date >= monthAgo
            break
          }
          case 'year': {
            const yearAgo = new Date()
            yearAgo.setFullYear(now.getFullYear() - 1)
            matchesDate = date >= yearAgo
            break
          }
        }
        
        // تطبيق تصفية الفئة
        const matchesCategory = !filters.category || letter.content?.category === filters.category
        
        return matchesSearch && matchesStatus && matchesDate && matchesCategory
      })
      .sort((a, b) => {
        const direction = sort.direction === 'asc' ? 1 : -1
        
        if (sort.field === 'number') {
          return ((a.number || 0) - (b.number || 0)) * direction
        }
        
        if (sort.field === 'subject') {
          return ((a.content?.subject || '').localeCompare(b.content?.subject || '')) * direction
        }
        
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction
      })
  }, [letters, filters, sort])

  return (
    <div>
      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">
              هل أنت متأكد من رغبتك في حذف هذا الخطاب؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-800 bg-gray-100 hover:bg-gray-200 rounded"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة خيارات التصدير */}
      {showExportOptions && selectedLetter && (
        <ExportOptionsDialog
          isOpen={true}
          letter={selectedLetter}
          onClose={() => setShowExportOptions(false)}
          onConfirm={handleExportOptionsConfirm}
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة الخطابات</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {filteredLetters.length} خطاب
            {filters.status !== 'all' && ` (${filters.status === 'completed' ? 'مكتمل' : 'مسودة'})`}
            {filters.date !== 'all' && ` - ${
              filters.date === 'today' ? 'اليوم' :
              filters.date === 'week' ? 'هذا الأسبوع' :
              filters.date === 'month' ? 'هذا الشهر' : 'هذا العام'
            }`}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="بحث..."
              className="w-full sm:w-52 pl-3 pr-10 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
          </div>
          
          {/* زر الفلترة */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`p-2 rounded-lg ${
                filters.status !== 'all' || filters.date !== 'all' || filters.category
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="فلترة"
            >
              <Filter className="h-5 w-5" />
            </button>
            
            {showFilterMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-3 w-64 z-20">
                <div className="space-y-3">
                  <p className="font-medium text-sm">فلترة الخطابات</p>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">الحالة</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.status === 'all'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        الكل
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, status: 'completed' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        مكتمل
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, status: 'draft' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.status === 'draft'
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        مسودة
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">التاريخ</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, date: 'all' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.date === 'all'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        الكل
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, date: 'today' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.date === 'today'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        اليوم
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, date: 'week' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.date === 'week'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        الأسبوع
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, date: 'month' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.date === 'month'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        الشهر
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, date: 'year' }))}
                        className={`px-3 py-1 text-xs rounded ${
                          filters.date === 'year'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        السنة
                      </button>
                    </div>
                  </div>
                  
                  {availableCategories.length > 0 && (
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">التصنيف</label>
                      <select
                        value={filters.category || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          category: e.target.value || undefined
                        }))}
                        className="w-full p-2 text-sm border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      >
                        <option value="">الكل</option>
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="pt-2 flex justify-between">
                    <button
                      onClick={() => {
                        setFilters({
                          status: 'all',
                          date: 'all',
                          search: '',
                          category: undefined
                        })
                        setShowFilterMenu(false)
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      إعادة ضبط
                    </button>
                    <button
                      onClick={() => setShowFilterMenu(false)}
                      className="px-3 py-1 text-xs bg-primary text-white rounded"
                    >
                      تطبيق
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg transition-colors ${
              connectionError 
                ? 'bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/70' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600'
            }`}
            title={connectionError ? 'فشل الاتصال - انقر للمحاولة مرة أخرى' : 'تحديث'}
          >
            {connectionError ? (
              <WifiOff className="h-5 w-5" />
            ) : (
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            )}
          </button>
          
          <button
            onClick={() => navigate('new')}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء خطاب جديد</span>
          </button>
        </div>
      </div>

      {/* قائمة الخطابات */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
            <p className="text-gray-500">جاري تحميل الخطابات...</p>
          </div>
        </div>
      ) : isOffline ? (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-8 rounded-lg text-center">
          <WifiOff className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">لا يوجد اتصال بالإنترنت</h3>
          <p className="mb-6">لا يمكن تحميل الخطابات في الوقت الحالي. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      ) : filteredLetters.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg py-12 px-4 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          
          <h3 className="text-xl font-bold mb-2">
            {filters.search || filters.status !== 'all' || filters.date !== 'all' || filters.category
              ? 'لا توجد خطابات مطابقة للفلتر'
              : 'لا توجد خطابات حتى الآن'}
          </h3>
          
          {filters.search || filters.status !== 'all' || filters.date !== 'all' || filters.category ? (
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              جرب تغيير معايير البحث أو إعادة ضبط الفلتر لعرض المزيد من النتائج.
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              لم تقم بإنشاء أي خطابات بعد. انقر على "إنشاء خطاب جديد" لإنشاء أول خطاب لك.
            </p>
          )}
          
          {(filters.search || filters.status !== 'all' || filters.date !== 'all' || filters.category) && (
            <button
              onClick={() => setFilters({ status: 'all', date: 'all', search: '', category: undefined })}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 mr-2"
            >
              إعادة ضبط الفلتر
            </button>
          )}
          
          <button
            onClick={() => navigate('new')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            إنشاء خطاب جديد
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow border dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => setSort({
                      field: 'number',
                      direction: sort.field === 'number' && sort.direction === 'desc' ? 'asc' : 'desc'
                    })}
                    title="انقر للترتيب"
                  >
                    <div className="flex items-center gap-1 justify-start">
                      <span>رقم الخطاب</span>
                      {sort.field === 'number' && (
                        sort.direction === 'asc' 
                          ? <span>▲</span>
                          : <span>▼</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => setSort({
                      field: 'subject',
                      direction: sort.field === 'subject' && sort.direction === 'desc' ? 'asc' : 'desc'
                    })}
                    title="انقر للترتيب"
                  >
                    <div className="flex items-center gap-1 justify-start">
                      <span>الموضوع</span>
                      {sort.field === 'subject' && (
                        sort.direction === 'asc' 
                          ? <span>▲</span>
                          : <span>▼</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">صادر إلى</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">محرر الخطاب</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">القالب</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => setSort({
                      field: 'created_at',
                      direction: sort.field === 'created_at' && sort.direction === 'desc' ? 'asc' : 'desc'
                    })}
                    title="انقر للترتيب"
                  >
                    <div className="flex items-center gap-1 justify-start">
                      <span>تاريخ الإنشاء</span>
                      {sort.field === 'created_at' && (
                        sort.direction === 'asc' 
                          ? <span>▲</span>
                          : <span>▼</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredLetters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                      <div className="font-mono text-sm">
                        {letter.number ?? '-'}/{letter.year ?? '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm max-w-[200px]">
                      <p className="truncate" title={letter.content?.subject}>
                        {letter.content?.subject ?? '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm max-w-[200px]">
                      <p className="truncate" title={letter.content?.to}>
                        {letter.content?.to ?? '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                      {letter.creator_name ?? '-'}
                    </td>
                    <td className="px-4 py-4 text-sm max-w-[150px]">
                      <p className="truncate" title={letter.letter_templates?.name}>
                        {letter.letter_templates?.name ?? 'غير محدد'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        letter.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                      }`}>
                        {letter.status === 'completed' ? 'مكتمل' : 'مسودة'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap" title={new Date(letter.created_at).toLocaleString('ar')}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{moment(letter.created_at).format('iDD/iMM/iYYYY')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-x-1">
                        <button
                          onClick={() => navigate(`view/${letter.id}`)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                          title="معاينة"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => navigate(`edit/${letter.id}`)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleExportClick(letter)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="تصدير PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => setShowDeleteConfirm(letter.id)}
                          className="p-1.5 text-gray-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}