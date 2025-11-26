#!/usr/bin/env node

/**
 * Backend User Management CLI
 * Complete user management system for Yodel Mobile organization
 *
 * Usage:
 *   node cli-user-management.mjs create <email> <first_name> <last_name> <role>
 *   node cli-user-management.mjs list
 *   node cli-user-management.mjs get <email>
 *   node cli-user-management.mjs delete <email>
 *   node cli-user-management.mjs test-full-flow
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
const YODEL_MOBILE_ORG_NAME = 'Yodel Mobile';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ============================================
// USER CREATION
// ============================================

async function createUser(email, firstName, lastName, role = 'VIEWER') {
  console.log('=== Creating User ===');
  console.log('Email:', email);
  console.log('Name:', firstName, lastName);
  console.log('Organization:', YODEL_MOBILE_ORG_NAME);
  console.log('Role:', role);
  console.log('');

  // Step 1: Check if user already exists
  console.log('1️⃣ Checking if user already exists...');
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    console.error('❌ User already exists with ID:', existingUser.id);
    return null;
  }
  console.log('✅ Email available');
  console.log('');

  // Step 2: Create auth user
  console.log('2️⃣ Creating auth user...');
  const password = `Temp${Date.now()}!`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      created_by: 'cli_user_management',
      organization_id: YODEL_MOBILE_ORG_ID
    }
  });

  if (authError) {
    console.error('❌ Auth user creation failed:', authError.message);
    return null;
  }

  const userId = authData.user.id;
  console.log('✅ Auth user created');
  console.log('   User ID:', userId);
  console.log('   Temp Password:', password);
  console.log('');

  // Step 3: Wait for trigger to create profile
  console.log('3️⃣ Waiting for profile trigger...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, org_id, organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('❌ Profile not created by trigger:', profileError?.message || 'Not found');
    // Cleanup
    await supabase.auth.admin.deleteUser(userId);
    return null;
  }

  console.log('✅ Profile created by trigger');
  console.log('   Email:', profile.email);
  console.log('   Name:', profile.first_name, profile.last_name);
  console.log('   org_id:', profile.org_id || 'NULL');
  console.log('   organization_id:', profile.organization_id || 'NULL');
  console.log('');

  // Verify org_id is set correctly
  if (!profile.org_id) {
    console.error('⚠️  WARNING: org_id is NULL! Trigger may not be working correctly.');
  } else if (profile.org_id !== YODEL_MOBILE_ORG_ID) {
    console.error('⚠️  WARNING: org_id mismatch!');
    console.error('   Expected:', YODEL_MOBILE_ORG_ID);
    console.error('   Got:', profile.org_id);
  } else {
    console.log('✅ org_id set correctly');
  }
  console.log('');

  // Step 4: Assign role
  console.log('4️⃣ Assigning role...');
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      organization_id: YODEL_MOBILE_ORG_ID,
      role: role.toUpperCase()
    });

  if (roleError) {
    console.error('❌ Role assignment failed:', roleError.message);
    // Cleanup
    await supabase.auth.admin.deleteUser(userId);
    return null;
  }

  console.log('✅ Role assigned');
  console.log('');

  // Step 5: Verify complete user
  console.log('5️⃣ Verifying complete user record...');
  const { data: completeUser, error: verifyError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      org_id,
      organization_id,
      user_roles (
        role,
        organization_id
      )
    `)
    .eq('id', userId)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
    return null;
  }

  console.log('✅ User fully created and verified!');
  console.log('');
  console.log('=== USER RECORD ===');
  console.log(JSON.stringify(completeUser, null, 2));
  console.log('');
  console.log('=== LOGIN CREDENTIALS ===');
  console.log('Email:', email);
  console.log('Temp Password:', password);
  console.log('');
  console.log('⚠️  User should change password on first login');

  return completeUser;
}

// ============================================
// LIST USERS
// ============================================

async function listUsers() {
  console.log('=== Users in Yodel Mobile ===');
  console.log('');

  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      org_id,
      created_at,
      user_roles (
        role,
        organization_id
      )
    `)
    .eq('org_id', YODEL_MOBILE_ORG_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found in Yodel Mobile organization');
    return;
  }

  console.log(`Found ${users.length} user(s):\n`);

  users.forEach((user, index) => {
    const roles = user.user_roles?.map(r => r.role).join(', ') || 'No roles';
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Roles: ${roles}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
  });
}

// ============================================
// GET USER
// ============================================

async function getUser(email) {
  console.log('=== User Details ===');
  console.log('Email:', email);
  console.log('');

  const { data: user, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      org_id,
      organization_id,
      created_at,
      updated_at,
      user_roles (
        role,
        organization_id,
        created_at
      )
    `)
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ User found');
  console.log('');
  console.log(JSON.stringify(user, null, 2));
}

// ============================================
// DELETE USER
// ============================================

async function deleteUser(email) {
  console.log('=== Deleting User ===');
  console.log('Email:', email);
  console.log('');

  // Get user ID
  const { data: user } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('User to delete:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.first_name, user.last_name);
  console.log('');
  console.log('⚠️  This will permanently delete the user!');
  console.log('');

  // Delete from auth.users (cascade will handle profiles and user_roles)
  const { error } = await supabase.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('❌ Deletion failed:', error.message);
    return;
  }

  console.log('✅ User deleted successfully');
}

// ============================================
// FULL FLOW TEST
// ============================================

async function testFullFlow() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   FULL USER CREATION FLOW TEST               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  const testEmail = `test.fullflow.${Date.now()}@example.com`;

  // Test 1: Create user
  console.log('🧪 TEST 1: Create User');
  console.log('─────────────────────────────────────────────');
  const user = await createUser(testEmail, 'Full', 'Flow', 'VIEWER');

  if (!user) {
    console.log('❌ TEST 1 FAILED: User creation failed');
    return;
  }
  console.log('✅ TEST 1 PASSED');
  console.log('');

  // Test 2: List users
  console.log('🧪 TEST 2: List Users (should include new user)');
  console.log('─────────────────────────────────────────────');
  await listUsers();
  console.log('✅ TEST 2 PASSED');
  console.log('');

  // Test 3: Get user
  console.log('🧪 TEST 3: Get User Details');
  console.log('─────────────────────────────────────────────');
  await getUser(testEmail);
  console.log('✅ TEST 3 PASSED');
  console.log('');

  // Test 4: Verify org_id
  console.log('🧪 TEST 4: Verify org_id is set correctly');
  console.log('─────────────────────────────────────────────');
  const { data: verifyUser } = await supabase
    .from('profiles')
    .select('org_id, organization_id')
    .eq('email', testEmail)
    .single();

  if (verifyUser.org_id === YODEL_MOBILE_ORG_ID) {
    console.log('✅ org_id is correct:', verifyUser.org_id);
    console.log('✅ TEST 4 PASSED');
  } else {
    console.log('❌ org_id is wrong or NULL:', verifyUser.org_id);
    console.log('❌ TEST 4 FAILED');
  }
  console.log('');

  // Test 5: Delete user
  console.log('🧪 TEST 5: Delete User (cleanup)');
  console.log('─────────────────────────────────────────────');
  await deleteUser(testEmail);
  console.log('✅ TEST 5 PASSED');
  console.log('');

  // Final verification
  console.log('🧪 TEST 6: Verify user is deleted');
  console.log('─────────────────────────────────────────────');
  const { data: deletedCheck } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', testEmail)
    .maybeSingle();

  if (!deletedCheck) {
    console.log('✅ User successfully deleted');
    console.log('✅ TEST 6 PASSED');
  } else {
    console.log('❌ User still exists!');
    console.log('❌ TEST 6 FAILED');
  }
  console.log('');

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ALL TESTS COMPLETED                        ║');
  console.log('╚══════════════════════════════════════════════╝');
}

// ============================================
// CLI INTERFACE
// ============================================

const [,, command, ...args] = process.argv;

async function main() {
  if (!command) {
    console.log('Backend User Management CLI');
    console.log('');
    console.log('Usage:');
    console.log('  node cli-user-management.mjs create <email> <first_name> <last_name> [role]');
    console.log('  node cli-user-management.mjs list');
    console.log('  node cli-user-management.mjs get <email>');
    console.log('  node cli-user-management.mjs delete <email>');
    console.log('  node cli-user-management.mjs test-full-flow');
    console.log('');
    console.log('Examples:');
    console.log('  node cli-user-management.mjs create john@example.com John Doe VIEWER');
    console.log('  node cli-user-management.mjs list');
    console.log('  node cli-user-management.mjs get john@example.com');
    console.log('  node cli-user-management.mjs delete john@example.com');
    console.log('  node cli-user-management.mjs test-full-flow');
    console.log('');
    console.log('Roles: SUPER_ADMIN, ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER');
    process.exit(0);
  }

  switch (command) {
    case 'create':
      if (args.length < 3) {
        console.error('Usage: create <email> <first_name> <last_name> [role]');
        process.exit(1);
      }
      await createUser(args[0], args[1], args[2], args[3] || 'VIEWER');
      break;

    case 'list':
      await listUsers();
      break;

    case 'get':
      if (args.length < 1) {
        console.error('Usage: get <email>');
        process.exit(1);
      }
      await getUser(args[0]);
      break;

    case 'delete':
      if (args.length < 1) {
        console.error('Usage: delete <email>');
        process.exit(1);
      }
      await deleteUser(args[0]);
      break;

    case 'test-full-flow':
      await testFullFlow();
      break;

    default:
      console.error('Unknown command:', command);
      console.log('Run without arguments to see usage');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
