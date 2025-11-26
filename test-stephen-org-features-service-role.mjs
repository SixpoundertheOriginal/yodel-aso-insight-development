#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STEPHEN_ID = 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function testStephenOrgFeatures() {
  console.log('\n=== Testing Stephen\'s org_feature_entitlements Access ===\n');

  // Step 1: Get Stephen's org_id
  const { data: perms } = await supabase
    .from('user_permissions_unified')
    .select('org_id, effective_role')
    .eq('user_id', STEPHEN_ID)
    .single();

  if (!perms?.org_id) {
    console.error('❌ Could not find Stephen\'s organization');
    return;
  }

  console.log(`✅ Stephen's org_id: ${perms.org_id}`);
  console.log(`   Role: ${perms.effective_role}\n`);

  // Step 2: Check if org has app_core_access enabled
  console.log('--- Checking org_feature_entitlements ---\n');

  const { data: orgFeatures, error: featuresError } = await supabase
    .from('org_feature_entitlements')
    .select('feature_key, is_enabled')
    .eq('organization_id', perms.org_id);

  if (featuresError) {
    console.error(`❌ Error:`, featuresError);
  } else {
    console.log(`✅ Found ${orgFeatures?.length || 0} features for org\n`);

    const enabledFeatures = orgFeatures?.filter(f => f.is_enabled) || [];
    console.log(`   ${enabledFeatures.length} enabled features:`);
    enabledFeatures.forEach(f => {
      const marker = f.feature_key === 'app_core_access' ? '⭐' : '  ';
      console.log(`   ${marker} ${f.feature_key}`);
    });

    const coreAccess = orgFeatures?.find(f => f.feature_key === 'app_core_access' && f.is_enabled);
    console.log('');
    if (coreAccess) {
      console.log('✅ app_core_access is ENABLED - Layer 1 should PASS');
    } else {
      console.log('❌ app_core_access NOT enabled - Layer 1 will FAIL');
    }
  }

  // Step 3: Check RLS policies on the table
  console.log('\n--- Checking RLS Policies on org_feature_entitlements ---\n');

  const { data: policies } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, qual
        FROM pg_policies
        WHERE tablename = 'org_feature_entitlements'
        ORDER BY policyname;
      `
    })
    .single();

  if (policies) {
    console.log('RLS Policies:', JSON.stringify(policies, null, 2));
  }

  console.log('\n=== Test Complete ===\n');
}

testStephenOrgFeatures();
