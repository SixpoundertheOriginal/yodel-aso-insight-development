#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== Checking Current Roles ===\n');

// Get distinct roles from role_feature_permissions
const { data: rolePerms } = await supabase
  .from('role_feature_permissions')
  .select('role');

const uniqueRoles = [...new Set(rolePerms?.map(r => r.role))];
console.log('Roles in role_feature_permissions:', uniqueRoles);

// Get distinct roles from user_roles
const { data: userRoles } = await supabase
  .from('user_roles')
  .select('role');

const uniqueUserRoles = [...new Set(userRoles?.map(r => r.role))];
console.log('Roles in user_roles:', uniqueUserRoles);

console.log('\n');
