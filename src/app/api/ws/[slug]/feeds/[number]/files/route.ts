import { NextRequest, NextResponse } from 'next/server';
import { BUCKET, briefChanged, db, fail, requireSession, touch } from '@/lib/workspace/server';
import { lastSentVersion } from '@/lib/workspace/feeds';
import { MAX_SLIDES } from '@/lib/workspace/types';
import type { Role } from '@/lib/workspace/types';

type Ctx = { params: { slug: string; number: string } };

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, '_').slice(-120);

/**
 * Two-step upload so large design files never pass through the serverless body limit:
 *  1. { step: 'sign', kind, file_name, slide? }  → { path, token } (signed upload URL)
 *  2. browser uploads straight to Storage with that token
 *  3. { step: 'register', kind, path, file_name, mime_type, size_bytes, slide? } → saves the DB row
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === 'design' ? 'design' : 'brief';
  const role = session.role as Role;

  if (kind === 'design' && role !== 'designer') return fail('Hanya designer yang upload desain', 403);
  if (kind === 'brief' && role === 'designer') return fail('Brief diunggah oleh Danta atau client', 403);

  const { data: feed } = await client
    .from('ws_feeds').select('id, status, created_by')
    .eq('project_id', session.pid).eq('number', Number(params.number)).maybeSingle();
  if (!feed) return fail('Feed tidak ditemukan', 404);

  if (kind === 'design' && !['design', 'revision'].includes(feed.status)) {
    return fail('Desain hanya bisa diunggah saat status Desain atau Revisi', 409);
  }
  if (kind === 'brief' && role === 'client' && (feed.status === 'posted' || (feed.status === 'brief' && feed.created_by === 'gozi'))) {
    return fail('Feed ini belum bisa menerima file dari client', 403);
  }

  const slide = kind === 'design' ? Number(body.slide ?? 1) : null;
  if (kind === 'design' && !(slide! >= 1 && slide! <= MAX_SLIDES)) {
    return fail(`Slide harus 1–${MAX_SLIDES}`);
  }

  if (body.step === 'sign') {
    const fileName = safeName(String(body.file_name ?? 'file'));
    const path = `${session.pid}/${feed.id}/${kind}/${Date.now()}-${fileName}`;
    const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail(error?.message ?? 'Gagal menyiapkan upload', 500);

    // Design images also get a small optimised copy for on-screen preview.
    let preview: { path: string; token: string } | null = null;
    if (kind === 'design' && body.with_preview) {
      const base = fileName.replace(/\.[^.]+$/, '');
      const previewPath = `${session.pid}/${feed.id}/preview/${Date.now()}-${base}.webp`;
      const p = await client.storage.from(BUCKET).createSignedUploadUrl(previewPath);
      if (p.error || !p.data) return fail(p.error?.message ?? 'Gagal menyiapkan preview', 500);
      preview = { path: p.data.path, token: p.data.token };
    }
    return NextResponse.json({ path: data.path, token: data.token, preview });
  }

  if (body.step === 'register') {
    const path = String(body.path ?? '');
    // The path must be one we signed for this exact feed — never trust a client-supplied location.
    if (!path.startsWith(`${session.pid}/${feed.id}/${kind}/`)) return fail('Path tidak valid', 400);
    const previewPath = body.preview_path ? String(body.preview_path) : null;
    if (previewPath && !previewPath.startsWith(`${session.pid}/${feed.id}/preview/`)) {
      return fail('Path preview tidak valid', 400);
    }
    const size = Number(body.size_bytes ?? 0);
    if (size > MAX_BYTES) return fail('File terlalu besar (maks 50 MB)');

    let version: number | null = null;
    if (kind === 'design') {
      const { data: comments } = await client
        .from('ws_comments').select('kind, role, version').eq('feed_id', feed.id);
      version = lastSentVersion(
        (comments ?? []) as { kind: 'system'; role: 'system'; version: number | null }[],
      ) + 1;

      // One file per slide per version (replace if re-uploaded).
      const { data: old } = await client
        .from('ws_files').select('id, path, preview_path')
        .eq('feed_id', feed.id).eq('kind', 'design').eq('version', version).eq('slide', slide);
      if (old?.length) {
        await client.storage.from(BUCKET).remove(
          old.flatMap(o => [o.path, ...(o.preview_path ? [o.preview_path] : [])]),
        );
        await client.from('ws_files').delete().in('id', old.map(o => o.id));
      }
    }

    const { error } = await client.from('ws_files').insert({
      feed_id: feed.id, kind, version, slide, path, preview_path: previewPath,
      file_name: String(body.file_name ?? 'file'),
      mime_type: body.mime_type ? String(body.mime_type) : null,
      size_bytes: size || null,
      uploaded_by: role,
    });
    if (error) return fail(error.message, 500);

    if (kind === 'brief' && role === 'client') {
      await client.from('ws_comments').insert({
        feed_id: feed.id, role: 'system', kind: 'system', visibility: 'all',
        body: `Client mengirim file: ${String(body.file_name ?? 'file')}`,
      });
    }
    if (kind === 'brief') await briefChanged(client, feed.id);
    await touch(client, feed.id, role, kind === 'brief');
    return NextResponse.json({ ok: true, version });
  }

  return fail('Step tidak dikenal');
}
