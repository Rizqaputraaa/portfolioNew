// Removes every feed (and its slides, files, links, comments, revisions, read markers) from a workspace,
// plus the uploaded files in Storage. The project and its member PINs are kept.
//   node scripts/ws-clear.mjs padel
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/ws-clear.mjs <slug>');
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = db.storage.from('workspace');

const { data: project, error: pErr } = await db.from('ws_projects').select('id, name').eq('slug', slug).maybeSingle();
if (pErr || !project) {
  console.error('Project not found:', pErr?.message ?? slug);
  process.exit(1);
}

// Storage listing is one level at a time: folders have no id, files do.
async function listAll(prefix) {
  const out = [];
  const { data, error } = await bucket.list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${prefix}: ${error.message}`);
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    if (item.id) out.push(path);
    else out.push(...(await listAll(path)));
  }
  return out;
}

const { count: feedCount } = await db
  .from('ws_feeds').select('id', { count: 'exact', head: true }).eq('project_id', project.id);
const paths = await listAll(project.id);
console.log(`Workspace "${project.name}": ${feedCount ?? 0} feed, ${paths.length} file di storage`);

for (let i = 0; i < paths.length; i += 100) {
  const { error } = await bucket.remove(paths.slice(i, i + 100));
  if (error) { console.error('Storage remove:', error.message); process.exit(1); }
}

// Children (slides, files, links, comments, revisions, reads) go with the feeds via ON DELETE CASCADE.
const { error: dErr } = await db.from('ws_feeds').delete().eq('project_id', project.id);
if (dErr) { console.error('Delete feeds:', dErr.message); process.exit(1); }

await db.from('ws_projects').update({ failed_attempts: 0, locked_until: null }).eq('id', project.id);

const left = await db.from('ws_feeds').select('id', { count: 'exact', head: true }).eq('project_id', project.id);
const leftFiles = await listAll(project.id);
console.log(`Selesai. Sisa: ${left.count ?? 0} feed, ${leftFiles.length} file.`);
