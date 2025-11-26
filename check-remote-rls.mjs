import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRemoteRLS() {
  console.log('🔍 Checking REMOTE database for agency_clients RLS policies...\n');

  // Query the remote database policies
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        policyname,
        cmd,
        qual::text as using_clause
      FROM pg_policies
      WHERE tablename = 'agency_clients'
        AND schemaname = 'public'
      ORDER BY policyname;
    `
  });

  if (error) {
    console.error('❌ Error querying policies:', error);
    console.log('\n💡 Note: exec_sql RPC function may not exist.');
    console.log('   Trying alternative method...\n');

    // Alternative: Try to query agency_clients to see if RLS is blocking
    const { data: testData, error: testError } = await supabase
      .from('agency_clients')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error querying agency_clients:', testError);
      console.log('\n🔴 This suggests RLS policies may be misconfigured in remote database!');
    } else {
      console.log('✅ Can query agency_clients with service role');
      console.log('   Sample record:', testData?.[0]);
    }
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  NO RLS policies found on agency_clients table!');
    console.log('');
    console.log('🔴 ROOT CAUSE: Migrations have not been applied to remote database!');
    console.log('');
    console.log('The migration 20251108000000_remove_all_old_agency_policies.sql');
    console.log('creates 4 RLS policies on agency_clients table, but they don\'t');
    console.log('exist in the remote database.');
    console.log('');
    console.log('💡 SOLUTION: Run migrations on remote database:');
    console.log('   supabase db push');
    console.log('');
  } else {
    console.log(`✅ Found ${data.length} RLS policies on agency_clients:`);
    console.log('');
    data.forEach(policy => {
      console.log(`  - ${policy.policyname} (${policy.cmd})`);
    });
    console.log('');

    // Check for the specific policies we expect
    const expectedPolicies = [
      'users_read_agency_relationships',
      'admins_insert_agency_relationships',
      'admins_update_agency_relationships',
      'admins_delete_agency_relationships'
    ];

    const foundPolicyNames = data.map(p => p.policyname);
    const missingPolicies = expectedPolicies.filter(p => !foundPolicyNames.includes(p));

    if (missingPolicies.length === 0) {
      console.log('✅ All expected policies are present!');
      console.log('   Migration 20251108000000 has been applied successfully.');
    } else {
      console.log('⚠️  Missing expected policies:');
      missingPolicies.forEach(p => console.log(`   - ${p}`));
    }
  }
}

checkRemoteRLS().catch(console.error);
