#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function addCoreAccessToAsoManager() {
  console.log('\n=== Adding app_core_access to ASO_MANAGER role ===\n');

  const { error } = await supabase
    .from('role_feature_permissions')
    .upsert({
      role: 'ASO_MANAGER',
      feature_key: 'app_core_access',
      is_allowed: true,
    }, {
      onConflict: 'role,feature_key'
    });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Successfully granted app_core_access to ASO_MANAGER role');

  // Verify
  const { data: permissions } = await supabase
    .from('role_feature_permissions')
    .select('feature_key')
    .eq('role', 'ASO_MANAGER')
    .eq('is_allowed', true);

  console.log(`\n📊 ASO_MANAGER now has ${permissions?.length || 0} features enabled\n`);
}

addCoreAccessToAsoManager();
