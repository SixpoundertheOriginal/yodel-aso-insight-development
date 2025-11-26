#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function fixStephenAndOrgFeatures() {
  console.log('\n=== Fixing Stephen & Yodel Mobile Org Features ===\n');

  // 1. Fix Stephen's email
  console.log('📧 Step 1: Fixing Stephen\'s email...');

  const { data: stephen } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'stephen@yodelmobile.ocm')
    .single();

  if (stephen) {
    // Update in auth.users
    const { error: authError } = await supabase.auth.admin.updateUserById(
      stephen.id,
      { email: 'stephen@yodelmobile.com' }
    );

    if (authError) {
      console.error('  ❌ Failed to update auth.users:', authError);
    } else {
      console.log('  ✅ Updated email in auth.users');
    }

    // Update in profiles (handled by trigger, but just in case)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: 'stephen@yodelmobile.com' })
      .eq('id', stephen.id);

    if (profileError) {
      console.error('  ❌ Failed to update profiles:', profileError);
    } else {
      console.log('  ✅ Updated email in profiles');
    }
  } else {
    console.log('  ⚠️  Stephen not found with .ocm email');
  }

  // 2. Get Yodel Mobile org ID
  const { data: yodelOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', 'Yodel Mobile')
    .single();

  if (!yodelOrg) {
    console.error('❌ Yodel Mobile organization not found!');
    return;
  }

  console.log(`\n🏢 Yodel Mobile Org ID: ${yodelOrg.id}`);

  // 3. Configure organization features
  console.log('\n🎯 Step 2: Configuring organization features...');

  // Features to enable based on user's requirements
  const featuresToEnable = [
    // Performance Intelligence
    'executive_dashboard',
    'analytics',
    'conversion_intelligence',
    'performance_intelligence',
    'predictive_forecasting',

    // AI Command Center (Performance Dashboard → ASO AI Hub)
    'aso_ai_hub',
    'strategic_audit_engine',
    'chatgpt_visibility_audit',
    'metadata_generator',

    // Growth Accelerators
    'keyword_intelligence',
    'competitive_intelligence',
    'competitor_overview',
    'creative_review',
    'app_discovery',
    'creative_analysis',

    // Control Center
    'app_intelligence',
    'portfolio_manager',

    // Account
    'profile_management',
    'preferences'
  ];

  console.log(`  Enabling ${featuresToEnable.length} features for Yodel Mobile...`);

  let successCount = 0;
  let errorCount = 0;

  for (const featureKey of featuresToEnable) {
    const { error } = await supabase
      .from('organization_features')
      .upsert({
        organization_id: yodelOrg.id,
        feature_key: featureKey,
        is_enabled: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,feature_key'
      });

    if (error) {
      console.error(`  ❌ Failed to enable ${featureKey}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n  ✅ Enabled ${successCount} features`);
  if (errorCount > 0) {
    console.log(`  ❌ Failed to enable ${errorCount} features`);
  }

  // 4. Verify configuration
  console.log('\n📊 Step 3: Verifying configuration...');

  const { data: enabledFeatures } = await supabase
    .from('organization_features')
    .select('feature_key, is_enabled')
    .eq('organization_id', yodelOrg.id)
    .eq('is_enabled', true);

  console.log(`\n  Total enabled features: ${enabledFeatures?.length || 0}`);
  if (enabledFeatures && enabledFeatures.length > 0) {
    console.log('\n  Enabled features:');
    enabledFeatures.forEach(f => {
      console.log(`    ✓ ${f.feature_key}`);
    });
  }

  // 5. Check Stephen's access again
  console.log('\n🔐 Step 4: Verifying Stephen\'s access...');

  const { data: updatedStephen } = await supabase
    .from('profiles')
    .select('email, org_id')
    .eq('id', stephen?.id || 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47')
    .single();

  const { data: stephenRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', stephen?.id || 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47');

  console.log(`  Email: ${updatedStephen?.email}`);
  console.log(`  Org ID: ${updatedStephen?.org_id}`);
  console.log(`  Roles: ${stephenRoles?.map(r => r.role).join(', ')}`);

  console.log('\n✅ Configuration complete!');
  console.log('\n📝 Next steps:');
  console.log('  1. Have Stephen sign out and sign back in');
  console.log('  2. Navigate to http://localhost:8080/aso-ai-hub/audit');
  console.log('  3. Should now have full access!');
}

fixStephenAndOrgFeatures().catch(console.error);
