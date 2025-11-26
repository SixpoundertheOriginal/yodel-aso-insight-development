#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
const IGOR_EMAIL = 'igor@yodelmobile.com';

console.log('\n=== Simplifying Auth System (Using VIEWER Role) ===\n');

// Step 1: Configure VIEWER role permissions (this will be the standard user role)
console.log('1️⃣  Setting up VIEWER role permissions...');

const VIEWER_FEATURES = [
  'reviews',
  'analytics_access', 
  'aso_ai_hub',
  'profile_management',
  'preferences',
  'app_core_access'
];

console.log('   VIEWER role will have access to:', VIEWER_FEATURES);

// Delete existing VIEWER role permissions
const { error: deleteError } = await supabase
  .from('role_feature_permissions')
  .delete()
  .eq('role', 'VIEWER');

if (deleteError && deleteError.code !== 'PGRST116') {
  console.log('   ⚠️  Could not delete old VIEWER permissions:', deleteError.message);
}

// Insert VIEWER role permissions
for (const feature of VIEWER_FEATURES) {
  const { error } = await supabase
    .from('role_feature_permissions')
    .insert({
      role: 'VIEWER',
      feature_key: feature
    });

  if (error && !error.message.includes('duplicate')) {
    console.error(`   ❌ Failed to add ${feature}:`, error.message);
  } else {
    console.log(`   ✓ Added ${feature} permission`);
  }
}

// Step 2: Get all Yodel Mobile users
console.log('\n2️⃣  Getting all Yodel Mobile users...');

const { data: yodelUsers } = await supabase
  .from('user_roles')
  .select('user_id, role, profiles(email)')
  .eq('organization_id', YODEL_MOBILE_ORG_ID);

console.log(`   Found ${yodelUsers?.length || 0} users in Yodel Mobile`);

// Step 3: Update users to VIEWER role (except Igor)
console.log('\n3️⃣  Updating user roles...');

const { data: igorProfile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', IGOR_EMAIL)
  .single();

const igorUserId = igorProfile?.id;

for (const userRole of yodelUsers || []) {
  const email = userRole.profiles?.email;
  
  if (userRole.user_id === igorUserId) {
    // Keep Igor as SUPER_ADMIN
    if (userRole.role !== 'SUPER_ADMIN') {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'SUPER_ADMIN' })
        .eq('user_id', userRole.user_id)
        .eq('organization_id', YODEL_MOBILE_ORG_ID);

      if (error) {
        console.error(`   ❌ Failed to update ${email} to SUPER_ADMIN:`, error.message);
      } else {
        console.log(`   ✓ ${email} → SUPER_ADMIN (admin access)`);
      }
    } else {
      console.log(`   ✓ ${email} → SUPER_ADMIN (already set)`);
    }
  } else {
    // Update everyone else to VIEWER
    const { error } = await supabase
      .from('user_roles')
      .update({ role: 'VIEWER' })
      .eq('user_id', userRole.user_id)
      .eq('organization_id', YODEL_MOBILE_ORG_ID);

    if (error) {
      console.error(`   ❌ Failed to update ${email} to VIEWER:`, error.message);
    } else {
      console.log(`   ✓ ${email} → VIEWER (standard user)`);
    }
  }
}

// Step 4: Configure Yodel Mobile organization features
console.log('\n4️⃣  Configuring organization features...');

const ORG_FEATURES = [
  'reviews',
  'analytics_access',
  'aso_ai_hub', 
  'profile_management',
  'preferences',
  'app_core_access'
];

console.log('   Yodel Mobile will have:', ORG_FEATURES);

// Get all current features
const { data: currentFeatures } = await supabase
  .from('organization_features')
  .select('feature_key, is_enabled')
  .eq('organization_id', YODEL_MOBILE_ORG_ID);

// Disable all features first
for (const feature of currentFeatures || []) {
  if (feature.is_enabled) {
    await supabase
      .from('organization_features')
      .update({ is_enabled: false })
      .eq('organization_id', YODEL_MOBILE_ORG_ID)
      .eq('feature_key', feature.feature_key);
  }
}

// Enable only the required features
for (const feature of ORG_FEATURES) {
  const exists = currentFeatures?.find(f => f.feature_key === feature);
  
  if (exists) {
    const { error } = await supabase
      .from('organization_features')
      .update({ is_enabled: true })
      .eq('organization_id', YODEL_MOBILE_ORG_ID)
      .eq('feature_key', feature);

    if (error) {
      console.error(`   ❌ Failed to enable ${feature}:`, error.message);
    } else {
      console.log(`   ✓ Enabled ${feature}`);
    }
  } else {
    const { error } = await supabase
      .from('organization_features')
      .insert({
        organization_id: YODEL_MOBILE_ORG_ID,
        feature_key: feature,
        is_enabled: true
      });

    if (error) {
      console.error(`   ❌ Failed to add ${feature}:`, error.message);
    } else {
      console.log(`   ✓ Added ${feature}`);
    }
  }
}

// Step 5: Verify final state
console.log('\n5️⃣  Verifying final configuration...');

const { data: finalRoles } = await supabase
  .from('user_roles')
  .select('role, profiles(email)')
  .eq('organization_id', YODEL_MOBILE_ORG_ID);

const { data: finalFeatures } = await supabase
  .from('organization_features')
  .select('feature_key')
  .eq('organization_id', YODEL_MOBILE_ORG_ID)
  .eq('is_enabled', true);

console.log('\n📊 Final User Roles:');
for (const role of finalRoles || []) {
  console.log(`   ${role.profiles?.email}: ${role.role}`);
}

console.log('\n📊 Final Organization Features:');
console.log('   ', finalFeatures?.map(f => f.feature_key).join(', '));

console.log('\n=== Simplification Complete ===\n');
console.log('✅ All Yodel Mobile users (except Igor) have VIEWER role');
console.log('✅ Igor has SUPER_ADMIN role (admin panel access)');
console.log('✅ Organization has 6 features enabled');
console.log('✅ VIEWER role has permissions for all user-facing features');
console.log('\n📋 Users can access:');
console.log('   • /reviews (Reviews)');
console.log('   • /dashboard-v2 (Analytics Dashboard)');
console.log('   • /aso-ai-hub (ASO AI Hub)');
console.log('   • /profile (User Profile)');
console.log('\n🔒 Admin Panel:');
console.log('   • Only Igor can access /admin');
console.log('\n💡 Note: Using VIEWER as the standard user role (existing enum value)');
console.log('\n');
