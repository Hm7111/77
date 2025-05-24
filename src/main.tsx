import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx';
import './index.css';
import { ErrorProvider } from './providers/ErrorProvider';
import { ToastProvider } from './providers/ToastProvider';

// تحسين: تكوين أكثر كفاءة لمكتبة React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // تحسين: تقليل عدد المحاولات من 3 إلى 2
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 20000), // تقليل الحد الأقصى
      staleTime: 1000 * 60 * 2, // تحسين: زيادة وقت التقادم إلى دقيقتين
      cacheTime: 1000 * 60 * 20, // تحسين: تقليل وقت التخزين المؤقت
      refetchOnWindowFocus: false, // تحسين: إيقاف إعادة الجلب عند التركيز 
      refetchOnReconnect: true,
      refetchOnMount: true,
      suspense: false, // تحسين: تعطيل Suspense حتى تتم إدارته بشكل صريح
    }
  }
})

// تحسين: استخدام بوابة تقديم جذر واحدة
const root = createRoot(document.getElementById('root')!);
root.render(
  // تحسين: استخدام StrictMode فقط في وضع التطوير
  import.meta.env.DEV ? (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ErrorProvider>
      </QueryClientProvider>
    </StrictMode>
  ) : (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorProvider>
    </QueryClientProvider>
  )
);