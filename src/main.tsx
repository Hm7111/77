import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx';
import './index.css';
import { ErrorProvider } from './providers/ErrorProvider';
import { ToastProvider } from './providers/ToastProvider';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorProvider>
    </QueryClientProvider>
  </StrictMode>
);