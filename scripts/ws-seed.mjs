// Creates a workspace project + 3 members with random PINs and prints the PINs ONCE.
//   node scripts/ws-seed.mjs padel "Padel Feed" "Oktober 2026" 10
// Re-running with an existing slug resets the PINs. Requires workspace.sql to be applied first.
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { randomBytes, randomInt, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);

const [slug, name = 'Workspace', month = null, target = '10'] = process.argv.slice(2);
if (!slug) {
  console.error('Usage: node scripts/ws-seed.mjs <slug> [name] [month label] [target feeds]');
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const hashPin = pin => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
};
const newPin = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

const { data: project, error } = await db
  .from('ws_projects')
  .upsert({ slug, name, month_label: month, target_feeds: Number(target) }, { onConflict: 'slug' })
  .select('id').single();
if (error) { console.error('Project:', error.message); process.exit(1); }

const members = [
  { role: 'designer', name: 'Designer' },
  { role: 'gozi', name: 'Danta' },
  { role: 'client', name: 'Client' },
];

const out = [];
const used = new Set();
for (const m of members) {
  let pin = newPin();
  while (used.has(pin)) pin = newPin(); // login is PIN-only, so PINs must be unique per project
  used.add(pin);
  const { error: e } = await db.from('ws_members').upsert(
    { project_id: project.id, role: m.role, name: m.name, pin_hash: hashPin(pin), failed_attempts: 0, locked_until: null },
    { onConflict: 'project_id,role' },
  );
  if (e) { console.error(`Member ${m.role}:`, e.message); process.exit(1); }
  out.push(`${m.role.padEnd(9)} PIN ${pin}`);
}

console.log(`\nWorkspace /workspace/${slug} ready. Save these PINs now — they are not stored in plain text:\n`);
console.log(out.join('\n'));
