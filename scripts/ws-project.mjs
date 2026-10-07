// Project switches.
//   node scripts/ws-project.mjs padel no-client    → nobody signs in as the client; Danta sends results by WhatsApp
//   node scripts/ws-project.mjs padel with-client  → turn the client side back on (then run ws-seed to get a client PIN)
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
if (!slug || !['no-client', 'with-client'].includes(action)) {
  console.error('Usage: node scripts/ws-project.mjs <slug> <no-client | with-client>');
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: project, error } = await db.from('ws_projects').select('id, name').eq('slug', slug).maybeSingle();
if (error || !project) {
  console.error('Project not found:', error?.message ?? slug);
  process.exit(1);
}

if (action === 'no-client') {
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
