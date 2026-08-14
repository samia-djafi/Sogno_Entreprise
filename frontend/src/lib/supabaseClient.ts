import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface ProfileRow {
  id: string
  full_name: string
  email: string
  role: 'employee' | 'manager' | 'admin'
  department: string
  initials: string
  created_at: string
}

export interface DocumentRow {
  id: string
  name: string
  department: string
  version: string
  status: 'Active' | 'Archived'
  access: 'all_employees' | 'managers_only' | 'restricted'
  restricted_department: string | null
  type: 'pdf' | 'docx'
  size_bytes: number
  pages: number
  description: string
  storage_path: string
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface ConversationRow {
  id: string
  user_id: string
  title: string
  created_at: string
  saved: boolean
}

export interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  sources?: { document: string; page: number; section?: string }[] | null
  feedback?: 'helpful' | 'not_helpful' | null
}