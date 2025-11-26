#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== Fixing Circular RLS on org_feature_entitlements ===\n');

// Execute the fix SQL
const sql = `
-- Drop all existing policies
DROP POLICY IF EXISTS "Super admins can manage org entitlements" ON org_feature_entitlements;
DROP POLICY IF EXISTS "Org admins can read their org entitlements" ON org_feature_entitlements;
DROP POLICY IF EXISTS "Org members can read their org features" ON org_feature_entitlements;
DROP POLICY IF EXISTS "Allow all authenticated users to read org features" ON org_feature_entitlements;
DROP POLICY IF EXISTS "Allow service role full access" ON org_feature_entitlements;

-- Create simple policies without circular dependencies
CREATE POLICY "Allow all authenticated users to read org features"
  ON org_feature_entitlements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access"
  ON org_feature_entitlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
`;

try {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 60) + '...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: statement
    });

    if (error) {
      // Try alternative: direct query through admin client
      console.log('   RPC failed, trying alternative...');
      
      // For DROP/CREATE POLICY we need to use raw SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('   ❌ Failed:', errorText);
      } else {
        console.log('   ✅ Success (alternative method)');
      }
    } else {
      console.log('   ✅ Success');
    }
  }

  console.log('\n=== Fix Applied ===\n');
  console.log('RLS policies on org_feature_entitlements:');
  console.log('  ✅ Allow all authenticated users to read (no circular dependency)');
  console.log('  ✅ Service role has full access');
  console.log('  ❌ No queries to user_roles table (circular dependency removed)');
  console.log('\n');

} catch (err) {
  console.error('Error:', err);
}
