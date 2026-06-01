import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

// iOS Safari private browsing disables localStorage entirely — this wrapper
// prevents a crash by falling back to in-memory storage silently.
const safeStorage = (() => {
  try {
    const test = '__sb_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return localStorage
  } catch {
    const mem = {}
    return {
      getItem:    (k) => mem[k] ?? null,
      setItem:    (k, v) => { mem[k] = String(v) },
      removeItem: (k) => { delete mem[k] },
    }
  }
})()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: safeStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
