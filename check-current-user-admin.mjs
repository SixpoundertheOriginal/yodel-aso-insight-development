#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function checkCurrentUserAdmin() {
  console.log('\n=== Checking Current User Super Admin Status ===\n');

  // Get all users with SUPER_ADMIN role
  const { data: superAdmins, error } = await supabase
    .from('user_roles')
    .select('user_id, role, organization_id')
    .eq('role', 'SUPER_ADMIN');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('🔐 Super Admins in System:');
  if (!superAdmins || superAdmins.length === 0) {
    console.log('  ❌ NO SUPER ADMINS FOUND!\n');
  } else {
    console.log(`  Found ${superAdmins.length} super admin(s):\n`);
    for (const admin of superAdmins) {
      // Get email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', admin.user_id)
        .single();

      console.log(`  - ${profile?.email || 'unknown'}`);
      console.log(`    User ID: ${admin.user_id}`);
      console.log(`    Org ID: ${admin.organization_id || 'platform'}`);
      console.log('');
    }
  }

  // Check is_super_admin RPC function
  console.log('🔍 Testing is_super_admin RPC function...\n');

  if (superAdmins && superAdmins.length > 0) {
    const testUserId = superAdmins[0].user_id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', testUserId)
      .single();

    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('is_super_admin', { check_user_id: testUserId });

    if (rpcError) {
      console.log('  ❌ RPC Error:', rpcError.message);
      console.log('  ⚠️  Function may not exist or has wrong signature');
    } else {
      console.log(`  ✅ RPC function works: is_super_admin(${profile?.email}) = ${rpcResult}`);
    }
  }

  // Check all users in Yodel Mobile
  console.log('\n👥 All Users in Yodel Mobile:\n');
  const { data: yodelOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', 'Yodel Mobile')
    .single();

  if (yodelOrg) {
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('org_id', yodelOrg.id);

    for (const user of users || []) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const rolesList = roles?.map(r => r.role).join(', ') || 'NO ROLES';
      console.log(`  ${user.email} - ${rolesList}`);
    }
  }
}

checkCurrentUserAdmin();
