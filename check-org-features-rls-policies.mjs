#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function checkPolicies() {
  console.log('\n=== RLS Policies on org_feature_entitlements ===\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'org_feature_entitlements'
      ORDER BY policyname
    `
  }).single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('Policies:', JSON.stringify(data, null, 2));

  console.log('\n=== Checking for circular reference ===\n');
  console.log('The issue: One of these policies likely references user_roles');
  console.log('which creates a circular dependency during RLS evaluation.\n');
}

checkPolicies();
