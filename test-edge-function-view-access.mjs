#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';
const STEPHEN_EMAIL = 'stephen@yodelmobile.com';
const STEPHEN_PASSWORD = 'Test123!';

async function testEdgeFunctionViewAccess() {
  console.log('\n=== Testing Edge Function View Access (simulating what authorize sees) ===\n');

  // Step 1: Sign in as Stephen to get his JWT
  const authClient = createClient(SUPABASE_URL, ANON_KEY);

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: STEPHEN_EMAIL,
    password: STEPHEN_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('❌ Failed to sign in as Stephen:', authError);
    return;
  }

  console.log('✅ Signed in as Stephen');
  console.log(`   User ID: ${authData.user.id}`);
  console.log(`   Session token exists: ${!!authData.session.access_token}\n`);

  // Step 2: Create a client with Stephen's JWT (simulating Edge Function)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // Step 3: Test querying user_role_permissions view
  console.log('--- Testing user_role_permissions view ---\n');

  const { data: allPerms, error: allError } = await userClient
    .from('user_role_permissions')
    .select('*')
    .eq('user_id', authData.user.id);

  if (allError) {
    console.error('❌ Error querying user_role_permissions view:', allError);
  } else {
    console.log(`✅ Found ${allPerms?.length || 0} permissions in view`);
    if (allPerms && allPerms.length > 0) {
      console.log('\nFeatures:');
      allPerms.forEach(p => console.log(`  - ${p.feature_key}`));
    }
  }

  // Step 4: Test specifically for app_core_access (what authorize does)
  console.log('\n--- Testing app_core_access query (what hasFeatureAccess does) ---\n');

  const { data: coreAccess, error: coreError } = await userClient
    .from('user_role_permissions')
    .select('feature_key')
    .eq('user_id', authData.user.id)
    .eq('feature_key', 'app_core_access')
    .single();

  if (coreError) {
    console.error(`❌ Error: ${coreError.code} - ${coreError.message}`);
    console.error('   This is why authorize is failing!');
  } else {
    console.log('✅ app_core_access found:', coreAccess);
    console.log('   Edge Function should allow access');
  }

  // Step 5: Test org_feature_entitlements
  console.log('\n--- Testing org_feature_entitlements ---\n');

  const { data: orgPerms } = await userClient
    .from('user_permissions_unified')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (orgPerms) {
    console.log(`✅ Org ID: ${orgPerms.org_id}`);
    console.log(`   Role: ${orgPerms.effective_role}`);
  }

  const { data: orgFeatures } = await userClient
    .from('org_feature_entitlements')
    .select('feature_key')
    .eq('organization_id', orgPerms?.org_id)
    .eq('feature_key', 'app_core_access')
    .eq('is_enabled', true);

  if (orgFeatures && orgFeatures.length > 0) {
    console.log(`✅ Org has app_core_access enabled`);
  } else {
    console.log(`❌ Org does NOT have app_core_access`);
  }

  console.log('\n=== Test Complete ===\n');
}

testEdgeFunctionViewAccess();
