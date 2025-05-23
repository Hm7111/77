import { useState, useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react'
import ReactDOM from 'react-dom'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastProps {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({
  id,
  title,
  description,
  type = 'info',
  duration = 5000,
  onClose
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const timer = useRef<NodeJS.Timeout>()
  const remaining = useRef(duration)
  const start = useRef<number>()
  
  // الرموز والألوان حسب نوع التنبيه
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />
  }
  
  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200'
  }

  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-amber-500'
  }

  useEffect(() => {
    setIsVisible(true)
    startTimer()
    return clearTimer
  }, [])

  const startTimer = () => {
    clearTimer()
    start.current = Date.now()
    timer.current = setTimeout(handleClose, remaining.current)
  }

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = undefined
    }
  }

  const pauseTimer = () => {
    if (isPaused || !start.current) return
    clearTimer()
    remaining.current -= Date.now() - start.current
    setIsPaused(true)
  }

  const resumeTimer = () => {
    if (!isPaused) return
    start.current = Date.now()
    setIsPaused(false)
    timer.current = setTimeout(handleClose, remaining.current)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <div
      className={`max-w-md w-full pointer-events-auto overflow-hidden rounded-lg border shadow-lg transition-all duration-300 ${colors[type]} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      role="alert"
    >
      <div className="relative flex w-full items-center p-4">
        <div className={`flex-shrink-0 ${iconColors[type]}`}>
          {icons[type]}
        </div>
        <div className="mr-3 flex-1">
          <p className="font-medium">{title}</p>
          {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
        </div>
        <button
          type="button"
          className="flex rounded p-1.5 text-gray-400 hover:text-gray-900 focus:outline-none"
          onClick={handleClose}
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {duration > 0 && (
        <div className="h-1 w-full bg-gray-200">
          <div
            className={`h-full transition-all duration-100 ${
              type === 'success' ? 'bg-green-500' :
              type === 'error' ? 'bg-red-500' :
              type === 'warning' ? 'bg-amber-500' :
              'bg-blue-500'
            }`}
            style={{
              width: isPaused ? `${(remaining.current / duration) * 100}%` : 0,
              transitionDuration: isPaused ? '100ms' : `${remaining.current}ms`,
              transitionTimingFunction: 'linear',
              transitionProperty: isPaused ? 'all' : 'width',
            }}
          />
        </div>
      )}
    </div>
  )
}

interface ToastContainerProps {
  children: React.ReactNode
}

export function ToastContainer({ children }: ToastContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  useEffect(() => {
    const container = document.createElement('div')
    container.className = 'fixed bottom-4 left-4 z-50 flex flex-col gap-2'
    document.body.appendChild(container)
    containerRef.current = container
    
    return () => {
      document.body.removeChild(container)
    }
  }, [])
  
  if (!containerRef.current) return null
  
  return ReactDOM.createPortal(children, containerRef.current)
}