#!/usr/bin/env node

/**
 * Test user creation directly through the backend (bypassing frontend)
 * This will help us identify if the issue is in the Edge Function or the client
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testBackendUserCreation() {
  console.log('=== Testing Backend User Creation ===\n');

  const testEmail = `test.${Date.now()}@example.com`;
  const yodelMobileOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'; // From our earlier check

  console.log('Test Configuration:');
  console.log('  Email:', testEmail);
  console.log('  Org ID:', yodelMobileOrgId);
  console.log('  Password: TestPassword123!');
  console.log('');

  // Step 1: Create auth user
  console.log('1️⃣ Creating auth user...');
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      first_name: 'CLI',
      last_name: 'Test',
      created_by: 'cli_test_script',
      organization_id: yodelMobileOrgId
    }
  });

  if (authError) {
    console.error('❌ Auth user creation failed:', authError.message);
    console.error('   Details:', JSON.stringify(authError, null, 2));
    return;
  }

  const newUserId = authData.user.id;
  console.log('✅ Auth user created successfully!');
  console.log('   User ID:', newUserId);
  console.log('   Email:', authData.user.email);
  console.log('');

  // Step 2: Check if profile was auto-created
  console.log('2️⃣ Checking if profile was auto-created...');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for trigger

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', newUserId)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Error checking profile:', profileError.message);
  } else if (profile) {
    console.log('✅ Profile auto-created by trigger');
    console.log('   Email:', profile.email);
    console.log('   First name:', profile.first_name);
    console.log('   Last name:', profile.last_name);
    console.log('   Org ID:', profile.organization_id);
  } else {
    console.log('⚠️  Profile NOT auto-created - will create manually');

    // Create profile manually
    const { error: manualProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        email: testEmail,
        first_name: 'CLI',
        last_name: 'Test',
        organization_id: yodelMobileOrgId
      });

    if (manualProfileError) {
      console.error('❌ Manual profile creation failed:', manualProfileError.message);
      // Cleanup auth user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return;
    }
    console.log('✅ Profile created manually');
  }
  console.log('');

  // Step 3: Assign role
  console.log('3️⃣ Assigning VIEWER role...');
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: newUserId,
      organization_id: yodelMobileOrgId,
      role: 'VIEWER'
    });

  if (roleError) {
    console.error('❌ Role assignment failed:', roleError.message);
    console.error('   Details:', JSON.stringify(roleError, null, 2));
    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return;
  }
  console.log('✅ Role assigned successfully');
  console.log('');

  // Step 4: Verify everything
  console.log('4️⃣ Verifying complete user record...');
  const { data: fullUser, error: verifyError } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      organization_id,
      organizations:organization_id(id, name, slug),
      user_roles(role, organization_id)
    `)
    .eq('id', newUserId)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
    return;
  }

  console.log('✅ User fully created and verified!');
  console.log('');
  console.log('Complete User Record:');
  console.log(JSON.stringify(fullUser, null, 2));
  console.log('');

  console.log('=== SUCCESS ===');
  console.log('User can now login with:');
  console.log('  Email:', testEmail);
  console.log('  Password: TestPassword123!');
  console.log('');
  console.log('⚠️  Note: This is a test user. Delete after verification:');
  console.log(`  User ID: ${newUserId}`);
}

testBackendUserCreation().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
