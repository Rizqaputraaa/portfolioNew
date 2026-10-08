// Runs SQL against the Supabase Postgres database using DATABASE_URL from .env.local.
//   node scripts/db.mjs --check                      connection test (read only): who am I, which ws_* tables exist
//   node scripts/db.mjs docs/workspace/workspace.sql run a SQL file in one transaction
// DATABASE_URL = the "Session pooler" connection string from Supabase (Connect → Direct). Never commit it.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/db.mjs --check | <file.sql>');
  process.exit(1);
}
if (!env.DATABASE_URL) {
  console.error('DATABASE_URL belum diisi di .env.local');
  process.exit(1);
}

const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  if (arg === '--check') {
    const who = await client.query('select current_user as "user", current_database() as db');
    const tables = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    );
    console.log('Terhubung:', who.rows[0]);
    console.log('Tabel di schema public:', tables.rows.map(r => r.table_name).join(', ') || '(kosong)');
  } else {
    const sql = readFileSync(arg, 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('commit');
      console.log(`Selesai: ${arg}`);
    } catch (e) {
      await client.query('rollback');
      throw e;
    }
  }
} catch (e) {
  console.error('Gagal:', e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
