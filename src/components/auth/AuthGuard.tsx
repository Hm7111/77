import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // إذا لم يكن المستخدم مسجل الدخول وليس في صفحة تسجيل الدخول
  if (!user && !isLoginPage) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // إذا كان المستخدم مسجل الدخول وفي صفحة تسجيل الدخول
  if (user && isLoginPage) {
    return <Navigate to="/admin" replace />
  }

  return children
}