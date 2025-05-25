import { useState } from 'react';
import { Plus, Search, Filter, SortAsc, SortDesc, List, LayoutGrid, Clock, ClipboardList, User, Building, Flag, X, AlertCircle as CircleAlert, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTaskList } from '../hooks/useTaskList';
import { useTaskActions } from '../hooks/useTaskActions';
import { TaskCard } from './TaskCard';
import { useAuth } from '../../../lib/auth';
import { TaskFilters, TaskStatus } from '../types';
import { BranchSelector } from '../../../components/branches/BranchSelector';
import { EmptyState } from '../../../components/ui/EmptyState';
import { UserSelector } from './UserSelector';

/**
 * قائمة المهام
 */
export function TasksList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'created_at' | 'priority' | 'due_date'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const { 
    tasks, 
    isLoading, 
    error, 
    taskSummary, 
    isSummaryLoading, 
    filters, 
    updateFilters, 
    resetFilters, 
    refetchTasks 
  } = useTaskList();
  
  const {
    updateTaskStatus,
    loading
  } = useTaskActions();

  // فتح صفحة إنشاء مهمة جديدة
  const handleCreateTask = () => {
    navigate('/admin/tasks/new');
  };
  
  // تحديث حالة المهمة
  const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
    updateTaskStatus({ id: taskId, status });
  };
  
  // تبديل وضع العرض
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };
  
  // تغيير ترتيب النتائج
  const handleSortChange = (field: 'created_at' | 'priority' | 'due_date') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // ترتيب المهام حسب الفرز المحدد
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortField === 'priority') {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const compare = priorityOrder[a.priority] - priorityOrder[b.priority];
      return sortDirection === 'asc' ? compare : -compare;
    } else if (sortField === 'due_date') {
      // إذا لم يتم تحديد تاريخ استحقاق، نضع المهمة في النهاية
      if (!a.due_date) return sortDirection === 'asc' ? -1 : 1;
      if (!b.due_date) return sortDirection === 'asc' ? 1 : -1;
      
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      // الترتيب الافتراضي حسب تاريخ الإنشاء
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });

  return (
    <div>
      {/* أزرار الإجراءات والبحث */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة المهام</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSummaryLoading ? 'جارِ التحميل...' : `${taskSummary.total} مهمة`}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-grow md:flex-grow-0 md:min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="بحث في المهام..."
              className="w-full pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 border dark:border-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="فلترة"
          >
            <Filter className="h-5 w-5 text-gray-500" />
          </button>
          
          <button
            onClick={toggleViewMode}
            className="p-2.5 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            title={viewMode === 'grid' ? 'عرض قائمة' : 'عرض شبكة'}
          >
            {viewMode === 'grid' ? (
              <List className="h-5 w-5" />
            ) : (
              <LayoutGrid className="h-5 w-5" />
            )}
          </button>
          
          <button
            onClick={handleCreateTask}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            إضافة مهمة جديدة
          </button>
        </div>
      </div>
      
      {/* ملخص المهام */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'all' ? 'bg-primary/5 border-primary' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'all' })}
          >
            <ClipboardList className="h-6 w-6 mb-2 text-primary" />
            <span className="text-sm font-medium">الكل</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.total}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'new' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'new' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </span>
            <span className="text-sm font-medium">جديدة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.new}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'in_progress' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'in_progress' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <CircleAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
            </span>
            <span className="text-sm font-medium">قيد التنفيذ</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.inProgress}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'completed' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
            </span>
            <span className="text-sm font-medium">مكتملة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.completed}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.status === 'postponed' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ status: 'postponed' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Pause className="h-4 w-4 text-purple-600 dark:text-purple-300" />
            </span>
            <span className="text-sm font-medium">مؤجلة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.postponed}</span>
          </button>
        </div>
        
        <div className={`p-4 rounded-lg border dark:border-gray-700 ${
          filters.timeframe === 'overdue' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-gray-800'
        }`}>
          <button 
            className="w-full h-full flex flex-col items-center justify-center text-center"
            onClick={() => updateFilters({ timeframe: filters.timeframe === 'overdue' ? 'all' : 'overdue' })}
          >
            <span className="h-6 w-6 mb-2 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Clock className="h-4 w-4 text-red-600 dark:text-red-300" />
            </span>
            <span className="text-sm font-medium">متأخرة</span>
            <span className="text-2xl font-bold mt-1">{taskSummary.overdue}</span>
          </button>
        </div>
      </div>

      {/* أدوات الفلترة */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الأولوية</label>
              <select
                value={filters.priority || 'all'}
                onChange={(e) => updateFilters({ priority: e.target.value === 'all' ? 'all' : e.target.value as TaskPriority })}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">جميع الأولويات</option>
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="low">منخفضة</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الموظف</label>
              <UserSelector
                value={filters.assigned_to || ''}
                onChange={(userId) => updateFilters({ assigned_to: userId })}
                placeholder="جميع الموظفين"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الفرع</label>
              <BranchSelector
                value={filters.branch_id}
                onChange={(branchId) => updateFilters({ branch_id: branchId })}
                showAll
                placeholder="جميع الفروع"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الإطار الزمني</label>
              <select
                value={filters.timeframe || 'all'}
                onChange={(e) => updateFilters({ timeframe: e.target.value as any })}
                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">كل الفترات</option>
                <option value="today">اليوم</option>
                <option value="week">هذا الأسبوع</option>
                <option value="month">هذا الشهر</option>
                <option value="overdue">متأخرة</option>
              </select>
            </div>
            
            <div className="md:col-span-2 flex items-end gap-2">
              <button
                onClick={() => resetFilters()}
                className="px-4 py-2 text-sm border dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                إعادة ضبط
              </button>
              
              <button
                onClick={() => refetchTasks()}
                className="px-4 py-2 text-sm border dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث
              </button>
            </div>
          </div>
          
          {/* فلاتر مطبقة */}
          {(filters.status !== 'all' || filters.priority !== 'all' || filters.assigned_to || filters.branch_id || filters.timeframe !== 'all' || filters.search) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">الفلاتر المطبقة:</span>
              
              {filters.status !== 'all' && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {filters.status === 'new' ? 'جديدة' : 
                   filters.status === 'in_progress' ? 'قيد التنفيذ' : 
                   filters.status === 'completed' ? 'مكتملة' : 
                   filters.status === 'rejected' ? 'مرفوضة' : 'مؤجلة'}
                  <X 
                    className="h-3 w-3 cursor-pointer mr-1 hover:text-blue-600"
                    onClick={() => updateFilters({ status: 'all' })}
                  />
                </span>
              )}
              
              {filters.priority !== 'all' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-3 py-1 rounded-full flex items-center gap-1">
                  <Flag className="h-3 w-3" />
                  {filters.priority === 'high' ? 'عالية' : 
                   filters.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                  <X 
                    className="h-3 w-3 cursor-pointer mr-1 hover:text-yellow-600"
                    onClick={() => updateFilters({ priority: 'all' })}
                  />
                </span>
              )}
              
              {filters.assigned_to && (
                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1 rounded-full flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {tasks.find(t => t.assignee?.id === filters.assigned_to)?.assignee?.full_name || 'موظف محدد'}
                  <X 
                    className="h-3 w-3 cursor-pointer mr-1 hover:text-purple-600"
                    onClick={() => updateFilters({ assigned_to: null })}
                  />
                </span>
              )}
              
              {filters.branch_id && (
                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {tasks.find(t => t.branch?.id === filters.branch_id)?.branch?.name || 'فرع محدد'}
                  <X 
                    className="h-3 w-3 cursor-pointer mr-1 hover:text-green-600"
                    onClick={() => updateFilters({ branch_id: null })}
                  />
                </span>
              )}
              
              {filters.timeframe !== 'all' && (
                <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-3 py-1 rounded-full flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {filters.timeframe === 'today' ? 'اليوم' : 
                   filters.timeframe === 'week' ? 'هذا الأسبوع' : 
                   filters.timeframe === 'month' ? 'هذا الشهر' : 'متأخرة'}
                  <X 
                    className="h-3 w-3 cursor-pointer mr-1 hover:text-orange-600"
                    onClick={() => updateFilters({ timeframe: 'all' })}
                  />
                </span>
              )}
              
              {filters.search && (
                <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-3 py-1 rounded-full flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  {filters.search}
                  <X 
                    className="h-3 w-3 cursor-pointer mr-1 hover:text-gray-600"
                    onClick={() => updateFilters({ search: '' })}
                  />
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* أزرار الفرز */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {sortedTasks.length} {sortedTasks.length === 1 ? 'مهمة' : 'مهام'}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">ترتيب حسب:</span>
          <button
            onClick={() => handleSortChange('created_at')}
            className={`text-sm py-1 px-3 rounded-lg flex items-center gap-1 ${
              sortField === 'created_at' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            التاريخ
            {sortField === 'created_at' && (
              sortDirection === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />
            )}
          </button>
          
          <button
            onClick={() => handleSortChange('priority')}
            className={`text-sm py-1 px-3 rounded-lg flex items-center gap-1 ${
              sortField === 'priority' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            الأولوية
            {sortField === 'priority' && (
              sortDirection === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />
            )}
          </button>
          
          <button
            onClick={() => handleSortChange('due_date')}
            className={`text-sm py-1 px-3 rounded-lg flex items-center gap-1 ${
              sortField === 'due_date' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            تاريخ الاستحقاق
            {sortField === 'due_date' && (
              sortDirection === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* عرض المهام */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-900/30 rounded-lg p-6 text-center text-red-700 dark:text-red-400">
          <CircleAlert className="h-10 w-10 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">خطأ في تحميل المهام</h3>
          <p className="mb-4">حدث خطأ أثناء محاولة تحميل المهام. يرجى المحاولة مرة أخرى.</p>
          <button
            onClick={() => refetchTasks()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      ) : sortedTasks.length === 0 ? (
        <EmptyState
          title="لا توجد مهام"
          description={
            filters.status !== 'all' || filters.priority !== 'all' || filters.assigned_to || filters.branch_id || filters.timeframe !== 'all' || filters.search
              ? 'لا توجد مهام تطابق معايير البحث الحالية'
              : 'لا توجد مهام متاحة حاليًا. ابدأ بإنشاء مهمة جديدة.'
          }
          icon={<ClipboardList className="h-12 w-12" />}
          action={{
            label: 'إنشاء مهمة جديدة',
            onClick: handleCreateTask,
            icon: <Plus className="h-4 w-4" />
          }}
          secondaryAction={
            filters.status !== 'all' || filters.priority !== 'all' || filters.assigned_to || filters.branch_id || filters.timeframe !== 'all' || filters.search
              ? {
                  label: 'إعادة ضبط الفلاتر',
                  onClick: resetFilters
                }
              : undefined
          }
        />
      ) : (
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
          }
        `}>
          {sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateStatus={handleUpdateStatus}
              isStatusLoading={loading[`status_${task.id}`]}
            />
          ))}
        </div>
      )}
    </div>
  );
}