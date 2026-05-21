import { getSupabase } from './supabase';

export async function uploadFile(folder: string, file: File): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const path = `${folder}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
