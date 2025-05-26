import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Search, 
  Clock, 
  Calendar, 
  PlusCircle, 
  BarChartHorizontal, 
  CheckCircle, 
  UserCircle, 
  Bell,
  Sparkles,
  BookOpen,
  Rocket,
  LayoutDashboard,
  ActivitySquare,
  Building,
  ArrowRight,
  CheckSquare,
  ClipboardCheck,
  FileCheck,
  ListTodo
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { motion } from 'framer-motion';
import moment from 'moment-hijri';
import { BranchSelector } from '../../components/branches/BranchSelector';
import { useToast } from '../../hooks/useToast';

export function Dashboard() {
  const navigate = useNavigate();
  const { dbUser } = useAuth();
  const { toast } = useToast();
  
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [greeting, setGreeting] = useState<string>('مرحباً');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  
  // حساب التحية بناءً على الوقت الحالي
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('صباح الخير');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('مساء الخير');
    } else if (hour >= 17 && hour < 20) {
      setGreeting('مساء الخير');
    } else {
      setGreeting('مساء الخير');
    }
    
    // تحميل الإشعارات (محاكاة)
    setNotifications([
      {
        id: 1,
        title: 'طلب موافقة جديد',
        description: 'تم استلام طلب موافقة على الخطاب رقم 15/2025',
        time: '1 دقيقة',
        read: false,
        type: 'success'
      },
      {
        id: 2,
        title: 'تذكير بمهمة',
        description: 'لديك مهمة بعنوان "مراجعة مسودات الخطابات" مستحقة اليوم',
        time: '3 ساعات',
        read: true,
        type: 'info'
      }
    ]);
  }, []);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['letters-stats', period, dbUser?.id, selectedBranch],
    enabled: !!dbUser?.id,
    queryFn: async () => {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      let query = supabase.from('letters').select('*', { count: 'exact', head: true });
      
      // فلترة حسب الفرع إذا كان محدداً
      if (selectedBranch) {
        // تعديل الاستعلام للحصول على المستخدمين في الفرع المحدد
        const { data: branchUsers } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', selectedBranch);
          
        if (branchUsers && branchUsers.length > 0) {
          const userIds = branchUsers.map(user => user.id);
          query = query.in('user_id', userIds);
        }
      } else {
        // إذا كان المستخدم مديراً، اعرض جميع الخطابات، وإلا اعرض خطابات المستخدم فقط
        if (dbUser?.role !== 'admin') {
          query = query.eq('user_id', dbUser?.id);
        }
      }
      
      const { count: total, error: totalError } = await query;
      if (totalError) throw totalError;

      let recentQuery = supabase.from('letters').select('*', { count: 'exact', head: true });
      
      if (selectedBranch) {
        // تعديل الاستعلام للحصول على المستخدمين في الفرع المحدد
        const { data: branchUsers } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', selectedBranch);
          
        if (branchUsers && branchUsers.length > 0) {
          const userIds = branchUsers.map(user => user.id);
          recentQuery = recentQuery.in('user_id', userIds);
        }
      } else {
        // إذا كان المستخدم مديراً، اعرض جميع الخطابات، وإلا اعرض خطابات المستخدم فقط
        if (dbUser?.role !== 'admin') {
          recentQuery = recentQuery.eq('user_id', dbUser?.id);
        }
      }
      
      const { count: recent, error: recentError } = await recentQuery.gte('created_at', startDate.toISOString());
      if (recentError) throw recentError;

      let draftQuery = supabase.from('letters').select('*', { count: 'exact', head: true });
      
      if (selectedBranch) {
        // تعديل الاستعلام للحصول على المستخدمين في الفرع المحدد
        const { data: branchUsers } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', selectedBranch);
          
        if (branchUsers && branchUsers.length > 0) {
          const userIds = branchUsers.map(user => user.id);
          draftQuery = draftQuery.in('user_id', userIds);
        }
      } else {
        // إذا كان المستخدم مديراً، اعرض جميع الخطابات، وإلا اعرض خطابات المستخدم فقط
        if (dbUser?.role !== 'admin') {
          draftQuery = draftQuery.eq('user_id', dbUser?.id);
        }
      }
      
      const { count: draft, error: draftError } = await draftQuery.eq('status', 'draft');
      if (draftError) throw draftError;

      // جلب عدد طلبات الموافقة المعلقة
      let approvalQuery = supabase.from('approval_requests').select('*', { count: 'exact', head: true });

      if (dbUser?.role !== 'admin') {
        approvalQuery = approvalQuery.eq('assigned_to', dbUser?.id);
      }

      const { count: pendingApprovals, error: approvalError } = await approvalQuery.eq('status', 'submitted');
      if (approvalError) throw approvalError;

      // جلب عدد المهام
      let tasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true });

      if (dbUser?.role !== 'admin') {
        tasksQuery = tasksQuery.eq('assigned_to', dbUser?.id);
      }

      const { count: totalTasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      // جلب عدد المهام المعلقة
      let pendingTasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress']);

      if (dbUser?.role !== 'admin') {
        pendingTasksQuery = pendingTasksQuery.eq('assigned_to', dbUser?.id);
      }

      const { count: pendingTasks, error: pendingTasksError } = await pendingTasksQuery;
      if (pendingTasksError) throw pendingTasksError;

      return {
        total: total ?? 0,
        recent: recent ?? 0,
        draft: draft ?? 0,
        pendingApprovals: pendingApprovals ?? 0,
        totalTasks: totalTasks ?? 0,
        pendingTasks: pendingTasks ?? 0
      };
    },
    refetchInterval: 30000 // إعادة تحميل البيانات كل 30 ثانية
  });

  // آخر الخطابات
  const { data: recentLetters, isLoading: lettersLoading, refetch: refetchLetters } = useQuery({
    queryKey: ['recent-letters', dbUser?.id, selectedBranch],
    enabled: !!dbUser?.id,
    queryFn: async () => {
      let query = supabase
        .from('letters')
        .select(`
          id,
          number,
          year,
          content,
          status,
          created_at,
          letter_templates (
            name,
            image_url
          )
        `);
        
      if (selectedBranch) {
        // تعديل الاستعلام للحصول على المستخدمين في الفرع المحدد
        const { data: branchUsers } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', selectedBranch);
          
        if (branchUsers && branchUsers.length > 0) {
          const userIds = branchUsers.map(user => user.id);
          query = query.in('user_id', userIds);
        }
      } else {
        // إذا كان المستخدم مديراً، اعرض جميع الخطابات، وإلا اعرض خطابات المستخدم فقط
        if (dbUser?.role !== 'admin') {
          query = query.eq('user_id', dbUser?.id);
        }
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000 // إعادة تحميل البيانات كل 30 ثانية
  });

  // جلب المهام المعلقة
  const { data: pendingTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['pending-tasks', dbUser?.id, selectedBranch],
    enabled: !!dbUser?.id,
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          id, 
          title, 
          status, 
          priority,
          due_date,
          assignee:assigned_to(full_name)
        `)
        .in('status', ['new', 'in_progress'])
        .order('due_date', { ascending: true });
      
      if (dbUser?.role !== 'admin') {
        query = query.eq('assigned_to', dbUser?.id);
      }
      
      if (selectedBranch) {
        query = query.eq('branch_id', selectedBranch);
      }
      
      const { data, error } = await query.limit(5);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  // جلب طلبات الموافقة المعلقة
  const { data: pendingApprovals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ['pending-approvals-dash', dbUser?.id],
    enabled: !!dbUser?.id,
    queryFn: async () => {
      // استخدام RPC لجلب طلبات الموافقة المعلقة
      const { data, error } = await supabase.rpc('get_pending_approvals');
      
      if (error) throw error;
      return data.slice(0, 5); // عرض أحدث 5 طلبات فقط
    },
    refetchInterval: 30000
  });
  
  // تحديث البيانات عند تغيير الفرع
  useEffect(() => {
    if (selectedBranch !== null) {
      refetchStats();
      refetchLetters();
    }
  }, [selectedBranch, refetchStats, refetchLetters]);
  
  // إحصائيات النشاط الشهري (محاكاة)
  const monthlyStats = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [65, 32, 45, 78, 52, 60]
  };

  // تحويل التاريخ الميلادي إلى هجري
  const getHijriDate = (date: string) => {
    return moment(date).format('iYYYY/iM/iD');
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header Section - Welcome and Date */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span>{greeting}</span>
              <span className="text-primary">{dbUser?.full_name}</span>
              <Sparkles className="h-6 w-6 text-yellow-400 mr-2" />
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center">
              <Calendar className="h-4 w-4 ml-2" />
              <span>{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="mx-2">|</span>
              <span>{getHijriDate(new Date().toISOString())}</span>
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {dbUser?.role === 'admin' && (
              <div className="min-w-[200px]">
                <BranchSelector 
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  placeholder="جميع الفروع"
                  showAll
                  className="bg-white dark:bg-gray-800 shadow-sm"
                />
              </div>
            )}
            
            <div className="relative">
              <button className="relative p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <FileText className="h-32 w-32 -mt-6 -mr-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">إجمالي الخطابات</h3>
          <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
            <span className="text-4xl font-bold">{stats?.total || 0}</span>
            <span className="text-blue-100">خطاب</span>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/admin/letters')}
              className="text-xs bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>عرض الكل</span>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-md p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <Clock className="h-32 w-32 -mt-6 -mr-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">طلبات الموافقة</h3>
          <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
            <span className="text-4xl font-bold">{stats?.pendingApprovals || 0}</span>
            <span className="text-amber-100">طلب</span>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/admin/approvals')}
              className="text-xs bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full flex items-center gap-1.5"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>عرض طلبات الموافقة</span>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <ListTodo className="h-32 w-32 -mt-6 -mr-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">المهام النشطة</h3>
          <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
            <span className="text-4xl font-bold">{stats?.pendingTasks || 0}</span>
            <span className="text-green-100">مهمة</span>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/admin/tasks')}
              className="text-xs bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full flex items-center gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>عرض المهام</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm col-span-1 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <Rocket className="h-5 w-5 ml-2 text-primary" />
              إجراءات سريعة
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <button
              onClick={() => navigate('/admin/letters/new')}
              className="w-full flex items-center p-4 rounded-lg transition-all bg-primary/5 hover:bg-primary/10 border-2 border-primary/10 hover:border-primary/20"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center ml-4">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-semibold text-gray-800 dark:text-white">إنشاء خطاب جديد</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">إنشاء خطاب جديد من القوالب المتاحة</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/approvals')}
              className="w-full flex items-center p-4 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-gray-100 dark:border-gray-700"
            >
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center ml-4">
                <ClipboardCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-semibold text-gray-800 dark:text-white">إدارة الموافقات</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">عرض وإدارة طلبات الموافقة</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin/tasks/new')}
              className="w-full flex items-center p-4 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-gray-100 dark:border-gray-700"
            >
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center ml-4">
                <ListTodo className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-semibold text-gray-800 dark:text-white">إنشاء مهمة جديدة</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">إنشاء وتعيين مهمة جديدة</p>
              </div>
            </button>
          </div>
        </motion.div>
        
        {/* Activity Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm lg:col-span-2 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <ActivitySquare className="h-5 w-5 ml-2 text-green-500" />
              نشاط الخطابات
              {selectedBranch && (
                <span className="mr-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
                  حسب الفرع
                </span>
              )}
            </h2>
            
            <div>
              <select 
                className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg py-1.5 px-3"
                onChange={(e) => setPeriod(e.target.value as any)}
                value={period}
              >
                <option value="week">آخر أسبوع</option>
                <option value="month">آخر شهر</option>
                <option value="year">آخر سنة</option>
              </select>
            </div>
          </div>
          
          <div className="p-5">
            <div className="h-60 w-full flex items-end justify-between space-x-2 rtl:space-x-reverse pr-6 pb-5 relative">
              {/* Y-axis */}
              <div className="absolute bottom-0 right-0 top-0 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 py-5">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>
              
              {/* Chart bars */}
              {monthlyStats.datasets.map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="h-full w-full flex items-end justify-center">
                    <div 
                      className="w-14 bg-gradient-to-t from-blue-500 to-primary rounded-t-md transition-all duration-500"
                      style={{ height: `${(value / 100) * 100}%` }}
                    ></div>
                  </div>
                  <span className="mt-2 text-xs text-gray-600 dark:text-gray-400">{monthlyStats.labels[index]}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">معدل الخطابات</div>
                <div className="text-xl font-bold">10.2 / شهر</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">نسبة المسودات</div>
                <div className="text-xl font-bold">
                  {stats?.total ? Math.round((stats.draft / stats.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">الشهر الأعلى</div>
                <div className="text-xl font-bold">أبريل</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">خطابات {period === 'week' ? 'الأسبوع' : period === 'month' ? 'الشهر' : 'السنة'}</div>
                <div className="text-xl font-bold">{stats?.recent || 0}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Letters and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Letters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm lg:col-span-2 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <BookOpen className="h-5 w-5 ml-2 text-blue-500" />
              آخر الخطابات
              {selectedBranch && (
                <span className="mr-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
                  حسب الفرع
                </span>
              )}
            </h2>
            
            <button
              onClick={() => navigate('/admin/letters')}
              className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-5">
            {lettersLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : recentLetters && recentLetters.length > 0 ? (
              <div className="divide-y dark:divide-gray-700">
                {recentLetters.map((letter: any) => (
                  <div 
                    key={letter.id}
                    className="py-4 flex items-center gap-4 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/20 p-2 rounded-lg transition-all"
                    onClick={() => navigate(`/admin/letters/view/${letter.id}`)}
                  >
                    {letter.letter_templates?.image_url ? (
                      <div className="h-14 w-14 rounded-lg border dark:border-gray-700 overflow-hidden flex-shrink-0">
                        <img 
                          src={letter.letter_templates.image_url} 
                          alt={letter.letter_templates?.name || 'قالب الخطاب'}
                          className="h-full w-full object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                          {letter.content?.subject || 'بدون عنوان'}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          letter.status === 'completed' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {letter.status === 'completed' ? 'مكتمل' : 'مسودة'}
                        </span>
                      </div>
                      
                      <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="truncate">إلى: {letter.content?.to || 'غير محدد'}</span>
                        <span className="mx-2">•</span>
                        <span className="whitespace-nowrap">{letter.number}/{letter.year}</span>
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {moment(letter.created_at).format('iYYYY/iM/iD')} - {new Date(letter.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد خطابات حتى الآن</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">ابدأ بإنشاء خطاب جديد</p>
                <button 
                  onClick={() => navigate('/admin/letters/new')}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 mx-auto"
                >
                  <PlusCircle className="h-4 w-4" />
                  خطاب جديد
                </button>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Tasks & Approvals */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <LayoutDashboard className="h-5 w-5 ml-2 text-purple-500" />
              المهام وطلبات الموافقة
            </h2>
          </div>
          
          <div className="p-5">
            <h3 className="font-medium text-gray-800 dark:text-white flex items-center mb-4">
              <ListTodo className="h-4 w-4 ml-2 text-primary" />
              المهام الحالية
            </h3>
            
            <div className="space-y-3 mb-6">
              {tasksLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary"></div>
                </div>
              ) : pendingTasks.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">لا توجد مهام حالية</p>
                </div>
              ) : (
                pendingTasks.map((task: any) => (
                  <div 
                    key={task.id} 
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20 cursor-pointer"
                    onClick={() => navigate(`/admin/tasks/${task.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800 dark:text-white">{task.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                        task.priority === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                      <span>{task.assignee?.full_name || 'غير معين'}</span>
                      {task.due_date && (
                        <span>تاريخ الاستحقاق: {getHijriDate(task.due_date)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <h3 className="font-medium text-gray-800 dark:text-white flex items-center mb-4">
              <ClipboardCheck className="h-4 w-4 ml-2 text-primary" />
              طلبات الموافقة المعلقة
            </h3>
            
            <div className="space-y-3">
              {approvalsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary"></div>
                </div>
              ) : pendingApprovals.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">لا توجد طلبات موافقة معلقة</p>
                </div>
              ) : (
                pendingApprovals.map((approval: any) => (
                  <div 
                    key={approval.request_id} 
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20 cursor-pointer"
                    onClick={() => navigate('/admin/approvals')}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800 dark:text-white truncate">{approval.letter_subject || 'خطاب بلا عنوان'}</h4>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                      <span>من: {approval.requester_name}</span>
                      <span>{new Date(approval.requested_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => navigate('/admin/tasks')}
                  className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center gap-1"
                >
                  <ListTodo className="h-4 w-4" />
                  <span>كل المهام</span>
                </button>
                <button
                  onClick={() => navigate('/admin/approvals')}
                  className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center gap-1"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>الموافقات</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Upcoming Events */}
          <div className="border-t dark:border-gray-700 p-5">
            <h3 className="font-medium text-gray-800 dark:text-white flex items-center mb-4">
              <Calendar className="h-4 w-4 ml-2 text-primary" />
              تذكيرات هامة
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold">12</span>
                  <span className="text-xs">يونيو</span>
                </div>
                <div className="mr-3">
                  <p className="font-medium text-gray-800 dark:text-white">مراجعة المسودات المتأخرة</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">10:00 صباحاً - 11:30 صباحاً</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tips & Shortcuts */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <Sparkles className="h-5 w-5 ml-2 text-yellow-500" />
            نصائح واختصارات
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
            <div className="font-medium text-gray-800 dark:text-white mb-2">اختصارات لوحة المفاتيح</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              استخدم <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl+K</kbd> للبحث السريع و <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl+/</kbd> لإنشاء خطاب جديد.
            </p>
          </div>
          
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
            <div className="font-medium text-gray-800 dark:text-white mb-2">النماذج النصية الجاهزة</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              استخدم النماذج النصية الجاهزة لتسريع كتابة الخطابات المتكررة بنقرة واحدة.
            </p>
          </div>
          
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
            <div className="font-medium text-gray-800 dark:text-white mb-2">تصدير الخطابات</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              يمكنك تصدير الخطابات بصيغة PDF عالية الجودة أو طباعتها مباشرة من النظام.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}