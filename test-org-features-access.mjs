#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';
const STEPHEN_EMAIL = 'stephen@yodelmobile.com';
const STEPHEN_PASSWORD = 'Test123!';

async function testOrgFeaturesAccess() {
  console.log('\n=== Testing org_feature_entitlements Access (after RLS fix) ===\n');

  // Step 1: Sign in as Stephen
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
  console.log(`   User ID: ${authData.user.id}\n`);

  // Step 2: Create client with Stephen's JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // Step 3: Get Stephen's org_id from user_permissions_unified
  console.log('--- Getting Stephen\'s organization ---\n');

  const { data: perms } = await userClient
    .from('user_permissions_unified')
    .select('org_id')
    .eq('user_id', authData.user.id)
    .single();

  if (!perms?.org_id) {
    console.error('❌ Could not find Stephen\'s organization');
    return;
  }

  console.log(`✅ Stephen's org_id: ${perms.org_id}\n`);

  // Step 4: Test querying org_feature_entitlements (this is what getOrganizationFeatures does)
  console.log('--- Testing org_feature_entitlements query (simulating Edge Function) ---\n');

  const { data: orgFeatures, error: featuresError } = await userClient
    .from('org_feature_entitlements')
    .select('feature_key, is_enabled')
    .eq('organization_id', perms.org_id);

  if (featuresError) {
    console.error(`❌ Error querying org_feature_entitlements:`, featuresError);
    console.error('   Code:', featuresError.code);
    console.error('   Message:', featuresError.message);
    console.error('   This is the error causing the Edge Function to fail!');
  } else {
    console.log(`✅ Successfully queried org_feature_entitlements`);
    console.log(`   Found ${orgFeatures?.length || 0} features\n`);

    // Check specifically for app_core_access
    const coreAccess = orgFeatures?.find(f => f.feature_key === 'app_core_access' && f.is_enabled);
    if (coreAccess) {
      console.log('✅ app_core_access is ENABLED for org');
      console.log('   Layer 1 check should PASS');
    } else {
      console.log('❌ app_core_access NOT found or disabled');
      console.log('   Layer 1 check will FAIL');
    }
  }

  console.log('\n=== Test Complete ===\n');
}

testOrgFeaturesAccess();
