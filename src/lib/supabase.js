import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Manglende Supabase-miljøvariabler. Opret en .env-fil ud fra .env.example.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
