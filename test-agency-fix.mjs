/**
 * Test Agency-Client Support for Dashboard V2
 *
 * This script tests that Yodel Mobile users can access BigQuery data
 * from their client organizations through the agency relationship.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const TEST_EMAIL = process.env.CLI_TEST_EMAIL || 'cli@yodelmobile.com';

console.log('━'.repeat(80));
console.log('🧪 TESTING AGENCY-CLIENT SUPPORT FOR DASHBOARD V2');
console.log('━'.repeat(80));
console.log(`Test User: ${TEST_EMAIL}`);
console.log(`Expected: Should see apps from client organizations`);
console.log('');

async function testAgencySupport() {
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Sign in as test user
  console.log('🔐 Step 1: Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: 'Test1234!',
  });

  if (authError) {
    console.error('❌ Authentication failed:', authError.message);
    return;
  }

  console.log(`✅ Signed in as: ${authData.user.email}`);
  console.log('');

  // Get user's organization
  console.log('🏢 Step 2: Getting user organization...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('organization_id, organizations(name)')
    .eq('user_id', authData.user.id)
    .single();

  if (rolesError) {
    console.error('❌ Failed to get user roles:', rolesError.message);
    return;
  }

  const userOrgId = roles.organization_id;
  const userOrgName = roles.organizations?.name || 'Unknown';
  console.log(`✅ Organization: ${userOrgName} (${userOrgId})`);
  console.log('');

  // Check if organization is an agency
  console.log('🔗 Step 3: Checking agency relationships...');
  const { data: clients, error: clientsError } = await supabase
    .from('agency_clients')
    .select('client_org_id, client_organizations:organizations!agency_clients_client_org_id_fkey(name)')
    .eq('agency_org_id', userOrgId)
    .eq('is_active', true);

  if (clientsError) {
    console.log('⚠️  Could not check agency status:', clientsError.message);
  } else if (!clients || clients.length === 0) {
    console.log('ℹ️  This organization is not an agency (no client relationships)');
  } else {
    console.log(`✅ Agency detected! Managing ${clients.length} client organization(s):`);
    clients.forEach((client, i) => {
      const clientName = client.client_organizations?.name || 'Unknown';
      console.log(`   ${i + 1}. ${clientName} (${client.client_org_id})`);
    });
  }
  console.log('');

  // Test the Edge Function
  console.log('🚀 Step 4: Testing bigquery-aso-data Edge Function...');

  const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke(
    'bigquery-aso-data',
    {
      body: {
        action: 'query',
        request_id: `test-${Date.now()}`,
        organizationId: userOrgId,
        traffic_types: ['search', 'browse'],
        days: 30,
      },
    }
  );

  if (edgeFunctionError) {
    console.error('❌ Edge Function failed:', edgeFunctionError.message);
    return;
  }

  console.log('✅ Edge Function Response:');
  console.log(`   Status: ${edgeFunctionData?.error ? 'ERROR' : 'SUCCESS'}`);

  if (edgeFunctionData?.error) {
    console.log(`   Error: ${edgeFunctionData.error}`);
    console.log(`   Details: ${edgeFunctionData.details || 'None'}`);
  } else {
    const summary = edgeFunctionData?.summary || {};
    const timeseries = edgeFunctionData?.timeseries || [];

    console.log(`   Total Apps: ${summary.total_apps || 0}`);
    console.log(`   Total Impressions: ${summary.total_impressions || 0}`);
    console.log(`   Data Points: ${timeseries.length}`);

    if (summary.total_apps > 0) {
      console.log('');
      console.log('🎉 SUCCESS! Agency user can access client organization apps!');
    } else {
      console.log('');
      console.log('⚠️  WARNING: No apps found. This might indicate:');
      console.log('   1. Client organizations have no apps in org_app_access');
      console.log('   2. Agency relationship is not configured correctly');
      console.log('   3. Edge Function is not querying agency_clients table');
    }
  }
  console.log('');

  // Check Edge Function logs for agency detection
  console.log('📋 Step 5: Recommendations...');
  console.log('   Check Edge Function logs in Supabase Dashboard for:');
  console.log('   - "[AGENCY] Checking for agency relationships"');
  console.log('   - "[AGENCY] Agency mode enabled"');
  console.log('   - "managed_client_count" and "client_org_ids"');
  console.log('');
  console.log('   Dashboard: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions/bigquery-aso-data/logs');
  console.log('');

  console.log('━'.repeat(80));
  console.log('✅ TEST COMPLETE');
  console.log('━'.repeat(80));

  // Clean up
  await supabase.auth.signOut();
}

testAgencySupport().catch(console.error);
