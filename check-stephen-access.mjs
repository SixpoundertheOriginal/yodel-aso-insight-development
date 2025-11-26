#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== Stephen Access Audit ===\n');

// 1. Find Stephen
const { data: stephen } = await supabase
  .from('profiles')
  .select('id, email, full_name')
  .eq('email', 'stephen@yodelmobile.com')
  .single();

console.log('1️⃣  Stephen User:', stephen);

if (!stephen) {
  console.log('❌ Stephen not found!');
  process.exit(1);
}

// 2. Get Stephen's roles
const { data: roles } = await supabase
  .from('user_roles')
  .select('role, organization_id, organizations(name, slug)')
  .eq('user_id', stephen.id);

console.log('\n2️⃣  Stephen Roles:', JSON.stringify(roles, null, 2));

// 3. Get organization features for Yodel Mobile
const yodelOrg = roles?.find(r => r.organizations?.name?.toLowerCase().includes('yodel'));
if (yodelOrg) {
  console.log('\n3️⃣  Yodel Mobile Org:', yodelOrg.organizations);

  const { data: orgFeatures } = await supabase
    .from('org_feature_entitlements')
    .select('feature_key, is_enabled')
    .eq('organization_id', yodelOrg.organization_id);

  console.log('\n4️⃣  Organization Features:', orgFeatures);

  // 4. Get ASO_MANAGER role permissions
  const { data: rolePermissions } = await supabase
    .from('role_feature_permissions')
    .select('feature_key')
    .eq('role', 'ASO_MANAGER');

  console.log('\n5️⃣  ASO_MANAGER Role Permissions:', rolePermissions);

  // 5. Check user_role_permissions view for Stephen
  const { data: userPerms } = await supabase
    .from('user_role_permissions')
    .select('feature_key')
    .eq('user_id', stephen.id);

  console.log('\n6️⃣  Stephen Effective Permissions (user_role_permissions view):', userPerms);

  // 6. Specifically check aso_ai_hub
  const hasOrgFeature = orgFeatures?.find(f => f.feature_key === 'aso_ai_hub');
  const hasRolePermission = rolePermissions?.find(p => p.feature_key === 'aso_ai_hub');
  const hasEffectivePermission = userPerms?.find(p => p.feature_key === 'aso_ai_hub');

  console.log('\n7️⃣  ASO AI Hub Access Check:');
  console.log('   - Org has aso_ai_hub:', hasOrgFeature ? `✅ (enabled: ${hasOrgFeature.is_enabled})` : '❌');
  console.log('   - Role has aso_ai_hub:', hasRolePermission ? '✅' : '❌');
  console.log('   - Effective permission:', hasEffectivePermission ? '✅' : '❌');
}

console.log('\n');
