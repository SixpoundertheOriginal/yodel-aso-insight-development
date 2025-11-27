import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔬 BigQuery Pipeline Diagnostic\n');
console.log('='.repeat(80));
console.log('');

async function diagnose() {
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  const cliUserId = '8920ac57-63da-4f8e-9970-719be1e2569c';

  // ============================================
  // CHECK 1: Agency Relationships (RLS)
  // ============================================
  console.log('✅ CHECK 1: Agency Relationships (RLS enabled)');

  const { data: agencyClients, error: agencyError } = await supabase
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  if (agencyError) {
    console.log('   ❌ Error:', agencyError.message);
  } else {
    console.log('   ✅ Found', agencyClients?.length || 0, 'client organizations');
    if (agencyClients && agencyClients.length > 0) {
      agencyClients.forEach(c => console.log('      -', c.client_org_id.substring(0, 8) + '...'));
    }
  }
  console.log('');

  // ============================================
  // CHECK 2: App Access
  // ============================================
  console.log('✅ CHECK 2: App Access (via org_app_access)');

  const orgIds = [yodelOrgId];
  if (agencyClients && agencyClients.length > 0) {
    orgIds.push(...agencyClients.map(c => c.client_org_id));
  }

  const { data: appAccess, error: appError } = await supabase
    .from('org_app_access')
    .select('app_id, organization_id')
    .in('organization_id', orgIds)
    .is('detached_at', null);

  let appIds = [];
  if (appError) {
    console.log('   ❌ Error:', appError.message);
  } else {
    console.log('   ✅ Found', appAccess?.length || 0, 'app access records');
    appIds = [...new Set((appAccess || []).map(a => a.app_id))];
    console.log('   📱 Unique App IDs:', appIds.length);
    appIds.forEach(id => console.log('      -', id));
  }
  console.log('');

  // ============================================
  // CHECK 3: BigQuery Secrets
  // ============================================
  console.log('✅ CHECK 3: BigQuery Secrets (Edge Function Environment)');
  console.log('   Note: Secrets are only accessible from edge function runtime');
  console.log('   We verified these exist via supabase secrets list:');
  console.log('      ✅ BIGQUERY_CREDENTIALS (configured)');
  console.log('      ✅ BIGQUERY_PROJECT_ID (configured)');
  console.log('');

  // ============================================
  // CHECK 4: What the browser should show
  // ============================================
  console.log('='.repeat(80));
  console.log('📋 EXPECTED BROWSER BEHAVIOR:');
  console.log('='.repeat(80));
  console.log('');
  console.log('When you refresh Dashboard V2, the browser should:');
  console.log('');
  console.log('1. ✅ Call: POST /functions/v1/bigquery-aso-data');
  console.log('   With body: {');
  console.log('     organizationId: "7cccba3f-0a8f-446f-9dba-86e9cb68c92b",');
  console.log('     dateRange: { from: "2024-11-26", to: "2025-11-26" },');
  console.log('     selectedApps: [],');
  console.log('     trafficSources: []');
  console.log('   }');
  console.log('');
  console.log('2. ✅ Edge function should:');
  console.log('   - Authenticate user (cli@yodelmobile.com)');
  console.log('   - Get user role: VIEWER');
  console.log('   - Query agency_clients → Find 1 client org');
  console.log('   - Query org_app_access → Find', appAccess?.length || 0, 'apps');
  console.log('   - Query BigQuery with app IDs:', appIds.slice(0, 3).join(', '), '...');
  console.log('   - Return data with traffic sources');
  console.log('');
  console.log('3. ❓ ACTUAL RESPONSE (check browser Network tab):');
  console.log('   Open DevTools → Network → Filter "bigquery"');
  console.log('   Click the request → Response tab');
  console.log('');
  console.log('   Look for:');
  console.log('   - success: true or false?');
  console.log('   - error: "..." (if success is false)');
  console.log('   - data: [] (array length?)');
  console.log('   - meta.availableTrafficSources: [] (array length?)');
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('📊 POSSIBLE FAILURE SCENARIOS:');
  console.log('');
  console.log('Scenario A: Response has success:false with error message');
  console.log('   → BigQuery credentials issue or query syntax error');
  console.log('');
  console.log('Scenario B: Response has success:true but data:[] and meta missing');
  console.log('   → Hitting "No apps" early return (line 448 in edge function)');
  console.log('   → Agency relationships not being found');
  console.log('');
  console.log('Scenario C: Response has success:true, data:[], meta:{ availableTrafficSources:[] }');
  console.log('   → BigQuery query executing but returning 0 rows');
  console.log('   → App IDs don\'t match data in BigQuery');
  console.log('   → Or date range has no data');
  console.log('');
  console.log('Scenario D: TypeError about meta.availableTrafficSources');
  console.log('   → meta field is missing from response');
  console.log('   → Hitting "No apps" path which doesn\'t include meta');
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('🔍 NEXT STEPS:');
  console.log('');
  console.log('1. Open Dashboard V2 in browser');
  console.log('2. Open DevTools (F12 or Cmd+Option+I)');
  console.log('3. Go to Network tab');
  console.log('4. Hard refresh (Cmd+Shift+R)');
  console.log('5. Find "bigquery-aso-data" request');
  console.log('6. Click it → Response tab');
  console.log('7. Copy the FULL JSON response');
  console.log('8. Share it here');
  console.log('');
  console.log('This will show us EXACTLY what the edge function is returning');
  console.log('and help identify which scenario we\'re hitting.');
  console.log('');
}

diagnose().catch(console.error);
