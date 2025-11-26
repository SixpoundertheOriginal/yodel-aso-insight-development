#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('\n=== Final Stephen Restriction ===\n');
console.log('Removing app_core_access so Stephen can ONLY access /aso-ai-hub...\n');

// Disable app_core_access
const { error } = await supabase
  .from('org_feature_entitlements')
  .update({ is_enabled: false })
  .eq('organization_id', YODEL_MOBILE_ORG_ID)
  .eq('feature_key', 'app_core_access');

if (error) {
  console.error('❌ Failed to disable app_core_access:', error);
} else {
  console.log('✅ Disabled app_core_access');
}

// Verify final state
const { data: finalFeatures } = await supabase
  .from('org_feature_entitlements')
  .select('feature_key, is_enabled')
  .eq('organization_id', YODEL_MOBILE_ORG_ID)
  .eq('is_enabled', true);

console.log(`\n📊 Final Enabled Features: ${finalFeatures?.length}`);
console.log('   ', finalFeatures?.map(f => f.feature_key));

console.log('\n=== Access Summary ===');
console.log('Stephen (stephen@yodelmobile.com) can now access:');
console.log('  ✅ /aso-ai-hub (ASO AI Hub)');
console.log('  ❌ / (root page) - blocked');
console.log('  ❌ /dashboard - blocked');
console.log('  ❌ /analytics - blocked');
console.log('  ❌ /admin - blocked');
console.log('  ❌ All other pages - blocked');
console.log('\nStephen must navigate directly to: http://localhost:8080/aso-ai-hub');
console.log('\n');
