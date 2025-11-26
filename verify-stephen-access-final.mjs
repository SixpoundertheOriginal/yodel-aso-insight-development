#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== Final Stephen Access Verification ===\n');

// Test query that frontend uses
console.log('1️⃣  Testing organization_features query (frontend uses this)...');
const { data, error } = await supabase
  .from('organization_features')
  .select('feature_key, is_enabled')
  .eq('organization_id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b');

if (error) {
  console.log('   ❌ Query failed:', error.code, error.message);
} else {
  console.log('   ✅ Query succeeded! Retrieved', data?.length, 'features');
  
  // Check aso_ai_hub specifically
  const asoAiHub = data?.find(f => f.feature_key === 'aso_ai_hub');
  console.log('\n2️⃣  ASO AI Hub feature status:');
  if (asoAiHub) {
    console.log('   ✅ Feature exists');
    console.log('   ', asoAiHub.is_enabled ? '✅ ENABLED' : '❌ DISABLED');
  } else {
    console.log('   ❌ Feature NOT FOUND in organization_features');
  }
  
  // Show all enabled features
  const enabledFeatures = data?.filter(f => f.is_enabled).map(f => f.feature_key) || [];
  console.log('\n3️⃣  All enabled features:', enabledFeatures);
}

console.log('\n=== Summary ===');
console.log('Stephen (stephen@yodelmobile.com) access status:');
console.log('  • Organization: Yodel Mobile');
console.log('  • Role: ASO_MANAGER');
console.log('  • Can access /aso-ai-hub:', error ? '❌ NO (RLS error)' : (data?.find(f => f.feature_key === 'aso_ai_hub' && f.is_enabled) ? '✅ YES' : '❌ NO (feature disabled)'));
console.log('\n');
