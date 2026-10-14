import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET } from './server';
import { RaketImageError, fetchLargestImage, nameKey } from './raket-image';

/** The racket photo library: one original per racket name, shared by every feed and project. */

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

export interface SaveResult { kept?: boolean; width?: number; height?: number }

/**
 * Fetches the largest photo behind `url` (or the next-largest for rank > 0) and stores it for the racket.
 * Without `force`, a racket that already has a photo is left alone. Throws RaketImageError with a readable message.
 */
export async function saveRacketImage(
  client: SupabaseClient,
  opts: { name: string; url: string; force?: boolean; rank?: number },
): Promise<SaveResult> {
  const key = nameKey(opts.name);
  const { data: existing } = await client.from('ws_racket_assets').select('id, image_path').eq('name_key', key).maybeSingle();
  if (existing && !opts.force) return { kept: true };

  const found = await fetchLargestImage(opts.url, opts.rank ?? 0);
  const path = `rackets/${crypto.randomUUID()}.${EXT[found.mime] ?? 'jpg'}`;
  const { error: upErr } = await client.storage.from(BUCKET).upload(path, found.bytes, { contentType: found.mime });
  if (upErr) throw new RaketImageError(upErr.message);

  const row = {
    name_key: key, name: opts.name, source_url: opts.url, image_path: path,
    width: found.width, height: found.height, size_bytes: found.bytes.length, mime_type: found.mime,
  };
  const { error } = existing
    ? await client.from('ws_racket_assets').update(row).eq('id', existing.id)
    : await client.from('ws_racket_assets').insert(row);
  if (error) {
    await client.storage.from(BUCKET).remove([path]);
    throw new RaketImageError(error.message);
  }
  if (existing) await client.storage.from(BUCKET).remove([existing.image_path]);
  return { width: found.width, height: found.height };
}

export async function deleteRacketAsset(client: SupabaseClient, id: string): Promise<boolean> {
  const { data: asset } = await client.from('ws_racket_assets').select('image_path').eq('id', id).maybeSingle();
  if (!asset) return false;
  await client.storage.from(BUCKET).remove([asset.image_path]);
  await client.from('ws_racket_assets').delete().eq('id', id);
  return true;
}
