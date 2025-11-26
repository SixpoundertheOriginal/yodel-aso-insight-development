#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== Finding Stephen ===\n');

// Search for users with "stephen" in email
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, full_name')
  .ilike('email', '%stephen%');

console.log('Profiles with "stephen" in email:', JSON.stringify(profiles, null, 2));

// Also check auth.users
const { data: authUsers, error } = await supabase.auth.admin.listUsers();
console.log('\nAll auth users:', authUsers?.users?.map(u => ({ id: u.id, email: u.email })));

// Check for ASO_MANAGER users
const { data: asoManagers } = await supabase
  .from('user_roles')
  .select('user_id, role, organizations(name)')
  .eq('role', 'ASO_MANAGER');

console.log('\nAll ASO_MANAGER users:', JSON.stringify(asoManagers, null, 2));
