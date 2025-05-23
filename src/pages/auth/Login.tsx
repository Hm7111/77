import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'))
  
  // التحقق من وجود رسالة خطأ في حالة الانتقال
  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message)
    }
  }, [location])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        } else if (error.message.includes('user')) {
          setError('حدث خطأ: الحساب غير نشط')
        } else {
          setError('حدث خطأ أثناء تسجيل الدخول: ' + error.message)
        }
        return
      }
      
      if (!data.user) {
        setError('لم يتم العثور على المستخدم')
        return
      }

      // التحقق من حالة المستخدم (نشط أم لا)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_active, role')
        .eq('id', data.user.id)
        .single()
        
      if (userError) {
        console.error('Error fetching user data:', userError)
        setError('حدث خطأ أثناء التحقق من حالة الحساب')
        // قم بتسجيل الخروج إذا حدث خطأ للتأكد من الأمان
        await supabase.auth.signOut()
        return
      }
      
      // السماح للمدير بالدخول دائماً، بغض النظر عن حالة التنشيط
      if (userData && !userData.is_active && userData.role !== 'admin') {
        setError('تم تعطيل حسابك. يرجى التواصل مع المسؤول.')
        // تسجيل الخروج إذا كان المستخدم غير نشط
        await supabase.auth.signOut()
        return
      }

      // حفظ البريد الإلكتروني إذا تم اختيار "تذكرني"
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      navigate('/admin')
    } catch (error) {
      console.error('Error:', error)
      setError('حدث خطأ غير متوقع')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-8 relative overflow-hidden transition-all duration-300">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
        
        <div className="relative">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="https://hbxalipjrbcrqljddxfp.supabase.co/storage/v1/object/public/templates//logo.png" 
                alt="الجمعية السعودية للإعاقة السمعية"
                className="h-24 object-contain dark:invert dark:brightness-0 dark:contrast-200 transition-all duration-300"
              />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
              مرحباً بك
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              قم بتسجيل الدخول للوصول إلى نظام إدارة الخطابات
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center gap-x-2 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-200"
                required
                autoComplete="email"
                placeholder="أدخل بريدك الإلكتروني"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-200"
                  required
                  autoComplete="current-password"
                  placeholder="أدخل كلمة المرور"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary/20"
              />
              <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-700 dark:text-gray-300">
                تذكرني
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary/20 transition-colors duration-200 flex items-center justify-center gap-x-2 relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارٍ تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}