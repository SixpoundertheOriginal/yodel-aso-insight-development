import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAgencyClientsRLS() {
  console.log('🔍 Checking RLS status and policies on agency_clients table...\n');

  // Check if RLS is enabled
  const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE tablename = 'agency_clients'
    `
  }).single();

  if (rlsError) {
    console.log('⚠️  Cannot query RLS status directly');
  } else {
    console.log('📋 RLS Status:', rlsStatus);
  }

  // Check policies
  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        policyname,
        cmd,
        qual::text as using_clause,
        with_check::text as with_check_clause
      FROM pg_policies
      WHERE tablename = 'agency_clients'
    `
  }).single();

  if (policiesError) {
    console.log('⚠️  Cannot query policies directly');
  } else {
    console.log('\n📋 RLS Policies:', policies);
  }

  // Test query as authenticated user would see it
  console.log('\n📋 Testing agency_clients query as regular user would...');

  // First, let's just see if we can read the table
  const { data: agencyData, error: agencyError } = await supabase
    .from('agency_clients')
    .select('*')
    .limit(5);

  if (agencyError) {
    console.error('❌ Error querying agency_clients:', agencyError);
  } else {
    console.log(`✅ Found ${agencyData?.length || 0} agency_client records (with service role)`);
    if (agencyData && agencyData.length > 0) {
      console.log('Sample:', JSON.stringify(agencyData[0], null, 2));
    }
  }

  // Check Yodel Mobile specifically
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  const { data: yodelAgency, error: yodelError } = await supabase
    .from('agency_clients')
    .select('*')
    .eq('agency_org_id', yodelOrgId);

  if (yodelError) {
    console.error('\n❌ Error querying Yodel Mobile agency:', yodelError);
  } else {
    console.log(`\n✅ Yodel Mobile agency records: ${yodelAgency?.length || 0}`);
    console.log(JSON.stringify(yodelAgency, null, 2));
  }
}

checkAgencyClientsRLS().catch(console.error);
