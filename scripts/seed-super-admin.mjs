/**
 * Creates the first Super Admin user in Supabase Auth.
 * Profile row is auto-created by the handle_new_user() database trigger.
 *
 * Prerequisites:
 *   1. Copy .env.example → .env and fill in Supabase keys
 *   2. Run all migrations on your Supabase project
 *
 * Usage:
 *   npm run db:seed-admin
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) {
    console.error('❌ Missing .env file. Copy .env.example → .env and add your Supabase keys.');
    process.exit(1);
  }

  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL || 'admin@dslms.rw';
const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
const fullName = process.env.SUPER_ADMIN_NAME || 'System Owner';

if (!url || !serviceKey) {
  console.error('❌ Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ SUPER_ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('🔐 DSLMS — Seed Super Admin');
console.log(`   Email: ${email}`);

const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error('❌ Failed to list users:', listError.message);
  console.error('   Check your SUPABASE_SERVICE_ROLE_KEY and that migrations are applied.');
  process.exit(1);
}

const alreadyExists = existingUsers.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase()
);

if (alreadyExists) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', alreadyExists.id)
    .maybeSingle();

  if (profileError) {
    console.error('❌ User exists but profile check failed:', profileError.message);
    process.exit(1);
  }

  if (profile?.role !== 'super_admin') {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'super_admin', full_name: fullName, school_id: null, is_active: true })
      .eq('id', alreadyExists.id);

    if (updateError) {
      console.error('❌ Failed to promote user to super_admin:', updateError.message);
      process.exit(1);
    }
    console.log('✅ Existing user promoted to super_admin.');
  } else {
    console.log('✅ Super Admin already exists — nothing to do.');
  }
  process.exit(0);
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: fullName,
    role: 'super_admin',
  },
});

if (createError) {
  console.error('❌ Failed to create Super Admin:', createError.message);
  process.exit(1);
}

const userId = created.user?.id;
if (!userId) {
  console.error('❌ User created but no ID returned.');
  process.exit(1);
}

// Trigger should have created profile; verify
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, full_name, role')
  .eq('id', userId)
  .maybeSingle();

if (profileError || !profile) {
  console.warn('⚠️  User created but profile missing — creating manually...');
  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    role: 'super_admin',
    school_id: null,
    is_active: true,
  });
  if (insertError) {
    console.error('❌ Profile insert failed:', insertError.message);
    console.error('   Ensure migration 20260807191400_auth_trigger_and_seed_plans.sql is applied.');
    process.exit(1);
  }
}

console.log('');
console.log('✅ Super Admin created successfully!');
console.log(`   User ID: ${userId}`);
console.log(`   Login:   ${email}`);
console.log('   (Password is the SUPER_ADMIN_PASSWORD from your .env file)');
console.log('');
console.log('Next: Phase 2 — Login page + protected routes');
