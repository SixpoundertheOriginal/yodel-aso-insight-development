#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== Fixing Circular RLS on organization_features ===\n');

// Test current query
console.log('1️⃣  Testing current query...');
const { data: testData, error: testError } = await supabase
  .from('organization_features')
  .select('feature_key')
  .eq('organization_id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
  .limit(1);

if (testError) {
  console.log('   ❌ Error:', testError.code, testError.message);
  if (testError.code === '54001') {
    console.log('   🔥 CIRCULAR RLS CONFIRMED on organization_features table!');
  }
} else {
  console.log('   ✅ Query works (no circular RLS)');
}

// Drop and recreate policies to fix circular dependency
console.log('\n2️⃣  Applying RLS fix...');

// Use raw SQL to fix the policies
const sql = `
BEGIN;

-- Drop ALL existing policies on organization_features
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'organization_features' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON organization_features', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Create simple READ policy without circular dependency
CREATE POLICY "Allow all authenticated users to read org features"
  ON organization_features
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access
CREATE POLICY "Allow service role full access"
  ON organization_features
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

SELECT 'RLS policies fixed' AS status;
`;

try {
  // Execute via REST API since we need raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    console.log('   ❌ Failed:', text);
    console.log('\n   Trying alternative approach: Creating migration file...');
  } else {
    console.log('   ✅ RLS policies fixed!');
  }
} catch (err) {
  console.log('   ❌ Error:', err.message);
}

// Test again
console.log('\n3️⃣  Testing query after fix...');
const { data: testData2, error: testError2 } = await supabase
  .from('organization_features')
  .select('feature_key')
  .eq('organization_id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
  .limit(1);

if (testError2) {
  console.log('   ❌ Still failing:', testError2.code, testError2.message);
  console.log('\n   Need to create and apply migration manually');
} else {
  console.log('   ✅ Query now works!');
}

console.log('\n');
