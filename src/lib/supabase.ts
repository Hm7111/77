import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
    throw new Error('Supabase URL and Anon Key must be provided')
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