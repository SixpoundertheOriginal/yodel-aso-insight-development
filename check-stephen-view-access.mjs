#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STEPHEN_ID = 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function checkStephenViewAccess() {
  console.log('\n=== Checking user_role_permissions view for Stephen ===\n');

  // Check what the view returns
  const { data: allPerms, error: allError } = await supabase
    .from('user_role_permissions')
    .select('*')
    .eq('user_id', STEPHEN_ID);

  if (allError) {
    console.error('❌ Error querying view:', allError);
  } else {
    console.log(`✅ Found ${allPerms?.length || 0} permissions in view`);
    console.log('\nAll permissions:');
    allPerms?.forEach(p => console.log(`  - ${p.feature_key}`));
  }

  // Check specifically for app_core_access
  console.log('\n--- Checking app_core_access specifically ---\n');
  const { data: coreAccess, error: coreError } = await supabase
    .from('user_role_permissions')
    .select('feature_key')
    .eq('user_id', STEPHEN_ID)
    .eq('feature_key', 'app_core_access')
    .single();

  if (coreError) {
    console.log(`❌ app_core_access NOT found: ${coreError.code} ${coreError.message}`);
  } else {
    console.log('✅ app_core_access FOUND:', coreAccess);
  }

  console.log('\n');
}

checkStephenViewAccess();
