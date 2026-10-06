import { getSupabase } from '@/lib/supabase';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(slug: string, path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(`/api/ws/${slug}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Terjadi kesalahan', res.status);
  return data as T;
}

// Instagram feed is 1080×1350; a 1350px long side keeps that crisp on screen while staying small.
const PREVIEW_MAX = 1350;
const PREVIEW_QUALITY = 0.86;

/** Smaller WebP copy for on-screen preview. Returns null if it would not actually be smaller. */
async function makePreview(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PREVIEW_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', PREVIEW_QUALITY));
    return blob && blob.size < file.size ? blob : null;
  } catch {
    return null;
  }
}

/**
 * Upload straight to private Storage using a server-signed token, then register the row.
 * Design images are stored twice: the untouched original (for download) and a small WebP preview.
 */
export async function uploadFeedFile(
  slug: string,
  feedNumber: number,
  file: File,
  kind: 'brief' | 'design',
  slide?: number,
) {
  const supabase = getSupabase();
  if (!supabase) throw new ApiError('Storage belum siap', 500);
  const base = `/feeds/${feedNumber}/files`;

  const previewBlob = kind === 'design' ? await makePreview(file) : null;

  const signed = await api<{ path: string; token: string; preview: { path: string; token: string } | null }>(
    slug, base, {
      method: 'POST',
      json: { step: 'sign', kind, file_name: file.name, slide, with_preview: !!previewBlob },
    },
  );

  const bucket = supabase.storage.from('workspace');
  const { error } = await bucket.uploadToSignedUrl(signed.path, signed.token, file);
  if (error) throw new ApiError(error.message, 500);

  if (previewBlob && signed.preview) {
    const { error: pErr } = await bucket.uploadToSignedUrl(signed.preview.path, signed.preview.token, previewBlob, {
      contentType: 'image/webp',
    });
    if (pErr) throw new ApiError(pErr.message, 500);
  }

  await api(slug, base, {
    method: 'POST',
    json: {
      step: 'register', kind, slide, path: signed.path,
      preview_path: previewBlob && signed.preview ? signed.preview.path : undefined,
      file_name: file.name, mime_type: file.type, size_bytes: file.size,
    },
  });
}

export const fileUrl = (slug: string, id: string, download = false) =>
  `/api/ws/${slug}/files/${id}${download ? '?download=1' : ''}`;

export const isImage = (mime: string | null, name: string) =>
  (mime ?? '').startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name);

export const fmtSize = (n: number | null) =>
  n == null ? '' : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
