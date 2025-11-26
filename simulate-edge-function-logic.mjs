import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateEdgeFunctionLogic() {
  console.log('🔍 Simulating BigQuery Edge Function Logic...\n');

  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Step 1: Start with the requesting organization
  console.log('📋 Step 1: Starting with organization:', yodelOrgId);
  let organizationsToQuery = [yodelOrgId];

  // Step 2: Check if this org is an agency (same logic as edge function)
  console.log('\n📋 Step 2: Checking if organization is an agency...');
  const { data: agencyClients, error: agencyError } = await supabase
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  if (agencyError) {
    console.error('❌ Error querying agency_clients:', agencyError);
  } else if (agencyClients && agencyClients.length > 0) {
    console.log(`✅ Organization IS an agency with ${agencyClients.length} clients`);
    const clientOrgIds = agencyClients.map((ac) => ac.client_org_id);
    console.log('   Client org IDs:', clientOrgIds);

    // Expand organizationsToQuery to include clients
    organizationsToQuery = [yodelOrgId, ...clientOrgIds];
    console.log('   Expanded organizationsToQuery:', organizationsToQuery);
  } else {
    console.log('   Organization is NOT an agency');
  }

  // Step 3: Query org_app_access with expanded org list (same as edge function)
  console.log('\n📋 Step 3: Querying org_app_access for all organizations...');
  const { data: accessData, error: accessError } = await supabase
    .from('org_app_access')
    .select('app_id, attached_at, detached_at, organization_id')
    .in('organization_id', organizationsToQuery)
    .is('detached_at', null);

  if (accessError) {
    console.error('❌ Error querying org_app_access:', accessError);
    return;
  }

  console.log(`✅ Found ${accessData?.length || 0} app access records`);

  if (accessData && accessData.length > 0) {
    console.log('\n📊 App access breakdown by organization:');
    const byOrg = {};
    accessData.forEach(record => {
      const orgId = record.organization_id;
      if (!byOrg[orgId]) {
        byOrg[orgId] = [];
      }
      byOrg[orgId].push(record.app_id);
    });

    Object.entries(byOrg).forEach(([orgId, appIds]) => {
      const label = orgId === yodelOrgId ? 'Yodel Mobile (agency)' : 'Client org';
      console.log(`   ${label} (${orgId.substring(0, 8)}...): ${appIds.length} apps`);
      console.log(`      App IDs: ${appIds.slice(0, 3).join(', ')}${appIds.length > 3 ? '...' : ''}`);
    });

    // Step 4: Extract app IDs (same as edge function)
    const allowedAppIds = accessData.map((item) => item.app_id).filter((id) => Boolean(id));
    console.log(`\n✅ Total allowed app IDs: ${allowedAppIds.length}`);
    console.log('   Sample app IDs:', allowedAppIds.slice(0, 5).join(', '));

    // Step 5: This is what would be used for BigQuery query
    console.log('\n📋 Step 5: These app IDs would be used for BigQuery query');
    console.log('   BigQuery would filter for app_id IN:', allowedAppIds);

  } else {
    console.log('\n❌ NO app access records found!');
    console.log('   Edge function would return: "No apps attached to this organization"');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Organizations queried: ${organizationsToQuery.length}`);
  console.log(`App access records found: ${accessData?.length || 0}`);
  console.log(`Unique app IDs for BigQuery: ${new Set((accessData || []).map(d => d.app_id)).size}`);
}

simulateEdgeFunctionLogic().catch(console.error);
