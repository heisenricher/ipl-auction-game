import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Initialize only if keys are present to prevent app crash when running in sandbox/offline mode
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

