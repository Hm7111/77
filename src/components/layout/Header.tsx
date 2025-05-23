import { useState, useEffect } from 'react'
import { HelpCircle, Keyboard, LogOut, Moon, Sun, Settings, Bell, User, Search, Menu, X } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useThemeStore } from '../../store/theme'
import { supabase } from '../../lib/supabase'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../hooks/useToast'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useQuery } from '@tanstack/react-query'

export function Header() {
  const { theme, setTheme } = useThemeStore()
  const navigate = useNavigate()
  const { registerHotkey } = useHotkeys()
  const { dbUser } = useAuth()
  const { toast } = useToast()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const { getPendingApprovals } = useWorkflow()
  
  // استعلام لجلب عدد طلبات الموافقة المعلقة
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: getPendingApprovals,
    enabled: !!dbUser,
    refetchInterval: 60000, // تحديث كل دقيقة
  })
  
  // تحديث عدد الإشعارات غير المقروءة
  useEffect(() => {
    setUnreadNotifications(pendingApprovals.length);
  }, [pendingApprovals]);
  
  // تسجيل اختصارات لوحة المفاتيح
  useEffect(() => {
    // تسجيل اختصارات لوحة المفاتيح
    registerHotkey('ctrl+k', () => document.querySelector<HTMLButtonElement>('#keyboard-shortcuts')?.click())
    registerHotkey('ctrl+h', () => document.querySelector<HTMLButtonElement>('#help-guide')?.click())
    registerHotkey('ctrl+d', () => setTheme(theme === 'light' ? 'dark' : 'light'))
    registerHotkey('ctrl+/', () => navigate('/admin/letters/new'))
    registerHotkey('ctrl+.', () => navigate('/admin/letters'))
    
    // تنظيف عند إزالة المكون
    return () => {
      // يتم التنظيف تلقائيًا عند إزالة المكون
    }
  }, [theme])

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast({
        title: 'تم تسجيل الخروج',
        description: 'تم تسجيل الخروج بنجاح',
        type: 'success'
      })
      
      navigate('/login')
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل الخروج',
        type: 'error'
      })
    }
  }

  return (
    <>
      {/* نافذة اختصارات لوحة المفاتيح */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white dark:bg-gray-900 max-w-md w-full rounded-lg shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
              <h2 className="text-lg font-semibold">اختصارات لوحة المفاتيح</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>اختصارات لوحة المفاتيح</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+K</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>دليل المستخدم</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+H</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>تبديل المظهر</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+D</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>إنشاء خطاب جديد</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+/</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>عرض الخطابات</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800">Ctrl+.</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الإشعارات */}
      {showNotifications && (
        <div className="fixed top-16 left-4 z-50 w-80 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-lg overflow-hidden">
          <div className="p-3 border-b dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold">الإشعارات</h3>
            <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-500 dark:text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800">
                {pendingApprovals.map((approval) => (
                  <div key={approval.request_id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">طلب موافقة جديد</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          طلب موافقة على خطاب "{approval.letter_subject}" من {approval.requester_name}
                        </p>
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              navigate('/admin/approvals');
                            }}
                            className="text-primary text-sm hover:underline"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(approval.requested_at).toLocaleString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {pendingApprovals.length > 0 && (
            <div className="p-3 border-t dark:border-gray-800">
              <button
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/admin/approvals');
                }}
                className="w-full p-2 bg-primary text-white rounded-lg text-sm"
              >
                عرض جميع الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    
      <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 bg-white dark:bg-gray-900 shadow-sm transition-colors duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-x-4">
            {/* زر القائمة الجانبية للشاشات الصغيرة */}
            <button 
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            <Link to="/admin" className="flex items-center gap-x-2">
              <img 
                src="https://hbxalipjrbcrqljddxfp.supabase.co/storage/v1/object/public/templates//logo.png" 
                alt="الجمعية السعودية للإعاقة السمعية" 
                className="h-10 object-contain dark:invert dark:brightness-0 dark:contrast-200 transition-all duration-300" 
              />
              <h1 className="text-xl font-bold hidden sm:block">نظام إدارة الخطابات</h1>
            </Link>
          </div>
          
          {/* شريط البحث في الوسط */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/3 max-w-md">
            <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="بحث سريع..."
              className="bg-transparent w-full text-sm focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400">
              /
            </kbd>
          </div>
          
          <div className="flex items-center gap-x-1.5">
            <button
              id="keyboard-shortcuts"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 group relative text-gray-500 dark:text-gray-400"
              title="اختصارات لوحة المفاتيح (Ctrl+K)"
              onClick={() => setShowShortcuts(true)}
            >
              <Keyboard className="h-5 w-5" />
              <div className="help-tooltip -bottom-24 left-1/2 -translate-x-1/2 w-48">
                <div className="space-y-2 text-xs">
                  <p className="flex items-center justify-between">
                    <span>اختصارات لوحة المفاتيح</span>
                    <kbd className="shortcut-key">Ctrl+K</kbd>
                  </p>
                </div>
              </div>
            </button>

            <button
              id="help-guide"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 group relative text-gray-500 dark:text-gray-400"
              title="دليل المستخدم (Ctrl+H)"
            >
              <HelpCircle className="h-5 w-5" />
              <div className="help-tooltip -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                عرض دليل المستخدم
              </div>
            </button>
            
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 group relative text-gray-500 dark:text-gray-400"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 group relative text-gray-500 dark:text-gray-400"
              title="تبديل المظهر (Ctrl+D)"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div className="help-tooltip -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                {theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'}
              </div>
            </button>

            {/* قائمة المستخدم */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-sm ml-3 p-1.5 rounded-full overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-800 relative"
                title="حساب المستخدم"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:block font-medium truncate max-w-[100px]">
                  {dbUser?.full_name || 'المستخدم'}
                </span>
              </button>
              
              {showUserMenu && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-lg overflow-hidden z-50">
                  <div className="p-3 border-b dark:border-gray-800">
                    <p className="font-medium">{dbUser?.full_name || 'المستخدم'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{dbUser?.email}</p>
                    <p className="text-xs mt-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 inline-block px-2 py-0.5 rounded-full">
                      {dbUser?.role === 'admin' ? 'مدير' : 'مستخدم'}
                    </p>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      to="/admin/settings"
                      className="flex items-center gap-x-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      الإعدادات
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-right flex items-center gap-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* القائمة الجانبية للشاشات الصغيرة */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowMobileMenu(false)}></div>
          
          <div className="absolute inset-y-0 right-0 w-64 bg-white dark:bg-gray-900 shadow-lg" onClick={e => e.stopPropagation()}>
            {/* محتوى القائمة الجانبية للجوال */}
            <div className="p-4 border-b dark:border-gray-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">{dbUser?.full_name || 'المستخدم'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{dbUser?.role === 'admin' ? 'مدير' : 'مستخدم'}</div>
              </div>
            </div>
            
            <div className="p-2">
              {[
                { name: 'الرئيسية', href: '/admin', icon: Home },
                { name: 'الخطابات', href: '/admin/letters', icon: FileText },
                { name: 'إنشاء خطاب جديد', href: '/admin/letters/new', icon: Plus },
                { name: 'طلبات الموافقة', href: '/admin/approvals', icon: CheckCircle },
                ...(dbUser?.role === 'admin' ? [
                  { name: 'المستخدمين', href: '/admin/users', icon: Users }
                ] : []),
                { name: 'الإعدادات', href: '/admin/settings', icon: Settings },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-x-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              
              <div className="border-t dark:border-gray-800 my-2 pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-x-3 px-3 py-2 text-sm font-medium rounded-lg text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-right"
                >
                  <LogOut className="h-5 w-5" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// أيقونات إضافية
function Home(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24"
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  )
}

function FileText(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24"
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  )
}

function Plus(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24"
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

function CheckCircle(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24"
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )
}

function Users(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24"
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  )
}