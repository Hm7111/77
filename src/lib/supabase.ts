import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Fallback values for when environment variables are not available (in production build)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hbxalipjrbcrqljddxfp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieGFsaXBqcmJjcnFsamRkeGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk5OTc1NzQsImV4cCI6MjAyNTU3MzU3NH0.Uh9cFz170xA_jwVhUMlOdHrVrCIIh-QP9L00YCv-62M'

let supabaseInstance: SupabaseClient<Database> | null = null

// Check if we have network connectivity by making a lightweight query
async function checkConnection() {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    })

    const checkPromise = supabaseInstance?.from('users').select('count').limit(1).single()

    const result = await Promise.race([checkPromise, timeoutPromise])
    return result?.error ? false : true
  } catch {
    return false
  }
}

function createSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key not found in environment variables, using fallback values')
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'letters-system-auth',
      detectSessionInUrl: false
    },
    global: {
      headers: { 
        'x-application-name': 'letters-system',
        'Access-Control-Allow-Origin': '*'
      },
      fetch: fetch.bind(globalThis)
    }
  })

  return supabaseInstance
}

export const supabase = createSupabaseClient()
export { checkConnection }