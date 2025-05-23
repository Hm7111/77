import { useState, useCallback, ReactNode, useEffect } from 'react'
import { Toast, ToastContainer } from '../components/ui/Toast'
import { createRoot } from 'react-dom/client'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
}

// إنشاء حاوية للتنبيهات إذا لم تكن موجودة
function getOrCreateToastContainer() {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  return container
}

// مُعرّف فريد للتنبيهات
let toastCounter = 0

// المكون الرئيسي لإدارة التنبيهات
function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((options: ToastOptions) => {
    const id = `toast-${++toastCounter}`
    setToasts(prev => [...prev, { id, ...options }])
    
    // إزالة التنبيه تلقائياً بعد المدة المحددة
    if (options.duration !== Infinity) {
      setTimeout(() => {
        removeToast(id)
      }, (options.duration || 5000) + 300) // إضافة وقت للانتقال
    }
    
    return id
  }, [removeToast])

  // عرض التنبيهات
  return (
    <ToastContainer>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          type={toast.type || 'info'}
          duration={toast.duration || 5000}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContainer>
  )
}

// واجهة عامة للاستخدام
let toastRoot: ReturnType<typeof createRoot> | null = null
let addToastFn: ((options: ToastOptions) => string) | null = null

function createToastProvider() {
  const container = getOrCreateToastContainer()
  toastRoot = createRoot(container)
  
  const ToastProviderWithCallbacks = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([])
  
    const removeToast = useCallback((id: string) => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])
  
    const addToast = useCallback((options: ToastOptions) => {
      const id = `toast-${++toastCounter}`
      setToasts(prev => [...prev, { id, ...options }])
      
      // إزالة التنبيه تلقائياً بعد المدة المحددة
      if (options.duration !== Infinity) {
        setTimeout(() => {
          removeToast(id)
        }, (options.duration || 5000) + 300) // إضافة وقت للانتقال
      }
      
      return id
    }, [removeToast])
  
    // تخزين دالة إضافة التنبيه
    useEffect(() => {
      addToastFn = addToast
    }, [addToast])
  
    return (
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            id={toast.id}
            title={toast.title}
            description={toast.description}
            type={toast.type || 'info'}
            duration={toast.duration || 5000}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    )
  }
  
  toastRoot.render(<ToastProviderWithCallbacks />)
}

// تأكد من تهيئة مزود التنبيهات عند استدعاء الدالة
function ensureToastProvider() {
  if (!toastRoot) {
    createToastProvider()
  }
}

export function useToast() {
  ensureToastProvider()
  
  const toast = useCallback((options: ToastOptions) => {
    if (!addToastFn) {
      console.error('Toast provider not initialized')
      return ''
    }
    
    return addToastFn(options)
  }, [])

  return { toast }
}