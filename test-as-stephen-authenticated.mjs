import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testAsStephenAuthenticated() {
  console.log('🔍 Testing BigQuery data access as authenticated Stephen user...\n');

  // Get Stephen's user ID
  const { data: stephenProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('email', 'stephen@yodelmobile.com')
    .single();

  if (!stephenProfile) {
    console.error('❌ Could not find Stephen');
    return;
  }

  console.log('📋 Found Stephen:');
  console.log('  User ID:', stephenProfile.id);
  console.log('  Email:', stephenProfile.email);
  console.log('');

  // Generate a JWT token for Stephen (for testing purposes)
  // In production, this would come from auth.signIn()
  // For this test, we'll simulate the queries the edge function makes

  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  const stephenUserId = stephenProfile.id;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔒 SIMULATING EDGE FUNCTION AS AUTHENTICATED USER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Note: Using service role but filtering to what RLS would allow');
  console.log('');

  // Step 1: Query agency_clients (what edge function does)
  console.log('📋 Step 1: Query agency_clients for Yodel Mobile...');
  console.log(`  Query: SELECT client_org_id FROM agency_clients WHERE agency_org_id = '${yodelOrgId}' AND is_active = true`);

  // First, check what RLS would allow
  const { data: stephenOrgIds } = await supabaseAdmin
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', stephenUserId);

  const allowedOrgIds = (stephenOrgIds || []).map(r => r.organization_id);
  console.log(`  Stephen's allowed org_ids from user_roles: [${allowedOrgIds.join(', ')}]`);

  // Simulate RLS: can only see records where agency_org_id IN (allowedOrgIds) OR client_org_id IN (allowedOrgIds)
  const { data: agencyClients } = await supabaseAdmin
    .from('agency_clients')
    .select('*')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  // Filter by RLS manually
  const rlsFilteredClients = (agencyClients || []).filter(record =>
    allowedOrgIds.includes(record.agency_org_id) || allowedOrgIds.includes(record.client_org_id)
  );

  if (rlsFilteredClients.length > 0) {
    console.log(`  ✅ RLS would return ${rlsFilteredClients.length} client relationships`);
    rlsFilteredClients.forEach((client, i) => {
      console.log(`     ${i + 1}. Client: ${client.client_org_id.substring(0, 8)}...`);
    });
  } else {
    console.log(`  ❌ RLS would return 0 client relationships (BLOCKED!)`);
    console.log('  This is why BigQuery shows no data!');
  }
  console.log('');

  // Step 2: Build organizations to query
  const clientOrgIds = rlsFilteredClients.map(c => c.client_org_id);
  const organizationsToQuery = [yodelOrgId, ...clientOrgIds];

  console.log('📋 Step 2: Build organizations list...');
  console.log(`  Organizations to query: ${organizationsToQuery.length}`);
  organizationsToQuery.forEach((org, i) => {
    const label = org === yodelOrgId ? 'Yodel Mobile (agency)' : 'Client org';
    console.log(`     ${i + 1}. ${label}: ${org.substring(0, 8)}...`);
  });
  console.log('');

  // Step 3: Query org_app_access (what edge function does)
  console.log('📋 Step 3: Query org_app_access for allowed apps...');
  console.log(`  Query: SELECT app_id FROM org_app_access WHERE organization_id IN (${organizationsToQuery.length} orgs) AND detached_at IS NULL`);

  const { data: appAccess } = await supabaseAdmin
    .from('org_app_access')
    .select('app_id, organization_id')
    .in('organization_id', organizationsToQuery)
    .is('detached_at', null);

  if (appAccess && appAccess.length > 0) {
    console.log(`  ✅ Found ${appAccess.length} app access records`);
    const byOrg = {};
    appAccess.forEach(record => {
      if (!byOrg[record.organization_id]) byOrg[record.organization_id] = [];
      byOrg[record.organization_id].push(record.app_id);
    });
    Object.entries(byOrg).forEach(([orgId, appIds]) => {
      const label = orgId === yodelOrgId ? 'Yodel Mobile' : 'Client';
      console.log(`     ${label} (${orgId.substring(0, 8)}...): ${appIds.length} apps`);
    });
  } else {
    console.log(`  ❌ Found 0 app access records`);
  }
  console.log('');

  // Step 4: Final result
  const allowedAppIds = (appAccess || []).map(a => a.app_id);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`App IDs for BigQuery: ${allowedAppIds.length}`);
  if (allowedAppIds.length > 0) {
    console.log(`Sample: ${allowedAppIds.slice(0, 5).join(', ')}${allowedAppIds.length > 5 ? '...' : ''}`);
    console.log('');
    console.log('✅ Edge function would return these apps to BigQuery');
  } else {
    console.log('');
    console.log('❌ Edge function would return: "No apps attached to this organization"');
  }
  console.log('');
}

testAsStephenAuthenticated().catch(console.error);
