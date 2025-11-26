#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function checkTables() {
  console.log('\n=== Checking Feature Tables ===\n');

  // Check organization_features table
  console.log('1. Checking organization_features table...');
  const { data: orgFeatures, error: orgError } = await supabase
    .from('organization_features')
    .select('*')
    .limit(3);

  if (orgError) {
    console.log('  ❌ Error:', orgError.message);
  } else {
    console.log(`  ✅ Found ${orgFeatures?.length || 0} rows`);
    if (orgFeatures && orgFeatures.length > 0) {
      console.log('  Columns:', Object.keys(orgFeatures[0]));
      console.log('  Sample:', orgFeatures[0]);
    }
  }

  // Check org_feature_entitlements table
  console.log('\n2. Checking org_feature_entitlements table...');
  const { data: entitlements, error: entError } = await supabase
    .from('org_feature_entitlements')
    .select('*')
    .limit(3);

  if (entError) {
    console.log('  ❌ Error:', entError.message);
  } else {
    console.log(`  ✅ Found ${entitlements?.length || 0} rows`);
    if (entitlements && entitlements.length > 0) {
      console.log('  Columns:', Object.keys(entitlements[0]));
      console.log('  Sample:', entitlements[0]);
    }
  }

  // Check platform_features table
  console.log('\n3. Checking platform_features table...');
  const { data: platformFeatures, error: platError } = await supabase
    .from('platform_features')
    .select('*')
    .limit(3);

  if (platError) {
    console.log('  ❌ Error:', platError.message);
  } else {
    console.log(`  ✅ Found ${platformFeatures?.length || 0} rows`);
    if (platformFeatures && platformFeatures.length > 0) {
      console.log('  Columns:', Object.keys(platformFeatures[0]));
      console.log('  Sample:', platformFeatures[0]);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log('  organization_features:', orgError ? '❌ Does not exist or no access' : '✅ Exists');
  console.log('  org_feature_entitlements:', entError ? '❌ Does not exist or no access' : '✅ Exists');
  console.log('  platform_features:', platError ? '❌ Does not exist or no access' : '✅ Exists');

  console.log('\n🔍 Analysis:');
  if (!orgError && !entError) {
    console.log('  ⚠️  BOTH tables exist! Need to determine which one is the source of truth.');
  } else if (!orgError && entError) {
    console.log('  ✅ organization_features is the active table');
  } else if (orgError && !entError) {
    console.log('  ✅ org_feature_entitlements is the active table');
  }
}

checkTables();
