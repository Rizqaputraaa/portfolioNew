// Project switches.
//   node scripts/ws-project.mjs padel no-client    → nobody signs in as the client; Danta sends results by WhatsApp
//   node scripts/ws-project.mjs padel with-client  → turn the client side back on (then run ws-seed to get a client PIN)
//   node scripts/ws-project.mjs <slug> delete      → remove a project that has no feeds yet (add "force" to remove one that has)
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);

const [slug, action] = process.argv.slice(2);
const force = process.argv[4] === 'force';
if (!slug || !['no-client', 'with-client', 'delete'].includes(action)) {
  console.error('Usage: node scripts/ws-project.mjs <slug> <no-client | with-client | delete> [force]');
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: project, error } = await db.from('ws_projects').select('id, name, avatar_path').eq('slug', slug).maybeSingle();
if (error || !project) {
  console.error('Project not found:', error?.message ?? slug);
  process.exit(1);
}

if (action === 'delete') {
  const { count: feeds } = await db.from('ws_feeds').select('id', { count: 'exact', head: true }).eq('project_id', project.id);
  if ((feeds ?? 0) > 0 && !force) {
    console.error(`"${project.name}" punya ${feeds} feed. Tidak dihapus. Tambahkan "force" kalau memang mau menghapus semuanya.`);
    process.exit(1);
  }

  // Uploaded files first (the database rows go with the project through ON DELETE CASCADE).
  const bucket = db.storage.from('workspace');
  async function listAll(prefix) {
    const out = [];
    const { data } = await bucket.list(prefix, { limit: 1000 });
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id) out.push(path); else out.push(...(await listAll(path)));
    }
    return out;
  }
  const paths = await listAll(project.id);
  if (project.avatar_path) paths.push(project.avatar_path);
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));

  const { error: delError } = await db.from('ws_projects').delete().eq('id', project.id);
  if (delError) { console.error(delError.message); process.exit(1); }
  console.log(`"${project.name}" dihapus (${feeds ?? 0} feed, ${paths.length} file).`);
} else if (action === 'no-client') {
  const { error: e1 } = await db.from('ws_projects').update({ client_enabled: false }).eq('id', project.id);
  if (e1) { console.error(e1.message); process.exit(1); }
  // The client PIN stops working immediately, and the account is removed.
  const { error: e2 } = await db.from('ws_members').delete().eq('project_id', project.id).eq('role', 'client');
  if (e2) { console.error(e2.message); process.exit(1); }
  console.log(`"${project.name}": client dimatikan. PIN client tidak berlaku lagi.`);
} else {
  const { error: e1 } = await db.from('ws_projects').update({ client_enabled: true }).eq('id', project.id);
  if (e1) { console.error(e1.message); process.exit(1); }
  console.log(`"${project.name}": client dinyalakan. Jalankan ws-seed untuk membuat PIN client.`);
}
