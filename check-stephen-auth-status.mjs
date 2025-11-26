#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function checkStephenAuthStatus() {
  console.log('\n=== Checking Stephen Auth Status ===\n');

  // Get Stephen from auth.users
  const { data: authData } = await supabase.auth.admin.listUsers();
  const stephen = authData?.users?.find(u => u.email === 'stephen@yodelmobile.com');

  if (!stephen) {
    console.log('❌ Stephen not found in auth.users\n');
    return;
  }

  console.log('✅ Stephen found in auth.users');
  console.log(`   ID: ${stephen.id}`);
  console.log(`   Email: ${stephen.email}`);
  console.log(`   Email Confirmed: ${stephen.email_confirmed_at ? 'Yes ✅' : 'No ❌'}`);
  console.log(`   Created: ${stephen.created_at}`);
  console.log(`   Last Sign In: ${stephen.last_sign_in_at || 'Never'}`);
  console.log('');

  // Check user_roles
  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', stephen.id)
    .single();

  if (role) {
    console.log('✅ Role found in user_roles');
    console.log(`   Role: ${role.role}`);
    console.log(`   Org ID: ${role.organization_id}`);
  } else {
    console.log('❌ No role found in user_roles');
    if (roleError) console.log(`   Error: ${roleError.message}`);
  }
  console.log('');

  // Check profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', stephen.id)
    .single();

  if (profile) {
    console.log('✅ Profile found');
    console.log(`   Org ID: ${profile.org_id}`);
    console.log(`   Email: ${profile.email}`);
  } else {
    console.log('❌ No profile found');
    if (profileError) console.log(`   Error: ${profileError.message}`);
  }
  console.log('');

  // Summary
  console.log('=== Summary ===');
  const issues = [];

  if (!stephen.email_confirmed_at) {
    issues.push('Email not confirmed');
  }
  if (!role) {
    issues.push('No role assigned');
  }
  if (!profile) {
    issues.push('No profile created');
  }

  if (issues.length === 0) {
    console.log('✅ All checks passed - Stephen should be able to login\n');
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }
}

checkStephenAuthStatus();
