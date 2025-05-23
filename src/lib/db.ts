import { createClient } from '@supabase/supabase-js'
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Letter } from '../types/database'

// Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// IndexedDB setup
interface LettersDB extends DBSchema {
  drafts: {
    keyPath: 'local_id'
    value: {
      id: string | null
      local_id: string
      user_id: string | null
      template_id: string | null
      content: Record<string, any>
      status: 'draft' | 'completed'
      number: number | null
      year: number | null
      last_saved: string
      sync_status: 'pending' | 'synced' | 'failed'
    }
    indexes: {
      'by-date': string
    }
  }
}

let db: IDBPDatabase<LettersDB>

export async function initDB() {
  db = await openDB<LettersDB>('letters-system', 1, {
    upgrade(db) {
      const store = db.createObjectStore('drafts', { keyPath: 'local_id' })
      store.createIndex('by-date', 'last_saved')
    }
  })
}

export async function saveDraft(letter: Partial<Letter>) {
  if (!db) await initDB()
  
  // إنشاء معرف محلي جديد إذا لم يكن موجوداً
  const local_id = letter.local_id || crypto.randomUUID()
  
  const draft = {
    id: letter.id || null,
    local_id,
    user_id: letter.user_id || null,
    template_id: letter.template_id || null,
    content: letter.content || {},
    status: letter.status || 'draft',
    number: letter.number || null,
    year: letter.year || null,
    last_saved: new Date().toISOString(),
    sync_status: 'pending' as const
  }
  
  await db.put('drafts', draft)
  return draft
}

export async function getDraft(local_id: string) {
  if (!db) await initDB()
  return db.get('drafts', local_id)
}

export async function getAllDrafts() {
  if (!db) await initDB()
  return db.getAllFromIndex('drafts', 'by-date')
}

export async function deleteDraft(local_id: string) {
  if (!db) await initDB()
  return db.delete('drafts', local_id)
}