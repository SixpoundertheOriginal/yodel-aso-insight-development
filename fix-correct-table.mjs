#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('\n=== Restricting Stephen to ASO AI Hub ONLY (Correct Table) ===\n');

// Features Stephen needs
const REQUIRED_FEATURES = [
  'aso_ai_hub',         // ASO AI Hub access
  'profile_management', // User profile access
  'preferences'         // User preferences
];

console.log('✅ Features Stephen will keep:', REQUIRED_FEATURES);

// 1. Get all current features from organization_features
const { data: currentFeatures } = await supabase
  .from('organization_features')
  .select('feature_key, is_enabled')
  .eq('organization_id', YODEL_MOBILE_ORG_ID);

console.log(`\n📊 Current state: ${currentFeatures?.length} features`);
const enabledFeatures = currentFeatures?.filter(f => f.is_enabled) || [];
console.log(`   - ${enabledFeatures.length} enabled`);

// 2. Disable all features except required ones
const featuresToDisable = enabledFeatures
  .filter(f => !REQUIRED_FEATURES.includes(f.feature_key))
  .map(f => f.feature_key);

console.log(`\n🚫 Disabling ${featuresToDisable.length} features...`);

for (const featureKey of featuresToDisable) {
  const { error } = await supabase
    .from('organization_features')
    .update({ is_enabled: false })
    .eq('organization_id', YODEL_MOBILE_ORG_ID)
    .eq('feature_key', featureKey);

  if (error) {
    console.error(`   ❌ Failed to disable ${featureKey}:`, error);
  } else {
    console.log(`   ✓ Disabled ${featureKey}`);
  }
}

// 3. Ensure required features are enabled
console.log(`\n✅ Ensuring required features are enabled...`);
for (const featureKey of REQUIRED_FEATURES) {
  const exists = currentFeatures?.find(f => f.feature_key === featureKey);
  
  if (exists) {
    const { error } = await supabase
      .from('organization_features')
      .update({ is_enabled: true })
      .eq('organization_id', YODEL_MOBILE_ORG_ID)
      .eq('feature_key', featureKey);

    if (error) {
      console.error(`   ❌ Failed to enable ${featureKey}:`, error);
    } else {
      console.log(`   ✓ Enabled ${featureKey}`);
    }
  } else {
    const { error } = await supabase
      .from('organization_features')
      .insert({
        organization_id: YODEL_MOBILE_ORG_ID,
        feature_key: featureKey,
        is_enabled: true
      });

    if (error) {
      console.error(`   ❌ Failed to add ${featureKey}:`, error);
    } else {
      console.log(`   ✓ Added ${featureKey}`);
    }
  }
}

// 4. Verify final state
const { data: finalFeatures } = await supabase
  .from('organization_features')
  .select('feature_key, is_enabled')
  .eq('organization_id', YODEL_MOBILE_ORG_ID)
  .eq('is_enabled', true);

console.log(`\n📊 Final state: ${finalFeatures?.length} features enabled`);
console.log('   Enabled features:', finalFeatures?.map(f => f.feature_key));

console.log('\n=== Access Restriction Complete ===');
console.log('Stephen can now access:');
console.log('  ✅ /aso-ai-hub (ASO AI Hub)');
console.log('  ✅ /profile (User profile)');
console.log('  ❌ All other pages (disabled)');
console.log('\n');
