#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YODEL_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function syncMissingFeatures() {
  console.log('\n=== Syncing Missing Features to org_feature_entitlements ===\n');

  // Add the 2 missing features
  const { data, error } = await supabase
    .from('org_feature_entitlements')
    .upsert([
      {
        organization_id: YODEL_ORG_ID,
        feature_key: 'org_admin_access',
        is_enabled: true,
      },
      {
        organization_id: YODEL_ORG_ID,
        feature_key: 'chatgpt_visibility_audit',
        is_enabled: true,
      }
    ], {
      onConflict: 'organization_id,feature_key'
    });

  if (error) {
    console.error('❌ Error syncing features:', error);
    process.exit(1);
  }

  console.log('✅ Successfully added missing features:');
  console.log('   1. org_admin_access');
  console.log('   2. chatgpt_visibility_audit\n');

  // Verify the sync
  const { data: entitlements } = await supabase
    .from('org_feature_entitlements')
    .select('feature_key')
    .eq('organization_id', YODEL_ORG_ID)
    .eq('is_enabled', true);

  console.log(`📊 Updated count: ${entitlements?.length || 0} features enabled for Yodel Mobile`);

  // Compare with organization_features
  const { data: orgFeatures } = await supabase
    .from('organization_features')
    .select('feature_key')
    .eq('organization_id', YODEL_ORG_ID)
    .eq('is_enabled', true);

  const entCount = entitlements?.length || 0;
  const orgCount = orgFeatures?.length || 0;

  if (entCount === orgCount) {
    console.log(`✅ Tables now in sync! (${entCount} features in both)\n`);
  } else {
    console.log(`⚠️  Still out of sync: ${orgCount} in organization_features, ${entCount} in org_feature_entitlements\n`);
  }
}

syncMissingFeatures();
