import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkYodelAppAccess() {
  console.log('🔍 Checking app access for Yodel Mobile organization...\n');

  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // 1. Check org_app_access table
  console.log('📋 Step 1: Checking org_app_access table...');
  const { data: appAccess, error: accessError } = await supabase
    .from('org_app_access')
    .select('*')
    .eq('organization_id', yodelOrgId)
    .is('detached_at', null);

  if (accessError) {
    console.error('❌ Error querying org_app_access:', accessError);
  } else if (!appAccess || appAccess.length === 0) {
    console.log('⚠️  NO apps found in org_app_access for Yodel Mobile!');
    console.log('   This is why users can\'t see BigQuery data');
  } else {
    console.log(`✅ Found ${appAccess.length} apps in org_app_access:`);
    appAccess.forEach((app, index) => {
      console.log(`   ${index + 1}. App ID: ${app.app_id}`);
      console.log(`      Platform: ${app.platform || 'N/A'}`);
      console.log(`      Attached: ${app.attached_at}`);
    });
  }

  // 2. Check if there are any apps in apps table
  console.log('\n📋 Step 2: Checking apps table for available apps...');
  const { data: allApps, error: appsError } = await supabase
    .from('apps')
    .select('app_id, app_name, platform')
    .limit(10);

  if (appsError) {
    console.error('❌ Error querying apps:', appsError);
  } else if (allApps && allApps.length > 0) {
    console.log(`✅ Found ${allApps.length} apps in apps table (showing first 10):`);
    allApps.forEach((app, index) => {
      console.log(`   ${index + 1}. ${app.app_name} (${app.app_id}) - ${app.platform}`);
    });
  }

  // 3. Check RLS policy on org_app_access
  console.log('\n📋 Step 3: Checking RLS policies on org_app_access...');
  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT policyname, cmd, qual::text as using_clause
      FROM pg_policies
      WHERE tablename = 'org_app_access'
    `
  }).single();

  if (policiesError) {
    console.log('   (Cannot query policies - using service role which bypasses RLS)');
  }

  // 4. Test actual query that edge function runs
  console.log('\n📋 Step 4: Simulating edge function query...');
  const { data: simulatedAccess, error: simError } = await supabase
    .from('org_app_access')
    .select('app_id, attached_at, detached_at')
    .in('organization_id', [yodelOrgId])
    .is('detached_at', null);

  if (simError) {
    console.error('❌ Simulated query error:', simError);
  } else {
    console.log(`✅ Simulated query returned ${simulatedAccess?.length || 0} apps`);
    if (!simulatedAccess || simulatedAccess.length === 0) {
      console.log('   ⚠️  This explains why BigQuery returns no data!');
    }
  }

  // 5. Check agency relationships
  console.log('\n📋 Step 5: Checking agency relationships...');
  const { data: agencyRelations, error: agencyError } = await supabase
    .from('agency_clients')
    .select('*')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  if (agencyError) {
    console.error('❌ Error checking agency:', agencyError);
  } else if (agencyRelations && agencyRelations.length > 0) {
    console.log(`✅ Yodel Mobile is an agency with ${agencyRelations.length} client(s):`);
    agencyRelations.forEach((rel, index) => {
      console.log(`   ${index + 1}. Client Org ID: ${rel.client_org_id}`);
    });

    // Check app access for client orgs
    for (const rel of agencyRelations) {
      const { data: clientApps } = await supabase
        .from('org_app_access')
        .select('app_id')
        .eq('organization_id', rel.client_org_id)
        .is('detached_at', null);

      console.log(`      → Client has ${clientApps?.length || 0} apps`);
    }
  } else {
    console.log('   ℹ️  Yodel Mobile is not configured as an agency');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DIAGNOSIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!appAccess || appAccess.length === 0) {
    console.log('');
    console.log('❌ ROOT CAUSE: No apps in org_app_access for Yodel Mobile!');
    console.log('');
    console.log('The BigQuery edge function queries org_app_access to find which');
    console.log('apps the organization can access. Since there are no records,');
    console.log('it returns an empty array and shows "No apps attached".');
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('   1. Add apps to org_app_access for Yodel Mobile organization');
    console.log('   2. OR configure Yodel Mobile as an agency with client orgs that have apps');
    console.log('');
  } else {
    console.log('');
    console.log('✅ Apps are properly configured in org_app_access');
    console.log('   If users still can\'t see data, check:');
    console.log('   1. User authentication');
    console.log('   2. Edge function logs');
    console.log('   3. BigQuery table has data for these app IDs');
    console.log('');
  }
}

checkYodelAppAccess().catch(console.error);
