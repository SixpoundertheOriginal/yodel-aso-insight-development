/**
 * Test Edge Function Response Structure
 *
 * This script tests what the bigquery-aso-data Edge Function actually returns
 * to understand why the app picker is not displaying.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('━'.repeat(80));
console.log('🧪 TESTING EDGE FUNCTION RESPONSE STRUCTURE');
console.log('━'.repeat(80));
console.log('');

async function testEdgeFunction() {
  // Get Yodel Mobile org ID
  const yodelMobileOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  console.log('📊 Test Parameters:');
  console.log(`   Organization ID: ${yodelMobileOrgId}`);
  console.log(`   Date Range: Last 30 days`);
  console.log('');

  // Create client with service role to bypass auth
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('🚀 Calling bigquery-aso-data Edge Function...');
  console.log('');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();

  const formatDate = (d) => d.toISOString().split('T')[0];

  const { data: response, error } = await supabase.functions.invoke(
    'bigquery-aso-data',
    {
      body: {
        org_id: yodelMobileOrgId,
        date_range: {
          start: formatDate(startDate),
          end: formatDate(endDate)
        },
        metrics: ['impressions', 'installs', 'cvr'],
        granularity: 'daily'
      }
    }
  );

  if (error) {
    console.error('❌ Edge Function Error:', error);
    return;
  }

  console.log('✅ Edge Function Response Received');
  console.log('');

  // Analyze response structure
  console.log('━'.repeat(80));
  console.log('📦 RESPONSE STRUCTURE ANALYSIS');
  console.log('━'.repeat(80));
  console.log('');

  console.log('🔍 Top-Level Keys:');
  console.log('   ', Object.keys(response).join(', '));
  console.log('');

  // Check for wrapping
  if (response.success !== undefined) {
    console.log('⚠️  Response appears to be wrapped (has "success" field)');
    console.log(`   success: ${response.success}`);
    console.log('');
  }

  // Check data field
  console.log('📊 Data Field:');
  if (response.data) {
    if (Array.isArray(response.data)) {
      console.log(`   ✅ data is an array with ${response.data.length} items`);
      if (response.data.length > 0) {
        console.log('   First item keys:', Object.keys(response.data[0]).join(', '));
      }
    } else if (typeof response.data === 'object') {
      console.log('   ⚠️  data is an object (might be wrapped)');
      console.log('   Keys:', Object.keys(response.data).join(', '));

      // Check if it's wrapped
      if (response.data.data && Array.isArray(response.data.data)) {
        console.log(`   ✅ Wrapped! data.data is an array with ${response.data.data.length} items`);
      }
    } else {
      console.log('   ❌ data is neither array nor object:', typeof response.data);
    }
  } else {
    console.log('   ❌ No data field in response');
  }
  console.log('');

  // Check scope field
  console.log('🎯 Scope Field:');
  if (response.scope) {
    console.log('   ✅ scope exists');
    console.log('   Keys:', Object.keys(response.scope).join(', '));
    if (response.scope.app_ids) {
      console.log(`   ✅ scope.app_ids exists: ${response.scope.app_ids.length} apps`);
      console.log('   Apps:', response.scope.app_ids.slice(0, 3).join(', '), '...');
    } else {
      console.log('   ❌ scope.app_ids is missing');
    }
  } else {
    console.log('   ❌ scope field missing');
  }
  console.log('');

  // Check meta field
  console.log('📋 Meta Field:');
  if (response.meta) {
    console.log('   ✅ meta exists');
    console.log('   Keys:', Object.keys(response.meta).join(', '));

    if (response.meta.app_ids) {
      console.log(`   ✅ meta.app_ids exists: ${response.meta.app_ids.length} apps`);
      console.log('   Apps:', response.meta.app_ids.slice(0, 3).join(', '), '...');
    } else {
      console.log('   ❌ meta.app_ids is missing');
    }

    if (response.meta.available_traffic_sources) {
      console.log(`   ✅ meta.available_traffic_sources exists: ${response.meta.available_traffic_sources.length} sources`);
      console.log('   Sources:', response.meta.available_traffic_sources.join(', '));
    } else {
      console.log('   ❌ meta.available_traffic_sources is missing');
    }

    // Show all meta fields
    console.log('');
    console.log('   All meta fields:');
    Object.entries(response.meta).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`      ${key}: Array(${value.length})`);
      } else if (typeof value === 'object') {
        console.log(`      ${key}: Object`);
      } else {
        console.log(`      ${key}: ${value}`);
      }
    });
  } else {
    console.log('   ❌ meta field missing');
  }
  console.log('');

  // Check if response was wrapped
  console.log('━'.repeat(80));
  console.log('🔍 UNWRAPPING CHECK');
  console.log('━'.repeat(80));
  console.log('');

  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    console.log('⚠️  Response might need unwrapping');
    console.log('');
    console.log('Wrapped structure detected:');
    console.log('   response.data = Object with keys:', Object.keys(response.data).join(', '));

    if (response.data.data) {
      console.log('   response.data.data exists');
    }
    if (response.data.meta) {
      console.log('   response.data.meta exists');
    }
    if (response.data.scope) {
      console.log('   response.data.scope exists');
    }
  } else {
    console.log('✅ Response structure appears flat (not wrapped)');
  }
  console.log('');

  // Frontend expectations
  console.log('━'.repeat(80));
  console.log('🎯 FRONTEND EXPECTATIONS vs REALITY');
  console.log('━'.repeat(80));
  console.log('');

  console.log('Frontend looks for (in ReportingDashboardV2.tsx line 94):');
  console.log('   data?.meta?.app_ids');
  console.log('');

  const metaAppIds = response?.meta?.app_ids;
  const dataMetaAppIds = response?.data?.meta?.app_ids;
  const scopeAppIds = response?.scope?.app_ids;

  console.log('Reality:');
  console.log(`   response.meta.app_ids: ${metaAppIds ? `✅ EXISTS (${metaAppIds.length} apps)` : '❌ MISSING'}`);
  console.log(`   response.data.meta.app_ids: ${dataMetaAppIds ? `✅ EXISTS (${dataMetaAppIds.length} apps)` : '❌ MISSING'}`);
  console.log(`   response.scope.app_ids: ${scopeAppIds ? `✅ EXISTS (${scopeAppIds.length} apps)` : '❌ MISSING'}`);
  console.log('');

  // Verdict
  console.log('━'.repeat(80));
  console.log('📋 DIAGNOSIS');
  console.log('━'.repeat(80));
  console.log('');

  if (metaAppIds && metaAppIds.length > 0) {
    console.log('✅ GOOD: response.meta.app_ids exists with apps');
    console.log('   Frontend should be able to find it.');
    console.log('   App picker should display.');
    console.log('');
    console.log('❓ If app picker is still missing, check:');
    console.log('   1. Frontend console logs for availableApps value');
    console.log('   2. React Query cache issues');
    console.log('   3. Component rendering logic');
  } else if (dataMetaAppIds && dataMetaAppIds.length > 0) {
    console.log('⚠️  ISSUE: response.data.meta.app_ids exists BUT');
    console.log('   Frontend expects: response.meta.app_ids');
    console.log('   Actually at: response.data.meta.app_ids');
    console.log('');
    console.log('   This means response is wrapped and useEnterpriseAnalytics');
    console.log('   hook is not unwrapping correctly.');
  } else if (scopeAppIds && scopeAppIds.length > 0) {
    console.log('⚠️  ISSUE: app_ids only in scope, not in meta');
    console.log('   Frontend expects: response.meta.app_ids');
    console.log('   Actually at: response.scope.app_ids');
    console.log('');
    console.log('   Edge Function fix was not deployed or not working.');
  } else {
    console.log('❌ CRITICAL: No app_ids found anywhere in response');
    console.log('   This means either:');
    console.log('   1. Edge Function failed to query apps');
    console.log('   2. Organization has no app access');
    console.log('   3. Agency query failed');
  }
  console.log('');

  // Full response dump (truncated)
  console.log('━'.repeat(80));
  console.log('📄 FULL RESPONSE (truncated)');
  console.log('━'.repeat(80));
  console.log('');
  console.log(JSON.stringify(response, null, 2).substring(0, 2000), '...');
  console.log('');

  console.log('━'.repeat(80));
  console.log('✅ TEST COMPLETE');
  console.log('━'.repeat(80));
}

testEdgeFunction().catch(console.error);
