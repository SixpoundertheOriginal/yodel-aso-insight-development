import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAgencyClientsPolicies() {
  console.log('🔍 Checking agency_clients RLS policies...\n');

  // Query pg_policies to see what policies exist
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
    console.log('❌ Could not query policies (exec_sql RPC may not exist)');
    console.log('   Error:', error.message);
    console.log('');
    console.log('💡 Trying alternative: Test if RLS is blocking the query...\n');

    // Alternative: Try to query as CLI user would
    const cliUserId = '8920ac57-63da-4f8e-9970-719be1e2569c';
    const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

    console.log('🧪 Test 1: Query agency_clients with SERVICE ROLE (no RLS)');
    const { data: serviceRoleData, error: serviceRoleError } = await supabase
      .from('agency_clients')
      .select('*')
      .eq('agency_org_id', yodelOrgId)
      .eq('is_active', true);

    if (serviceRoleError) {
      console.log('❌ Error:', serviceRoleError);
    } else {
      console.log('✅ Found', serviceRoleData?.length || 0, 'agency relationships');
      if (serviceRoleData && serviceRoleData.length > 0) {
        serviceRoleData.forEach(rel => {
          console.log(`   - Client org: ${rel.client_org_id.substring(0, 8)}...`);
        });
      }
    }
    console.log('');

    console.log('🧪 Test 2: Simulate edge function query (WITH RLS context)');
    console.log('   Note: Service role bypasses RLS, so this is just a data check');
    console.log('   In edge function, this would be subject to RLS policies.');
    console.log('');

    // Check if CLI user has a role in Yodel Mobile
    const { data: cliRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', cliUserId)
      .eq('organization_id', yodelOrgId)
      .single();

    console.log('👤 CLI User Role in Yodel Mobile:', cliRole?.role || 'None');
    console.log('');

    console.log('📋 Expected RLS Policy Logic:');
    console.log('   Policy should allow SELECT if:');
    console.log('   1. User has ANY role in the agency organization (Yodel Mobile)');
    console.log('   2. OR user has ANY role in the client organization');
    console.log('   3. OR user is a SUPER_ADMIN');
    console.log('');

    console.log('🔴 DIAGNOSIS:');
    console.log('   If CLI user has a VIEWER role in Yodel Mobile,');
    console.log('   they SHOULD be able to read agency_clients records.');
    console.log('   If edge function returns 0 relationships, RLS is blocking it.');
    console.log('');

    return;
  }

  // If exec_sql worked, show policies
  if (!data || data.length === 0) {
    console.log('⚠️  NO RLS policies found on agency_clients table!');
    console.log('');
    console.log('🔴 ROOT CAUSE: RLS policies missing!');
    console.log('   Migration 20251108000000_remove_all_old_agency_policies.sql');
    console.log('   was supposed to create 4 policies, but they don\'t exist.');
    console.log('');
  } else {
    console.log(`✅ Found ${data.length} RLS policies:\n`);
    data.forEach(policy => {
      console.log(`📜 ${policy.policyname} (${policy.cmd})`);
      console.log(`   USING: ${policy.using_clause}`);
      console.log('');
    });
  }
}

checkAgencyClientsPolicies().catch(console.error);
