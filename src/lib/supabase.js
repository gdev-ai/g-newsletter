import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export { url as supabaseUrl, key as supabaseAnonKey }

export const configError = url && key
  ? ''
  : 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.'

// Data requests give up after 15s so a dead backend shows an error instead of hanging.
// Storage uploads are exempt because large images can legitimately take longer.
const timedFetch = (input, init = {}) => {
  const isUpload = String(input?.url ?? input).includes('/storage/v1/')
  if (init.signal || isUpload) return fetch(input, init)
  return fetch(input, { ...init, signal: AbortSignal.timeout(15000) })
}

export const supabase = configError ? null : createClient(url, key, { global: { fetch: timedFetch } })

// Turns a Supabase/network error into a short readable message.
export const errorText = (e) => {
  const m = e?.message || String(e || '')
  if (/timeout|abort/i.test(m)) return 'The server took too long to respond.'
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'Could not reach the server.'
  return m || 'Something went wrong.'
}

// Uploads an image to the public "media" bucket and returns its public URL.
export async function uploadImage(file) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
