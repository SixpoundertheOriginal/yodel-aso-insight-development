import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Edge Function with Service Role\n');
console.log('='.repeat(80));

async function test() {
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Use service role client - bypasses RLS and auth
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n📋 Calling bigquery-aso-data edge function');
  console.log('   Mode: Service Role (bypasses auth)');

  const requestBody = {
    org_id: yodelOrgId,
    organization_id: yodelOrgId,
    date_range: {
      start: '2024-11-01',
      end: '2024-11-30'
    }
  };

  console.log('   Payload:', JSON.stringify(requestBody, null, 2));

  const startTime = Date.now();

  const { data, error } = await supabase.functions.invoke('bigquery-aso-data', {
    body: requestBody
  });

  const duration = Date.now() - startTime;

  console.log(`\n⏱️  Response time: ${duration}ms`);
  console.log('='.repeat(80));

  if (error) {
    console.log('\n❌ EDGE FUNCTION ERROR:');
    console.log('   Name:', error.name);
    console.log('   Message:', error.message || 'No message');
    console.log('   Context:', JSON.stringify(error.context || {}, null, 2));
    console.log('   Status:', error.status);

    console.log('\n⚠️  This means the edge function either:');
    console.log('   1. Crashed with an unhandled exception');
    console.log('   2. Returned invalid JSON');
    console.log('   3. Timed out (>150 seconds)');
    console.log('   4. Has a code error (check logs)');

    console.log('\n🔍 CHECK LOGS AT:');
    console.log('   https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions');
    console.log('\n   Search for:');
    console.log('   - "bigquery-aso-data"');
    console.log('   - Error messages');
    console.log('   - Stack traces');
    console.log('   - [AGENCY DIAGNOSTIC]');
    console.log('   - [BIGQUERY DIAGNOSTIC]');
    return;
  }

  if (!data) {
    console.log('\n❌ NO RESPONSE DATA');
    return;
  }

  console.log('\n✅ RESPONSE STRUCTURE:');
  console.log('   success:', data.success);
  console.log('   has data:', Array.isArray(data.data));
  console.log('   has meta:', !!data.meta);
  console.log('   has scope:', !!data.scope);

  if (data.success === false) {
    console.log('\n❌ EDGE FUNCTION ERROR RESPONSE:');
    console.log('   error:', data.error);
    console.log('   details:', data.details);
    console.log('   hint:', data.hint);

    // Diagnose error type
    const err = (data.error || '').toLowerCase();
    if (err.includes('auth')) {
      console.log('\n📋 AUTH ERROR - Service role should bypass this!');
    } else if (err.includes('organization')) {
      console.log('\n📋 ORGANIZATION ERROR');
      console.log('   Service role has no org - this is expected');
      console.log('   Edge function needs org_id in request body');
    } else if (err.includes('bigquery')) {
      console.log('\n📋 BIGQUERY ERROR');
      console.log('   - Check BIGQUERY_CREDENTIALS secret');
      console.log('   - Check BIGQUERY_PROJECT_ID secret');
      console.log('   - Check BigQuery API is enabled');
    } else if (err.includes('app')) {
      console.log('\n📋 APP ACCESS ERROR');
      console.log('   - No apps found for organization');
      console.log('   - Check org_app_access table');
      console.log('   - Check agency_clients table');
    }
    return;
  }

  // Success!
  console.log('\n✅ SUCCESS!');

  if (data.meta) {
    console.log('\n📊 META:');
    console.log('   request_id:', data.meta.request_id);
    console.log('   org_id:', data.meta.org_id);
    console.log('   app_count:', data.meta.app_count);
    console.log('   data_source:', data.meta.data_source);
    console.log('   query_duration_ms:', data.meta.query_duration_ms);
    console.log('   available_traffic_sources:', data.meta.available_traffic_sources?.length || 0);
    console.log('   row_count:', data.meta.row_count);
  }

  if (data.scope) {
    console.log('\n🎯 SCOPE:');
    console.log('   org_id:', data.scope.org_id || data.scope.organization_id);
    console.log('   app_ids:', data.scope.app_ids?.length || 0);
    console.log('   scope_source:', data.scope.scope_source);
  }

  const rows = data.data || [];
  console.log('\n📈 DATA:');
  console.log('   Total rows:', rows.length);

  if (rows.length > 0) {
    console.log('\n   Sample row:');
    console.log('   ', JSON.stringify(rows[0], null, 2).split('\n').join('\n    '));

    // Stats
    const apps = [...new Set(rows.map(r => r.app_id))].filter(Boolean);
    const sources = [...new Set(rows.map(r => r.traffic_source))].filter(Boolean);
    const dates = [...new Set(rows.map(r => r.date))].filter(Boolean).sort();

    const totalImp = rows.reduce((s, r) => s + (r.impressions || 0), 0);
    const totalDl = rows.reduce((s, r) => s + (r.downloads || 0), 0);

    console.log('\n   📊 STATS:');
    console.log('      Apps:', apps.length, '-', apps.slice(0, 3).join(', '));
    console.log('      Sources:', sources.length, '-', sources.join(', '));
    console.log('      Dates:', dates[0], 'to', dates[dates.length - 1]);
    console.log('      Impressions:', totalImp.toLocaleString());
    console.log('      Downloads:', totalDl.toLocaleString());
    console.log('      CVR:', totalImp > 0 ? ((totalDl / totalImp) * 100).toFixed(2) + '%' : '0%');

    console.log('\n' + '='.repeat(80));
    console.log('🎉  BACKEND PIPELINE IS WORKING!  🎉');
    console.log('='.repeat(80));
    console.log('\n✅ Edge function: HEALTHY');
    console.log('✅ BigQuery connection: WORKING');
    console.log('✅ Data returned: YES');
    console.log('✅ Agency relationships: WORKING');
    console.log('✅ App access: WORKING');
    console.log('\nIf Dashboard V2 fails, issue is in FRONTEND');

  } else if (rows.length === 0) {
    console.log('\n⚠️  EMPTY DATA');
    console.log('   Edge function works but BigQuery returned 0 rows');
    console.log('\n   Possible causes:');
    console.log('   1. No data in BigQuery for these app IDs');
    console.log('   2. Date range has no data');
    console.log('   3. App IDs in DB ≠ app IDs in BigQuery');
    console.log('   4. BigQuery table/query issue');

    if (data.meta?.app_count === 0) {
      console.log('\n   ❌ NO APPS FOUND!');
      console.log('      Check org_app_access and agency_clients tables');
    } else {
      console.log(`\n   ✅ Found ${data.meta?.app_count} apps`);
      console.log('      App IDs:', data.scope?.app_ids?.slice(0, 5).join(', '));
    }
  }

  console.log('\n');
}

test().catch(err => {
  console.error('\n💥 CRASH:');
  console.error(err);
});
