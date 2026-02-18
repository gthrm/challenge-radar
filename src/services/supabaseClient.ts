import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey && supabaseAnonKey.startsWith('sb_publishable_')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null
