import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import '@fontsource/cairo'
import { useThemeStore } from './store/theme'
import { useEffect, Suspense } from 'react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ToastProvider } from './providers/ToastProvider'
import { ErrorProvider } from './providers/ErrorProvider'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { DiagnosticsProvider } from './providers/DiagnosticsProvider'

// إعداد مكتبة React Query مع إعدادات متقدمة
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // استراتيجية إعادة المحاولة تصاعدية
      staleTime: 1000 * 60, // البيانات تعتبر قديمة بعد دقيقة
      cacheTime: 1000 * 60 * 30, // تخزين البيانات لمدة 30 دقيقة
      refetchOnWindowFocus: true, // تحديث البيانات عند العودة للنافذة
      refetchOnReconnect: true, // تحديث البيانات عند إعادة الاتصال
      refetchOnMount: true, // تحديث البيانات عند تركيب المكون
    }
  }
})

function App() {
  const { theme } = useThemeStore()

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

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <ToastProvider>
            <DiagnosticsProvider>
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
            </DiagnosticsProvider>
          </ToastProvider>
        </ErrorProvider>
        {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App