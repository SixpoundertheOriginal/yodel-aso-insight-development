#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function testStephenRoleAccess() {
  console.log('\n=== Testing Stephen\'s Role-Based Feature Access ===\n');

  // 1. Get Stephen's user info
  const { data: stephenProfile } = await supabase
    .from('profiles')
    .select('id, email, org_id')
    .eq('email', 'stephen@yodelmobile.com')
    .single();

  if (!stephenProfile) {
    console.log('❌ Stephen not found!\n');
    return;
  }

  console.log('👤 User: Stephen');
  console.log(`   Email: ${stephenProfile.email}`);
  console.log(`   User ID: ${stephenProfile.id}`);
  console.log(`   Org ID: ${stephenProfile.org_id}\n`);

  // 2. Get Stephen's role
  const { data: stephenRole } = await supabase
    .from('user_roles')
    .select('role, organization_id')
    .eq('user_id', stephenProfile.id)
    .single();

  if (!stephenRole) {
    console.log('❌ Stephen has no role assigned!\n');
    return;
  }

  console.log('🎭 Role Assignment:');
  console.log(`   Role: ${stephenRole.role}`);
  console.log(`   Organization: ${stephenRole.organization_id}\n`);

  // 3. Get organization name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', stephenProfile.org_id)
    .single();

  console.log(`🏢 Organization: ${org?.name}\n`);

  // 4. Get organization feature entitlements (Layer 1)
  const { data: orgEntitlements } = await supabase
    .from('org_feature_entitlements')
    .select('feature_key, is_enabled')
    .eq('organization_id', stephenProfile.org_id)
    .eq('is_enabled', true);

  const orgFeatures = orgEntitlements?.map(e => e.feature_key) || [];
  console.log(`📦 Layer 1 - Organization Entitlements: ${orgFeatures.length} features`);
  console.log(`   ${orgFeatures.join(', ')}\n`);

  // 5. Get role permissions (Layer 2)
  const { data: rolePermissions } = await supabase
    .from('role_feature_permissions')
    .select('feature_key, is_allowed')
    .eq('role', stephenRole.role)
    .eq('is_allowed', true);

  const roleFeatures = rolePermissions?.map(p => p.feature_key) || [];
  console.log(`🔑 Layer 2 - Role Permissions (${stephenRole.role}): ${roleFeatures.length} features`);
  console.log(`   ${roleFeatures.join(', ')}\n`);

  // 6. Calculate intersection (what Stephen actually gets)
  const orgFeaturesSet = new Set(orgFeatures);
  const roleFeaturesSet = new Set(roleFeatures);
  const finalFeatures = orgFeatures.filter(f => roleFeaturesSet.has(f));

  console.log('✅ Final Access (Org ∩ Role):');
  console.log(`   Total: ${finalFeatures.length} features\n`);

  // Group by category
  const { data: featureDetails } = await supabase
    .from('platform_features')
    .select('feature_key, feature_name, category')
    .in('feature_key', finalFeatures);

  const byCategory = (featureDetails || []).reduce((acc, f) => {
    const cat = f.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  Object.entries(byCategory).forEach(([category, features]) => {
    console.log(`   ${category}:`);
    features.forEach(f => {
      console.log(`     - ${f.feature_name} (${f.feature_key})`);
    });
    console.log('');
  });

  // 7. Test the RPC function
  console.log('🧪 Testing user_has_role_permission() RPC:\n');
  const testFeatures = ['aso_ai_hub', 'analytics', 'executive_dashboard', 'system_control'];

  for (const featureKey of testFeatures) {
    const { data: hasPermission, error } = await supabase
      .rpc('user_has_role_permission', {
        check_user_id: stephenProfile.id,
        check_feature_key: featureKey
      });

    const hasOrg = orgFeaturesSet.has(featureKey);
    const hasRole = roleFeaturesSet.has(featureKey);
    const shouldHaveAccess = hasOrg && hasRole;

    const icon = hasPermission === shouldHaveAccess ? '✅' : '❌';
    console.log(`   ${icon} ${featureKey}:`);
    console.log(`      RPC result: ${hasPermission}`);
    console.log(`      Expected: ${shouldHaveAccess} (org=${hasOrg}, role=${hasRole})`);
  }

  console.log('\n=== Test Complete ===\n');
}

testStephenRoleAccess();
