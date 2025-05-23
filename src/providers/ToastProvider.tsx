import { createContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastContainer, ToastType } from '../components/ui/Toast'

interface ToastContextProps {
  addToast: (props: {
    title: string
    description?: string
    type?: ToastType
    duration?: number
  }) => void
}

export const ToastContext = createContext<ToastContextProps>({
  addToast: () => {},
})

interface ToastProviderProps {
  children: ReactNode
}

interface ToastItem {
  id: string
  title: string
  description?: string
  type: ToastType
  duration: number
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    ({
      title,
      description,
      type = 'info',
      duration = 5000,
    }: {
      title: string
      description?: string
      type?: ToastType
      duration?: number
    }) => {
      const id = Math.random().toString(36).substring(2, 9)
      
      setToasts((prevToasts) => [
        ...prevToasts,
        { id, title, description, type, duration },
      ])

      if (duration !== Infinity) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            title={toast.title}
            description={toast.description}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  )
}