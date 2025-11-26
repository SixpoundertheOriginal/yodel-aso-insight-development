#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function applyMigration() {
  console.log('\n=== Applying Platform Features Migration ===\n');

  const migrationSQL = fs.readFileSync('supabase/migrations/20251125000010_create_platform_features_system.sql', 'utf8');

  console.log('📝 Executing migration SQL...');

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql function doesn't exist, we need to execute commands manually
      console.log('\n⚠️  exec_sql function not available, executing manually...\n');
      await executeMigrationManually();
    } else {
      console.log('\n✅ Migration applied successfully!');
    }
  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.log('\n⚠️  Attempting manual execution...\n');
    await executeMigrationManually();
  }
}

async function executeMigrationManually() {
  console.log('Step 1: Creating platform_features table...');

  const steps = [
    {
      name: 'Create platform_features table',
      check: async () => {
        const { data } = await supabase.from('platform_features').select('*').limit(1);
        return data !== null;
      },
      message: 'platform_features table already exists or created'
    },
    {
      name: 'Create org_feature_entitlements table',
      check: async () => {
        const { data } = await supabase.from('org_feature_entitlements').select('*').limit(1);
        return data !== null;
      },
      message: 'org_feature_entitlements table already exists or created'
    }
  ];

  for (const step of steps) {
    try {
      const exists = await step.check();
      if (exists) {
        console.log(`✅ ${step.message}`);
      } else {
        console.log(`⚠️  ${step.name} - table doesn't exist yet`);
        console.log(`   You need to run this SQL manually in Supabase SQL Editor`);
      }
    } catch (error) {
      console.log(`⚠️  ${step.name} - needs to be created`);
    }
  }

  console.log('\n📋 MANUAL STEPS REQUIRED:');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log('2. Run the migration file: supabase/migrations/20251125000010_create_platform_features_system.sql');
  console.log('3. Or use Supabase CLI: supabase db push');
}

applyMigration();
