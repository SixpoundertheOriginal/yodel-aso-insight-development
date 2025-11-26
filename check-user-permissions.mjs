#!/usr/bin/env node

/**
 * Check user permissions for igor@yodelmobile.com
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUserPermissions() {
  const email = 'igor@yodelmobile.com';

  console.log('=== Checking permissions for', email, '===\n');

  // 1. Get user profile
  console.log('1️⃣ Fetching user profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      organization_id,
      created_at
    `)
    .eq('email', email)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Error:', profileError.message);
    process.exit(1);
  }

  if (!profile) {
    console.error('❌ User not found');
    process.exit(1);
  }

  console.log('✅ User found:');
  console.log('   ID:', profile.id);
  console.log('   Name:', profile.first_name, profile.last_name);
  console.log('   Org ID:', profile.organization_id);
  console.log('');

  // 2. Check super admin status
  console.log('2️⃣ Checking super admin status...');
  const { data: superAdminCheck, error: saError } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', profile.id)
    .maybeSingle();

  const isSuperAdmin = !!superAdminCheck;
  if (isSuperAdmin) {
    console.log('✅ User IS a Super Admin!');
  } else {
    console.log('⚠️  User is NOT a Super Admin');
  }
  console.log('');

  // 3. Get user roles
  console.log('3️⃣ Fetching user roles...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role,
      organization_id,
      organizations:organization_id (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', profile.id);

  if (rolesError) {
    console.error('❌ Error:', rolesError.message);
  } else if (!roles || roles.length === 0) {
    console.log('⚠️  No roles found for this user');
  } else {
    console.log('✅ User has', roles.length, 'role(s):');
    roles.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.role} in ${r.organizations?.name || 'Unknown'} (${r.organizations?.slug || r.organization_id})`);
    });
  }
  console.log('');

  // 4. Get organization details
  console.log('4️⃣ Fetching organization details...');
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('slug', 'yodel-mobile')
    .maybeSingle();

  if (orgError || !org) {
    console.error('❌ Yodel Mobile organization not found');
  } else {
    console.log('✅ Yodel Mobile organization:');
    console.log('   ID:', org.id);
    console.log('   Name:', org.name);
    console.log('   Slug:', org.slug);
  }
  console.log('');

  // 5. Check if user can create users in Yodel Mobile
  console.log('5️⃣ Checking user creation permissions...');

  const canCreateUsers = isSuperAdmin || roles?.some(r =>
    r.organizations?.slug === 'yodel-mobile' &&
    ['ORG_ADMIN', 'SUPER_ADMIN'].includes(r.role)
  );

  if (canCreateUsers) {
    console.log('✅ User CAN create users in Yodel Mobile');
  } else {
    console.log('❌ User CANNOT create users in Yodel Mobile');
    console.log('   Required: Super Admin OR ORG_ADMIN role in Yodel Mobile');
  }
  console.log('');

  // Summary
  console.log('=== SUMMARY ===');
  console.log('Super Admin:', isSuperAdmin ? '✅ YES' : '❌ NO');
  console.log('Total Roles:', roles?.length || 0);
  console.log('Can Create Users:', canCreateUsers ? '✅ YES' : '❌ NO');

  if (!canCreateUsers && !isSuperAdmin) {
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('To enable user creation, run one of these SQL commands:\n');
    console.log('-- Option 1: Make user a Super Admin');
    console.log(`INSERT INTO super_admins (user_id) VALUES ('${profile.id}');`);
    console.log('\n-- Option 2: Give ORG_ADMIN role in Yodel Mobile');
    console.log(`INSERT INTO user_roles (user_id, organization_id, role)
VALUES ('${profile.id}', '${org?.id}', 'ORG_ADMIN')
ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'ORG_ADMIN';`);
  }
}

checkUserPermissions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
