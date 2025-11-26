#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YODEL_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function compareFeatureTables() {
  console.log('\n=== Comparing Feature Tables ===\n');

  // Get features from organization_features
  const { data: orgFeatures, error: orgError } = await supabase
    .from('organization_features')
    .select('feature_key')
    .eq('organization_id', YODEL_ORG_ID)
    .eq('is_enabled', true);

  if (orgError) {
    console.error('Error loading organization_features:', orgError);
    return;
  }

  // Get features from org_feature_entitlements
  const { data: entitlements, error: entError } = await supabase
    .from('org_feature_entitlements')
    .select('feature_key')
    .eq('organization_id', YODEL_ORG_ID)
    .eq('is_enabled', true);

  if (entError) {
    console.error('Error loading org_feature_entitlements:', entError);
    return;
  }

  const orgSet = new Set(orgFeatures?.map(f => f.feature_key) || []);
  const entSet = new Set(entitlements?.map(f => f.feature_key) || []);

  console.log(`organization_features: ${orgSet.size} features`);
  console.log(`org_feature_entitlements: ${entSet.size} features\n`);

  // Find missing features
  const missing = [...orgSet].filter(f => !entSet.has(f));
  if (missing.length > 0) {
    console.log(`⚠️  Missing in org_feature_entitlements (${missing.length}):`);
    missing.forEach(f => console.log(`   - ${f}`));
    console.log('');
  } else {
    console.log('✅ No features missing in org_feature_entitlements\n');
  }

  // Find extra features
  const extra = [...entSet].filter(f => !orgSet.has(f));
  if (extra.length > 0) {
    console.log(`⚠️  Extra in org_feature_entitlements (${extra.length}):`);
    extra.forEach(f => console.log(`   - ${f}`));
    console.log('');
  } else {
    console.log('✅ No extra features in org_feature_entitlements\n');
  }

  // Summary
  if (missing.length === 0 && extra.length === 0) {
    console.log('✅ Tables are in perfect sync!\n');
  } else {
    console.log(`⚠️  Tables have ${missing.length + extra.length} discrepancies\n`);
  }

  // List all features in both for reference
  console.log('=== All Features in organization_features ===');
  const orgSorted = [...orgSet].sort();
  orgSorted.forEach((f, i) => console.log(`${(i + 1).toString().padStart(2, ' ')}. ${f}`));

  console.log('\n=== All Features in org_feature_entitlements ===');
  const entSorted = [...entSet].sort();
  entSorted.forEach((f, i) => console.log(`${(i + 1).toString().padStart(2, ' ')}. ${f}`));
}

compareFeatureTables();
