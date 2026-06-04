import { createClient } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Usar el proxy con URL absoluta en el navegador para burlar firewalls, y la URL real en el servidor (SSR)
const supabaseUrl = isBrowser ? `${window.location.origin}/supabase-api` : originalSupabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!originalSupabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
