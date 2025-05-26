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
  Layers,
  Users,
  ClipboardCheck,
  DollarSign,
  TrendingUp,
  ShoppingBag
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { motion } from 'framer-motion';
import moment from 'moment-hijri';
import { BranchSelector } from '../../components/branches/BranchSelector';
import { useToast } from '../../hooks/useToast';
import { useWorkflow } from '../../hooks/useWorkflow';

export function Dashboard() {
  const navigate = useNavigate();
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const { getPendingApprovals } = useWorkflow();
  
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [greeting, setGreeting] = useState<string>('مرحباً');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  
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
    
    // تحميل الإشعارات
    const loadNotifications = async () => {
      try {
        const approvals = await getPendingApprovals();
        setNotifications([
          ...approvals.map(approval => ({
            id: approval.request_id,
            title: 'طلب موافقة جديد',
            description: `طلب موافقة على خطاب "${approval.letter_subject}" من ${approval.requester_name}`,
            time: moment(approval.requested_at).fromNow(),
            read: false,
            type: 'approval'
          })),
          {
            id: 'task-1',
            title: 'تذكير بالمهام',
            description: 'لديك 3 مهام بانتظار التنفيذ',
            time: '30 دقيقة',
            read: true,
            type: 'task'
          }
        ]);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    
    loadNotifications();
  }, [getPendingApprovals]);

  const { data: stats = { total: 0, recent: 0, draft: 0 }, isLoading: statsLoading, refetch: refetchStats } = useQuery({
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
      
      if (selectedBranch) {
        const { data: branchUsers } = await supabase
          .from('users')
          .select('id')
          .eq('branch_id', selectedBranch);
          
        if (branchUsers && branchUsers.length > 0) {
          const userIds = branchUsers.map(user => user.id);
          query = query.in('user_id', userIds);
        }
      } else if (dbUser?.role !== 'admin') {
        query = query.eq('user_id', dbUser?.id);
      }
      
      const { count: total, error: totalError } = await query;
      if (totalError) throw totalError;

      let recentQuery = query.gte('created_at', startDate.toISOString());
      const { count: recent, error: recentError } = await recentQuery;
      if (recentError) throw recentError;

      const { count: draft, error: draftError } = await query.eq('status', 'draft');
      if (draftError) throw draftError;

      return {
        total: total || 0,
        recent: recent || 0,
        draft: draft || 0
      };
    },
    refetchInterval: 60000 // إعادة تحميل البيانات كل دقيقة
  });

  // نسبة الإنجاز للمهام
  const targetProgress = 85;
  
  // آخر الخطابات
  const { data: recentLetters = [], isLoading: lettersLoading } = useQuery({
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
      } else if (dbUser?.role !== 'admin') {
        query = query.eq('user_id', dbUser?.id);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });
  
  // أحدث الطلبات / المهام
  const { data: recentTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['recent-tasks', dbUser?.id],
    enabled: !!dbUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          priority,
          created_at,
          due_date,
          assignee:assigned_to(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });
  
  // بيانات الإحصائيات الشهرية (محاكاة)
  const salesData = [
    { month: 'يناير', value: 2500 },
    { month: 'فبراير', value: 3100 },
    { month: 'مارس', value: 4200 },
    { month: 'أبريل', value: 3800 },
    { month: 'مايو', value: 5100 },
    { month: 'يونيو', value: 5800 },
    { month: 'يوليو', value: 5500 },
    { month: 'أغسطس', value: 6200 },
    { month: 'سبتمبر', value: 5900 },
    { month: 'أكتوبر', value: 6500 },
    { month: 'نوفمبر', value: 7200 },
    { month: 'ديسمبر', value: 7800 }
  ];
  
  // محاكاة سجل النشاطات
  const activities = [
    { 
      id: 1, 
      user: 'أحمد محمد',
      action: 'أضاف تعليق على مهمة',
      target: 'تحديث قوالب الخطابات',
      content: 'تم الانتهاء من مراجعة القالب الجديد. يبدو رائعاً!',
      time: '9:20 ص',
      date: 'اليوم'
    },
    { 
      id: 2, 
      user: 'ليلى إبراهيم',
      action: 'شاركت خطاباً',
      target: 'خطاب الدعوة',
      content: 'تمت مشاركة الخطاب مع فريق العمل',
      time: '11:45 ص',
      date: 'اليوم'
    },
    { 
      id: 3, 
      user: 'خالد العامري',
      action: 'أضاف توقيع جديد',
      target: null,
      content: 'تم إضافة توقيع إلكتروني جديد للنظام',
      time: '1:30 م',
      date: 'أمس'
    }
  ];
  
  // محاكاة العملاء الأكثر نشاطاً
  const topCustomers = [
    { id: 1, name: 'وزارة التعليم', transactions: 12, amount: 52000 },
    { id: 2, name: 'مؤسسة الخير', transactions: 8, amount: 37000 },
    { id: 3, name: 'شركة التطوير', transactions: 15, amount: 42000 },
    { id: 4, name: 'جامعة الرياض', transactions: 7, amount: 31000 }
  ];
  
  // محاكاة الطلبات الأخيرة
  const recentOrders = [
    { id: 'ORD-001', product: 'خطاب تعريف', customer: 'محمد سامي', qty: 2, price: 2500, date: '16 يناير 2025', status: 'مكتمل' },
    { id: 'ORD-002', product: 'شهادة', customer: 'سارة أحمد', qty: 1, price: 1500, date: '14 يناير 2025', status: 'ملغي' },
    { id: 'ORD-003', product: 'إفادة', customer: 'فهد خالد', qty: 1, price: 2000, date: '10 يناير 2025', status: 'معلق' },
    { id: 'ORD-004', product: 'خطاب توصية', customer: 'هدى محمود', qty: 3, price: 3500, date: '8 يناير 2025', status: 'قيد المعالجة' }
  ];
  
  // بيانات المستخدم المحاكاة
  const userData = {
    name: dbUser?.full_name || 'المستخدم',
    role: dbUser?.role === 'admin' ? 'مدير النظام' : 'مستخدم عادي',
    lastLogin: 'منذ 2 ساعة',
    profileUrl: '/admin/settings'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* شريط الترحيب والمعلومات العلوي */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* كرت الترحيب */}
          <div className="md:col-span-5 lg:col-span-4 relative overflow-hidden bg-gradient-to-r from-primary/90 to-primary rounded-xl text-white p-6">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1607499457689-3f0dd36e7acb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cGF0dGVybnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60')] opacity-10"></div>
            
            {/* محتوى كرت الترحيب */}
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">
                    {greeting} {userData.name}!
                  </h2>
                  <p className="text-white/80 text-sm mb-4">
                    آخر تسجيل دخول: {userData.lastLogin}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <UserCircle className="h-7 w-7 text-white" />
                </div>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-white/70 mb-1">لديك اليوم</div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium">
                    {notifications.filter(n => n.type === 'approval').length} طلب موافقة
                  </div>
                  <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium">
                    {recentTasks.filter(t => t.status === 'new').length} مهمة جديدة
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => navigate(userData.profileUrl)}
                className="mt-5 bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 transition-colors"
              >
                <UserCircle className="h-4 w-4" />
                عرض الملف الشخصي
              </button>
            </div>
          </div>
          
          {/* البطاقات الإحصائية */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">الإيرادات</p>
                <p className="text-2xl font-bold mt-1">٥٤,١٩٥</p>
                <div className="flex items-center text-green-500 text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" /> 
                  <span>+6.5%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">الأرباح</p>
                <p className="text-2xl font-bold mt-1">٨٠٪</p>
                <div className="flex items-center text-red-500 text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> 
                  <span>-2.0%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">العملاء</p>
                <p className="text-2xl font-bold mt-1">٨٤٥+</p>
                <div className="flex items-center text-red-500 text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> 
                  <span>-4.7%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">الفواتير</p>
                <p className="text-2xl font-bold mt-1">١٠,٩٠٩</p>
                <div className="flex items-center text-green-500 text-xs mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" /> 
                  <span>+10.3%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* الصف الأول - 3 أعمدة */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* العملاء الأكثر نشاطاً */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">العملاء الأكثر نشاطاً</h3>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="بحث..."
                className="w-40 pl-3 pr-10 py-1.5 text-xs border rounded-lg dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs">
                <tr>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">العميل</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">المعاملات</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {topCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {customer.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{customer.transactions}</td>
                    <td className="px-4 py-3 font-medium">{customer.amount.toLocaleString()} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t dark:border-gray-700 flex justify-center">
            <button className="text-primary text-sm hover:underline flex items-center gap-1">
              عرض جميع العملاء
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* إحصائيات المبيعات */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">نظرة عامة إحصائية للمبيعات</h3>
              <div className="flex mt-2 items-center gap-4">
                <div className="text-sm">
                  <span className="text-gray-500">إجمالي الطلبات: </span>
                  <span className="font-semibold">١٩,٨٩٧</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">إجمالي الإيرادات: </span>
                  <span className="font-semibold">٥٨,٤٩٣,٢٣٨</span>
                </div>
              </div>
            </div>
            <div>
              <select className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg py-1.5 px-3">
                <option>هذا العام</option>
                <option>العام الماضي</option>
                <option>آخر 6 أشهر</option>
              </select>
            </div>
          </div>
          
          <div className="p-5">
            {/* محاكاة مخطط الأعمدة */}
            <div className="h-64 w-full pr-6 pl-6 pb-5 relative">
              {/* المحور Y */}
              <div className="absolute bottom-0 right-0 top-0 flex flex-col justify-between text-xs text-gray-500 py-5">
                <span>١٠٠ك</span>
                <span>٨٠ك</span>
                <span>٦٠ك</span>
                <span>٤٠ك</span>
                <span>٢٠ك</span>
                <span>٠</span>
              </div>
              
              {/* أعمدة المخطط */}
              <div className="h-full flex items-end justify-between space-x-2 rtl:space-x-reverse px-6">
                {salesData.map((item, idx) => {
                  // محاكاة البيانات بمقياس تجريبي
                  const height = `${(item.value / 8000) * 100}%`;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div className="h-full w-full flex items-end justify-center">
                        <div 
                          className={`w-full max-w-[25px] bg-gradient-to-t from-primary/80 to-primary rounded-t-md transition-all duration-500`}
                          style={{ height }}
                        ></div>
                      </div>
                      <span className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* خطوط الشبكة الأفقية */}
              {[0, 20, 40, 60, 80, 100].map((tick, idx) => (
                <div 
                  key={idx}
                  className="absolute left-6 right-6 border-t border-dashed border-gray-200 dark:border-gray-700" 
                  style={{ bottom: `${(tick / 100) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* الصف الثاني - 3 أعمدة */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* سجل النشاطات */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">سجل النشاطات</h3>
            <button className="text-xs text-gray-500 hover:text-primary">عرض الكل</button>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.action.includes('أضاف') 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : activity.action.includes('شارك') 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  }`}>
                    <ActivitySquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-primary">{activity.user}</span>
                      {' '}
                      <span className="text-gray-600 dark:text-gray-400">{activity.action}</span>
                      {activity.target && (
                        <span className="text-gray-900 dark:text-gray-100">{' '}{activity.target}</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activity.content}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {activity.time}
                      <span className="mx-1">•</span>
                      {activity.date}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        
        {/* الطلبات الأخيرة */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">الطلبات الأخيرة</h3>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="بحث..."
                className="w-40 pl-3 pr-10 py-1.5 text-xs border rounded-lg dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs">
                <tr>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">المنتج</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">العميل</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">الكمية</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">السعر</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">التاريخ</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          order.product.includes('خطاب') 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{order.product}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">{order.customer}</td>
                    <td className="px-6 py-3">{order.qty} قطعة</td>
                    <td className="px-6 py-3 font-medium">{order.price} ر.س</td>
                    <td className="px-6 py-3 text-gray-500">{order.date}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'مكتمل' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : order.status === 'ملغي' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : order.status === 'معلق'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t dark:border-gray-700 text-center text-sm text-gray-500">
            عرض 1-4 من 12 عنصر
          </div>
        </motion.div>
      </div>
      
      {/* الصف الثالث - مقاييس العرض */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* آخر الخطابات */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">آخر الخطابات</h3>
            <button 
              onClick={() => navigate('/admin/letters')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              عرض الكل
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {lettersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
              </div>
            ) : recentLetters.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد خطابات</p>
                <button 
                  onClick={() => navigate('/admin/letters/new')}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  إنشاء خطاب جديد
                </button>
              </div>
            ) : (
              recentLetters.map((letter) => (
                <div 
                  key={letter.id}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer flex gap-3"
                  onClick={() => navigate(`/admin/letters/view/${letter.id}`)}
                >
                  <div className="w-10 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {letter.letter_templates?.image_url ? (
                      <img 
                        src={letter.letter_templates.image_url} 
                        alt="قالب" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{letter.content?.subject || 'بدون عنوان'}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>رقم: {letter.number}/{letter.year}</span>
                      <span className="mx-2">•</span>
                      <span>{moment(letter.created_at).format('iYYYY/iMM/iDD')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={() => navigate('/admin/letters/new')}
              className="w-full py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              إنشاء خطاب جديد
            </button>
          </div>
        </motion.div>
        
        {/* المهام المعلقة */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">المهام المعلقة</h3>
            <button 
              onClick={() => navigate('/admin/tasks')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              عرض الكل
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tasksLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent"></div>
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد مهام معلقة</p>
                <button 
                  onClick={() => navigate('/admin/tasks/new')}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  إنشاء مهمة جديدة
                </button>
              </div>
            ) : (
              recentTasks.map((task: any) => (
                <div 
                  key={task.id}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer"
                  onClick={() => navigate(`/admin/tasks/${task.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium truncate">{task.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      task.priority === 'high' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
                        : task.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {task.priority === 'high' ? 'مرتفع' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 text-[10px]">
                          {task.assignee?.full_name?.charAt(0) || 'م'}
                        </span>
                      </div>
                      <span className="truncate max-w-[100px]">
                        {task.assignee?.full_name || 'غير معين'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{task.due_date ? moment(task.due_date).format('iYYYY/iMM/iDD') : 'غير محدد'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={() => navigate('/admin/tasks/new')}
              className="w-full py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              إنشاء مهمة جديدة
            </button>
          </div>
        </motion.div>
        
        {/* نسبة إنجاز الهدف الشهري */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700">
            <h3 className="font-semibold">الهدف الشهري</h3>
          </div>
          
          <div className="p-6 flex flex-col items-center justify-center">
            {/* عداد الهدف */}
            <div className="relative h-52 w-52 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* الدائرة الخلفية */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f3f4f6"
                  strokeWidth="8"
                  className="dark:stroke-gray-700"
                />
                {/* الدائرة التقدمية */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - targetProgress / 100)}`}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-in-out"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-primary">{targetProgress}%</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">تم إكماله</span>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                الهدف المحدد: ٨٥٪ من المعدل الشهري
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">متبقي</p>
                  <p className="text-xl font-semibold text-primary">١٥٪</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الهدف</p>
                  <p className="text-xl font-semibold">١٠٠٪</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">اليوم</p>
                  <p className="text-xl font-semibold text-green-500">+٧٪</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* الصف الرابع - الإحصائيات والزوار */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* سجل المهام */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">تقرير المبيعات</h3>
            <div className="flex gap-2 text-xs">
              <button className="px-3 py-1 bg-primary text-white rounded-full">الطلبات</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full">الأرباح</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full">المرتجعات</button>
            </div>
          </div>
          
          <div className="p-5">
            <div className="flex items-center justify-center h-48">
              <div className="w-36 h-36 border-8 border-blue-100 dark:border-blue-900/30 rounded-full relative flex items-center justify-center">
                <div className="w-28 h-28 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <span className="block text-3xl font-bold">12.5k</span>
                    <span className="text-xs text-gray-500">إجمالي الطلبات</span>
                  </div>
                </div>
                
                {/* نقاط تمثل شرائح الرسم البياني الدائري */}
                <div className="absolute h-3 w-3 bg-blue-500 rounded-full" style={{ top: '10%', right: '10%' }}></div>
                <div className="absolute h-3 w-3 bg-green-500 rounded-full" style={{ top: '30%', left: '5%' }}></div>
                <div className="absolute h-3 w-3 bg-yellow-500 rounded-full" style={{ bottom: '20%', left: '15%' }}></div>
                <div className="absolute h-3 w-3 bg-red-500 rounded-full" style={{ bottom: '5%', right: '30%' }}></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                <div className="text-xs">
                  <div>المبيعات المباشرة</div>
                  <div className="font-bold">45%</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <div className="text-xs">
                  <div>عبر الإنترنت</div>
                  <div className="font-bold">30%</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                <div className="text-xs">
                  <div>عبر التطبيق</div>
                  <div className="font-bold">15%</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                <div className="text-xs">
                  <div>عبر الشركاء</div>
                  <div className="font-bold">10%</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* المواعيد */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">إدارة المواعيد</h3>
            <button className="text-xs text-gray-500 hover:text-primary">عرض الكل</button>
          </div>
          
          <div className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex flex-col items-center justify-center text-green-600 dark:text-green-400">
                <span className="text-xs">ابريل</span>
                <span className="font-bold">22</span>
              </div>
              
              <div className="text-right flex-1 mr-3">
                <p className="font-medium">اجتماع مع فريق التسويق</p>
                <p className="text-xs text-gray-500">11:30 صباحًا - 12:30 مساءً</p>
              </div>
              
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  مؤكد
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400">
                <span className="text-xs">ابريل</span>
                <span className="font-bold">23</span>
              </div>
              
              <div className="text-right flex-1 mr-3">
                <p className="font-medium">مراجعة الخطة الربعية</p>
                <p className="text-xs text-gray-500">2:00 مساءً - 3:30 مساءً</p>
              </div>
              
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  بانتظار التأكيد
                </span>
              </div>
            </div>
            
            <button className="w-full mt-4 py-2 border border-primary/20 hover:bg-primary/5 text-primary rounded-lg text-sm flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4" />
              إضافة موعد جديد
            </button>
          </div>
        </motion.div>

        {/* إحصائيات الزوار */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">الزوار</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-500">+6.5%</span>
              <span className="text-xs text-gray-500">أكثر من الأسبوع الماضي</span>
            </div>
          </div>
          
          <div className="p-5">
            <div className="text-2xl font-bold">98,736</div>
            
            <div className="h-48 mt-4">
              {/* محاكاة مخطط بياني */}
              <div className="h-full relative">
                {/* بيانات الرسم البياني */}
                <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <path 
                    d="M0,50 C20,40 40,80 60,70 C80,60 100,80 120,70 C140,60 160,20 180,30 C200,40 220,50 240,40 C260,30 280,50 300,40"
                    fill="none" 
                    stroke="#60A5FA" 
                    strokeWidth="3" 
                    className="dark:stroke-blue-500"
                  />
                  <path 
                    d="M0,50 C20,40 40,80 60,70 C80,60 100,80 120,70 C140,60 160,20 180,30 C200,40 220,50 240,40 C260,30 280,50 300,40"
                    fill="url(#gradient)"
                    fillOpacity="0.2"
                    stroke="transparent"
                    strokeWidth="0"
                    transform="translate(0, 40)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.5" className="dark:stop-color-blue-500" />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" className="dark:stop-color-blue-500" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* وسوم المحور السيني */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                  <span>الأحد</span>
                  <span>الاثنين</span>
                  <span>الثلاثاء</span>
                  <span>الأربعاء</span>
                  <span>الخميس</span>
                  <span>الجمعة</span>
                  <span>السبت</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">الجلسات</div>
                <div className="text-lg font-semibold">2.4K</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">المستخدمين</div>
                <div className="text-lg font-semibold">1.9K</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">معدل الارتداد</div>
                <div className="text-lg font-semibold">32.8%</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* شريط الإشعارات الجانبي (يظهر عندما يتم النقر على زر الإشعارات) */}
      {showNotificationsPanel && (
        <div className="fixed inset-0 z-50 bg-black/20 dark:bg-gray-900/50" onClick={() => setShowNotificationsPanel(false)}>
          <div 
            className="absolute left-0 top-0 h-full w-80 sm:w-96 bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 transform-gpu"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                الإشعارات
              </h3>
              <button 
                onClick={() => setShowNotificationsPanel(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-2 overflow-y-auto max-h-screen pb-24">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد إشعارات جديدة</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-3 rounded-lg transition-colors ${
                        notification.read 
                          ? 'hover:bg-gray-100 dark:hover:bg-gray-700/50' 
                          : 'bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.type === 'approval' 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {notification.type === 'approval' ? (
                            <ClipboardCheck className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">{notification.time}</span>
                            {!notification.read && (
                              <span className="inline-flex h-2 w-2 bg-primary rounded-full"></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}