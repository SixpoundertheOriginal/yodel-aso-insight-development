#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== Checking RLS Policies ===\n');

// Query pg_policies for org_feature_entitlements
const { data, error } = await supabase.rpc('exec_sql', {
  query: `
    SELECT 
      schemaname, 
      tablename, 
      policyname, 
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies 
    WHERE tablename = 'org_feature_entitlements'
    ORDER BY policyname;
  `
});

if (error) {
  console.error('Error:', error);
  
  // Try alternative approach - query directly
  const { data: policies, error: err2 } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'org_feature_entitlements');
  
  console.log('Policies (alternative):', JSON.stringify(policies, null, 2));
  console.log('Error:', err2);
} else {
  console.log('Policies:', JSON.stringify(data, null, 2));
}
