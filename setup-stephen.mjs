#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const STEPHEN_ID = 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47';
const STEPHEN_EMAIL = 'stephen@yodelmobile.com';

console.log('\n=== Setting Up Stephen ===\n');

// 1. Find Yodel Mobile organization
const { data: orgs } = await supabase
  .from('organizations')
  .select('id, name, slug')
  .ilike('name', '%yodel%');

console.log('1️⃣  Yodel organizations found:', JSON.stringify(orgs, null, 2));

if (!orgs || orgs.length === 0) {
  console.log('❌ No Yodel organization found!');
  process.exit(1);
}

const yodelOrg = orgs[0];
console.log(`\n✅ Using organization: ${yodelOrg.name} (${yodelOrg.id})`);

// 2. Check if profile exists
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', STEPHEN_ID)
  .single();

if (existingProfile) {
  console.log('\n2️⃣  Profile exists:', existingProfile);
} else {
  console.log('\n2️⃣  Creating profile for Stephen...');
  const { data: newProfile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: STEPHEN_ID,
      email: STEPHEN_EMAIL,
      full_name: 'Stephen',
      organization_id: yodelOrg.id
    })
    .select()
    .single();

  if (profileError) {
    console.error('❌ Profile creation error:', profileError);
  } else {
    console.log('✅ Profile created:', newProfile);
  }
}

// 3. Check if role exists
const { data: existingRole } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', STEPHEN_ID)
  .eq('organization_id', yodelOrg.id)
  .single();

if (existingRole) {
  console.log('\n3️⃣  Role exists:', existingRole);
} else {
  console.log('\n3️⃣  Assigning ASO_MANAGER role to Stephen...');
  const { data: newRole, error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: STEPHEN_ID,
      organization_id: yodelOrg.id,
      role: 'ASO_MANAGER'
    })
    .select()
    .single();

  if (roleError) {
    console.error('❌ Role assignment error:', roleError);
  } else {
    console.log('✅ Role assigned:', newRole);
  }
}

// 4. Check organization features
const { data: orgFeatures } = await supabase
  .from('org_feature_entitlements')
  .select('feature_key, is_enabled')
  .eq('organization_id', yodelOrg.id);

console.log('\n4️⃣  Organization features:', orgFeatures);

const asoAiHub = orgFeatures?.find(f => f.feature_key === 'aso_ai_hub');
if (!asoAiHub) {
  console.log('\n⚠️  aso_ai_hub feature not found for organization');
} else if (!asoAiHub.is_enabled) {
  console.log('\n⚠️  aso_ai_hub feature is disabled');
} else {
  console.log('\n✅ aso_ai_hub feature is enabled');
}

// 5. Check ASO_MANAGER role permissions
const { data: rolePerms } = await supabase
  .from('role_feature_permissions')
  .select('feature_key')
  .eq('role', 'ASO_MANAGER');

console.log('\n5️⃣  ASO_MANAGER permissions:', rolePerms?.map(p => p.feature_key));

const hasAsoAiHubPerm = rolePerms?.find(p => p.feature_key === 'aso_ai_hub');
if (!hasAsoAiHubPerm) {
  console.log('\n⚠️  ASO_MANAGER role does NOT have aso_ai_hub permission');
} else {
  console.log('\n✅ ASO_MANAGER role has aso_ai_hub permission');
}

console.log('\n=== Setup Complete ===\n');
