/**
 * Combines all migration files into one SQL file for Supabase Dashboard → SQL Editor.
 *
 * Usage:
 *   npm run db:combine
 *
 * Then open supabase/full-schema.sql, copy all, paste in SQL Editor, and Run.
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const outPath = join(root, 'supabase', 'full-schema.sql');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const parts = files.map((file) => {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  return `-- ═══════════════════════════════════════════════════════════════\n-- ${file}\n-- ═══════════════════════════════════════════════════════════════\n\n${sql.trim()}\n`;
});

const header = `-- DSLMS full schema (auto-generated)\n-- Run this once in Supabase Dashboard → SQL Editor\n-- Generated: ${new Date().toISOString()}\n-- Migration files: ${files.length}\n\n`;

writeFileSync(outPath, header + parts.join('\n'), 'utf8');

console.log(`✅ Combined ${files.length} migrations → supabase/full-schema.sql`);
console.log('');
console.log('Next steps:');
console.log('  1. Supabase Dashboard → SQL Editor → New query');
console.log('  2. Paste contents of supabase/full-schema.sql → Run');
console.log('  3. npm run db:seed-admin');
