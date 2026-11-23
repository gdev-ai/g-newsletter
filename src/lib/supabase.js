import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// Uploads an image to the public "media" bucket and returns its public URL.
export async function uploadImage(file) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
