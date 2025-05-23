import { useEffect, useState, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { User as DbUser, Permission } from '../types/database'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Default permissions for each role
export const DEFAULT_PERMISSIONS = {
  admin: [
    'view:letters',
    'create:letters',
    'edit:letters',
    'delete:letters',
    'view:templates',
    'create:templates',
    'edit:templates',
    'delete:templates',
    'view:users',
    'create:users',
    'edit:users',
    'delete:users',
    'view:branches',
    'create:branches',
    'edit:branches',
    'delete:branches',
    'view:settings',
    'edit:settings',
    'view:audit_logs'
  ],
  user: [
    'view:letters',
    'create:letters',
    'edit:letters:own',
    'delete:letters:own',
    'view:templates'
  ]
}

// Type for auth context
interface AuthContextType {
  user: AuthUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  isAdmin: false,
  hasPermission: () => false,
  logout: async () => {}
});

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: dbUser, isLoading: isDbUserLoading } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('users')
        .select('*, branches(*)')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      
      // مهم: التحقق من حالة تنشيط المستخدم
      if (data && !data.is_active && data.role !== 'admin') {
        // إذا كان المستخدم غير نشط، قم بتسجيل الخروج وإعادة توجيهه إلى صفحة تسجيل الدخول
        await supabase.auth.signOut()
        setUser(null)
        navigate('/login', { 
          state: { 
            message: 'تم تعطيل حسابك. يرجى التواصل مع المسؤول.' 
          } 
        })
        return null
      }
      
      return data
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    retry: 3
  })

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  // Check if user has a specific permission
  const hasPermission = (permission: string) => {
    if (!dbUser) return false
    
    // Admins have all permissions
    if (dbUser.role === 'admin') return true
    
    // For regular users, check default permissions based on role
    const userPermissions = DEFAULT_PERMISSIONS[dbUser.role] || []
    
    // Add any custom permissions assigned to the user
    if (dbUser.permissions && Array.isArray(dbUser.permissions)) {
      userPermissions.push(...dbUser.permissions)
    }
    
    // Handle ownership-specific permissions (e.g., "edit:letters:own")
    if (permission.endsWith(':own')) {
      const basePermission = permission.replace(':own', '')
      return userPermissions.includes(basePermission) || userPermissions.includes(permission)
    }
    
    return userPermissions.includes(permission)
  }

  // Logout function
  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      dbUser, 
      loading: loading || isDbUserLoading, 
      isAdmin: dbUser?.role === 'admin',
      hasPermission,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}