import { useAuth as useSupabaseAuth } from '@supabase/auth-helpers-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

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
    'view:audit_logs',
    'view:approvals',
    'approve:letters',
    'reject:letters'
  ],
  user: [
    'view:letters',
    'create:letters',
    'edit:letters:own',
    'delete:letters:own',
    'view:templates',
    'request:approval'
  ]
}

export function useAuth() {
  const auth = useSupabaseAuth()
  const navigate = useNavigate()

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    navigate('/login')
  }, [navigate])

  const user = useMemo(() => auth.user, [auth.user])

  return {
    user,
    loading: false,
    signIn,
    signOut,
  }
}