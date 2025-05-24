import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import '@fontsource/cairo'
import { useThemeStore } from './store/theme'
import { useEffect, Suspense, useState } from 'react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ToastProvider } from './providers/ToastProvider'
import { ErrorProvider } from './providers/ErrorProvider'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// تحسين: إنشاء مثيل QueryClient مرة واحدة
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // دقيقتان
      cacheTime: 1000 * 60 * 20, // 20 دقيقة
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  }
})

function App() {
  const { theme } = useThemeStore()
  const [isAppReady, setIsAppReady] = useState(false)

  // تطبيق الوضع الليلي
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // إعلام الذاكرة التخزينية المحلية بالوضع المفضل للمستخدم
    localStorage.setItem('theme', theme)
  }, [theme])
  
  // تحسين: تأخير عرض التطبيق حتى يتم تحميل الخطوط والموارد الأساسية
  useEffect(() => {
    // انتظار تحميل الخطوط
    document.fonts.ready.then(() => {
      setIsAppReady(true)
    })
  }, [])

  return (
    <ErrorBoundary>
      {isAppReady ? (
        <div className="app-loading-fade-in">
          <BrowserRouter>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
                  <p className="text-gray-600 dark:text-gray-400">جاري تحميل النظام...</p>
                </div>
              </div>
            }>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
          {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
        </div>
      ) : (
        // واجهة التحميل المبدئية البسيطة
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل النظام...</p>
          </div>
        </div>
      )}
    </ErrorBoundary>
  )
}

export default App