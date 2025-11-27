import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Complete Edge Function → BigQuery Test\n');
console.log('='.repeat(80));

async function test() {
  const cliUserId = '8920ac57-63da-4f8e-9970-719be1e2569c';
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Create service role client for admin operations
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: Generate auth token
  console.log('\n📋 Step 1: Generate authentication token');
  const { data: userData } = await supabaseService.auth.admin.getUserById(cliUserId);
  console.log('   ✅ User:', userData.user.email);

  const { data: linkData, error: linkError } = await supabaseService.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email
  });

  if (linkError || !linkData?.properties?.access_token) {
    console.log('   ❌ Failed to generate token:', linkError?.message || 'No token in response');
    console.log('   Full response:', JSON.stringify(linkData, null, 2));
    return;
  }

  const accessToken = linkData.properties.access_token;
  console.log('   ✅ Token generated:', accessToken.substring(0, 20) + '...');

  // Step 2: Create authenticated client
  console.log('\n📋 Step 2: Create authenticated client');
  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  console.log('   ✅ Client created with auth header');

  // Step 3: Prepare request
  console.log('\n📋 Step 3: Prepare edge function request');
  const requestBody = {
    org_id: yodelOrgId,
    date_range: {
      start: '2024-11-01',
      end: '2024-11-30'
    }
  };
  console.log('   Payload:', JSON.stringify(requestBody, null, 2));

  // Step 4: Call edge function
  console.log('\n📋 Step 4: Invoke bigquery-aso-data edge function');
  const startTime = Date.now();

  try {
    const { data, error } = await authClient.functions.invoke('bigquery-aso-data', {
      body: requestBody
    });

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Response time: ${duration}ms`);
    console.log('='.repeat(80));

    if (error) {
      console.log('\n❌ EDGE FUNCTION ERROR:');
      console.log('   Type:', error.name);
      console.log('   Message:', error.message || 'No message');
      console.log('   Context:', JSON.stringify(error.context || {}, null, 2));
      console.log('   Status:', error.status);

      // Try to get more details from the response
      if (error.context && error.context.__isAuthError) {
        console.log('\n⚠️  AUTH ERROR - User session is invalid');
      } else {
        console.log('\n⚠️  GENERIC HTTP ERROR');
        console.log('   This usually means:');
        console.log('   1. Edge function crashed with unhandled exception');
        console.log('   2. Edge function timeout (>150s)');
        console.log('   3. Invalid response format from edge function');
        console.log('   4. BigQuery credentials issue');
        console.log('\n🔍 CHECK EDGE FUNCTION LOGS:');
        console.log('   https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions');
        console.log('   Look for:');
        console.log('   - Error messages');
        console.log('   - Stack traces');
        console.log('   - [AGENCY DIAGNOSTIC] logs');
        console.log('   - [BIGQUERY DIAGNOSTIC] logs');
      }
      return;
    }

    if (!data) {
      console.log('\n❌ NO RESPONSE DATA');
      return;
    }

    console.log('\n✅ RESPONSE RECEIVED:');
    console.log('   success:', data.success);

    if (data.success === false) {
      console.log('\n❌ EDGE FUNCTION RETURNED ERROR:');
      console.log('   error:', data.error);
      console.log('   details:', data.details);
      console.log('   hint:', data.hint);

      // Analyze error type
      const errorMsg = (data.error || '').toLowerCase();
      if (errorMsg.includes('authentication')) {
        console.log('\n📋 DIAGNOSIS: Authentication Error');
        console.log('   - User session invalid');
        console.log('   - Token expired');
      } else if (errorMsg.includes('organization')) {
        console.log('\n📋 DIAGNOSIS: Organization Selection Error');
        console.log('   - Super admin must select org');
        console.log('   - Or user has no org assigned');
      } else if (errorMsg.includes('app')) {
        console.log('\n📋 DIAGNOSIS: App Access Error');
        console.log('   - No apps found for organization');
        console.log('   - Agency relationships broken');
      } else if (errorMsg.includes('bigquery')) {
        console.log('\n📋 DIAGNOSIS: BigQuery Error');
        console.log('   - Credentials invalid');
        console.log('   - Query syntax error');
        console.log('   - Project ID missing');
      }
      return;
    }

    // Success!
    console.log('   ✅ success: true');

    if (data.meta) {
      console.log('\n📊 META:');
      console.log('   request_id:', data.meta.request_id);
      console.log('   org_id:', data.meta.org_id);
      console.log('   app_count:', data.meta.app_count);
      console.log('   data_source:', data.meta.data_source);
      console.log('   query_duration_ms:', data.meta.query_duration_ms);
      console.log('   available_traffic_sources:', data.meta.available_traffic_sources?.length || 0);
    }

    if (data.scope) {
      console.log('\n🎯 SCOPE:');
      console.log('   organization_id:', data.scope.organization_id);
      console.log('   app_ids:', data.scope.app_ids?.length || 0, 'apps');
      console.log('   scope_source:', data.scope.scope_source);
    }

    const dataArray = data.data || [];
    console.log('\n📈 DATA:');
    console.log('   Rows:', dataArray.length);

    if (dataArray.length > 0) {
      console.log('   Sample row:', JSON.stringify(dataArray[0]));

      // Calculate stats
      const uniqueApps = [...new Set(dataArray.map(r => r.app_id))].filter(Boolean);
      const uniqueSources = [...new Set(dataArray.map(r => r.traffic_source))].filter(Boolean);
      const uniqueDates = [...new Set(dataArray.map(r => r.date))].filter(Boolean).sort();

      const totalImpressions = dataArray.reduce((sum, r) => sum + (r.impressions || 0), 0);
      const totalDownloads = dataArray.reduce((sum, r) => sum + (r.downloads || 0), 0);
      const cvr = totalImpressions > 0 ? (totalDownloads / totalImpressions * 100) : 0;

      console.log('\n📊 STATISTICS:');
      console.log('   Apps:', uniqueApps.length, '-', uniqueApps.slice(0, 3).join(', '));
      console.log('   Traffic Sources:', uniqueSources.length, '-', uniqueSources.join(', '));
      console.log('   Date Range:', uniqueDates[0], 'to', uniqueDates[uniqueDates.length - 1], `(${uniqueDates.length} days)`);
      console.log('   Total Impressions:', totalImpressions.toLocaleString());
      console.log('   Total Downloads:', totalDownloads.toLocaleString());
      console.log('   Overall CVR:', cvr.toFixed(2) + '%');

      console.log('\n' + '='.repeat(80));
      console.log('🎉 🎉 🎉  BACKEND IS WORKING PERFECTLY!  🎉 🎉 🎉');
      console.log('='.repeat(80));
      console.log('\n✅ Edge function is live and healthy');
      console.log('✅ BigQuery connection working');
      console.log('✅ Data is being returned');
      console.log('\nIf Dashboard V2 is not loading, check FRONTEND:');
      console.log('  1. Browser console errors');
      console.log('  2. Network tab for failed requests');
      console.log('  3. useEnterpriseAnalytics hook');
      console.log('  4. ReportingDashboardV2 component rendering');

    } else {
      console.log('\n⚠️  EMPTY DATA RETURNED');
      console.log('   Edge function works but BigQuery returned 0 rows');
      console.log('\n📋 POSSIBLE CAUSES:');
      console.log('   1. No data for these app IDs in BigQuery');
      console.log('   2. Date range has no data');
      console.log('   3. App IDs in database ≠ app IDs in BigQuery');
      console.log('   4. BigQuery table name incorrect');

      if (data.meta?.app_count === 0) {
        console.log('\n❌ NO APPS FOUND:');
        console.log('   The edge function found ZERO apps');
        console.log('   Check:');
        console.log('   - agency_clients table (should have 1 client org)');
        console.log('   - org_app_access table (should have 8 apps)');
        console.log('   - RLS policies on both tables');
      }
    }

  } catch (err) {
    console.log('\n💥 EXCEPTION THROWN:');
    console.log('   Type:', err.constructor.name);
    console.log('   Message:', err.message);
    console.log('   Stack:', err.stack);
  }

  console.log('\n');
}

test().catch(err => {
  console.error('\n💥 TEST SCRIPT CRASHED:');
  console.error(err);
});
