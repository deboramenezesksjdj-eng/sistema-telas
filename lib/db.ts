import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas.')
}

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseKey || 'missing', {
  auth: { persistSession: false },
})

export const SCREENS_TABLE = 'screens'
export const DEVICES_TABLE = 'devices'
export const USERS_TABLE = 'users'
