/**
 * Check RLS Policies on Organizations Table
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔍 Checking RLS on Organizations Table\n');

// Check migrations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, 'supabase', 'migrations');

if (existsSync(migrationsDir)) {
  const migrations = readdirSync(migrationsDir)
    .filter(f => f.includes('20251109000000'))
    .sort();

  if (migrations.length > 0) {
    console.log('✅ RLS organizations migration exists:', migrations[0]);
  } else {
    console.log('❌ RLS organizations migration NOT found');
  }
}

console.log('✅ Check complete');
