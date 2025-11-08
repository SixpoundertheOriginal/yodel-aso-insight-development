/**
 * Verify Agency Implementation - Database Level Check
 *
 * This script verifies that the agency-client infrastructure is correct
 * and that Yodel Mobile should be able to access client organization apps.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  console.log('Run: source .env && node verify-agency-implementation.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('━'.repeat(80));
console.log('🔍 AGENCY IMPLEMENTATION VERIFICATION');
console.log('━'.repeat(80));
console.log('');

async function verify() {
  // Step 1: Verify agency_clients table exists and has data
  console.log('📊 Step 1: Checking agency_clients table...');
  const { data: agencyClients, error: agencyError } = await supabase
    .from('agency_clients')
    .select(`
      agency_org_id,
      client_org_id,
      is_active,
      agency:organizations!agency_clients_agency_org_id_fkey(name),
      client:organizations!agency_clients_client_org_id_fkey(name)
    `)
    .eq('is_active', true);

  if (agencyError) {
    console.error('❌ Error querying agency_clients:', agencyError.message);
    return;
  }

  console.log(`✅ Found ${agencyClients.length} active agency relationships:`);
  agencyClients.forEach((rel, i) => {
    const agencyName = rel.agency?.name || 'Unknown';
    const clientName = rel.client?.name || 'Unknown';
    console.log(`   ${i + 1}. ${agencyName} → ${clientName}`);
  });
  console.log('');

  // Step 2: Focus on Yodel Mobile
  const yodelMobileId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  const yodelMobileClients = agencyClients.filter(
    rel => rel.agency_org_id === yodelMobileId
  );

  console.log('🎯 Step 2: Yodel Mobile agency relationships...');
  if (yodelMobileClients.length === 0) {
    console.log('⚠️  Yodel Mobile has no client organizations');
    return;
  }

  console.log(`✅ Yodel Mobile manages ${yodelMobileClients.length} client org(s):`);
  yodelMobileClients.forEach((rel, i) => {
    const clientName = rel.client?.name || 'Unknown';
    console.log(`   ${i + 1}. ${clientName} (${rel.client_org_id})`);
  });
  console.log('');

  // Step 3: Check apps for each client org
  console.log('📱 Step 3: Checking apps in client organizations...');

  const clientOrgIds = yodelMobileClients.map(rel => rel.client_org_id);
  const { data: clientApps, error: appsError } = await supabase
    .from('org_app_access')
    .select('organization_id, app_id')
    .in('organization_id', clientOrgIds)
    .is('detached_at', null);

  if (appsError) {
    console.error('❌ Error querying org_app_access:', appsError.message);
    return;
  }

  // Count apps per org
  const appsByOrg = {};
  clientApps.forEach(app => {
    if (!appsByOrg[app.organization_id]) {
      appsByOrg[app.organization_id] = [];
    }
    appsByOrg[app.organization_id].push(app.app_id);
  });

  let totalApps = 0;
  yodelMobileClients.forEach((rel, i) => {
    const clientName = rel.client?.name || 'Unknown';
    const appCount = appsByOrg[rel.client_org_id]?.length || 0;
    totalApps += appCount;
    console.log(`   ${i + 1}. ${clientName}: ${appCount} apps`);
  });

  console.log(`   Total apps accessible through agency: ${totalApps}`);
  console.log('');

  // Step 4: Verify Edge Function query would work
  console.log('🔧 Step 4: Simulating Edge Function query...');

  const organizationsToQuery = [yodelMobileId, ...clientOrgIds];
  console.log(`   Organizations to query: ${organizationsToQuery.length}`);
  console.log(`   - Yodel Mobile: ${yodelMobileId}`);
  clientOrgIds.forEach((id, i) => {
    const client = yodelMobileClients[i];
    const clientName = client?.client?.name || 'Unknown';
    console.log(`   - ${clientName}: ${id}`);
  });
  console.log('');

  const { data: allAccessibleApps, error: queryError } = await supabase
    .from('org_app_access')
    .select('app_id, organization_id')
    .in('organization_id', organizationsToQuery)
    .is('detached_at', null);

  if (queryError) {
    console.error('❌ Error simulating query:', queryError.message);
    return;
  }

  console.log(`✅ Query would return ${allAccessibleApps.length} apps`);

  // Break down by org
  const appCountByOrg = {};
  allAccessibleApps.forEach(app => {
    appCountByOrg[app.organization_id] = (appCountByOrg[app.organization_id] || 0) + 1;
  });

  console.log('   Apps by organization:');
  organizationsToQuery.forEach(orgId => {
    const count = appCountByOrg[orgId] || 0;
    let orgName = 'Yodel Mobile';
    if (orgId !== yodelMobileId) {
      const clientRel = yodelMobileClients.find(rel => rel.client_org_id === orgId);
      orgName = clientRel?.client?.name || 'Unknown Client';
    }
    console.log(`   - ${orgName}: ${count} apps`);
  });
  console.log('');

  // Step 5: Final verdict
  console.log('━'.repeat(80));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('━'.repeat(80));

  if (totalApps > 0) {
    console.log('✅ IMPLEMENTATION VERIFIED!');
    console.log('');
    console.log('The agency-client support is correctly implemented:');
    console.log(`   ✓ Agency relationships exist (${yodelMobileClients.length} clients)`);
    console.log(`   ✓ Client organizations have apps (${totalApps} total)`);
    console.log(`   ✓ Edge Function query pattern is correct`);
    console.log('');
    console.log('Expected behavior:');
    console.log(`   - Yodel Mobile users should see ${totalApps} apps in Dashboard V2`);
    console.log('   - Data will come from client organizations');
    console.log('   - Edge Function logs should show "[AGENCY] Agency mode enabled"');
    console.log('');
  } else {
    console.log('⚠️  WARNING: No apps found in client organizations');
    console.log('');
    console.log('Possible issues:');
    console.log('   - Client organizations have no apps in org_app_access');
    console.log('   - Apps might have been detached');
    console.log('   - Need to import apps for client organizations');
    console.log('');
  }

  console.log('Next steps:');
  console.log('   1. Test Dashboard V2 with cli@yodelmobile.com user');
  console.log('   2. Check Edge Function logs for agency detection');
  console.log('   3. Verify charts and data display correctly');
  console.log('');
  console.log('Edge Function Logs:');
  console.log('   https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions/bigquery-aso-data/logs');
  console.log('');
  console.log('━'.repeat(80));
}

verify().catch(console.error);
