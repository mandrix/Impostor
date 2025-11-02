import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getSupabaseKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

function getSupabaseAdminKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function createSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  
  if (!url || !key) {
    // En build time, crear un cliente dummy que no se usará
    // En runtime, esto se validará cuando se intente usar
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }
  
  return createClient(url, key)
}

function createSupabaseAdminClient(): SupabaseClient {
  const url = getSupabaseUrl()
  const key = getSupabaseAdminKey()
  
  if (!url || !key) {
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export const supabase = createSupabaseClient()
export const supabaseAdmin = createSupabaseAdminClient()
