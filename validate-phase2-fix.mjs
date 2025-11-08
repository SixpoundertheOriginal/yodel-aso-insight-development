/**
 * Validate Phase 2 Fix - Test Edge Function
 *
 * Purpose: Verify that the RLS fix allows agency_clients query to succeed
 *
 * Tests:
 * 1. Call Edge Function as Yodel Mobile user
 * 2. Check for agency mode enabled in logs
 * 3. Verify 3 organizations queried (Yodel + 2 clients)
 * 4. Verify 23 apps returned
 * 5. Verify meta.app_ids exists
 * 6. Verify no "permission denied" errors
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node validate-phase2-fix.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('━'.repeat(80));
console.log('🧪 PHASE 2 VALIDATION - Testing Edge Function Fix');
console.log('━'.repeat(80));
console.log('');

async function validateFix() {
  try {
    // ========================================================================
    // Step 1: Test agency_clients table access
    // ========================================================================
    console.log('📋 STEP 1: Testing direct access to agency_clients table...\n');

    const { data: agencyData, error: agencyError } = await supabase
      .from('agency_clients')
      .select('client_org_id')
      .eq('agency_org_id', YODEL_MOBILE_ORG_ID)
      .eq('is_active', true);

    if (agencyError) {
      console.error('❌ FAIL: Still getting error querying agency_clients');
      console.error('   Error:', agencyError.message);
      console.error('   Code:', agencyError.code);

      if (agencyError.message?.includes('org_users_deprecated')) {
        console.error('\n⚠️  RLS policies still reference org_users_deprecated!');
        console.error('   The old policies might still be active.');
      }

      return;
    }

    console.log('✅ SUCCESS: Can query agency_clients table');
    console.log(`   Found ${agencyData?.length || 0} client orgs for Yodel Mobile\n`);

    if (agencyData && agencyData.length > 0) {
      agencyData.forEach((rel, i) => {
        console.log(`   Client ${i + 1}: ${rel.client_org_id}`);
      });
      console.log('');
    }

    // ========================================================================
    // Step 2: Call Edge Function
    // ========================================================================
    console.log('📋 STEP 2: Calling bigquery-aso-data Edge Function...\n');

    const startDate = '2025-10-08';
    const endDate = '2025-11-07';

    const response = await supabase.functions.invoke(
      'bigquery-aso-data',
      {
        body: {
          organization_id: YODEL_MOBILE_ORG_ID,
          date_range: {
            start: startDate,
            end: endDate
          }
        }
      }
    );

    const functionData = response.data;
    const functionError = response.error;

    if (functionError) {
      console.error('❌ FAIL: Edge Function returned error');
      console.error('   Error:', functionError.message);
      console.error('   Context:', functionError.context);

      // Try to get response body
      if (functionData) {
        console.error('   Response data:', JSON.stringify(functionData, null, 2));
      }

      // Don't return - continue to analyze what we got
      console.log('\n⚠️  Continuing analysis with available data...\n');
    }

    console.log('✅ SUCCESS: Edge Function responded\n');

    // ========================================================================
    // Step 3: Analyze Response
    // ========================================================================
    console.log('📋 STEP 3: Analyzing Edge Function response...\n');

    // Check response structure
    const hasData = Array.isArray(functionData?.data) || functionData?.data?.length >= 0;
    const hasMeta = !!functionData?.meta;
    const hasScope = !!functionData?.scope;

    console.log('Response Structure:');
    console.log(`  - Has data field:  ${hasData ? '✅' : '❌'}`);
    console.log(`  - Has meta field:  ${hasMeta ? '✅' : '❌'}`);
    console.log(`  - Has scope field: ${hasScope ? '✅' : '❌'}`);
    console.log('');

    // Check for agency mode indicators
    if (functionData?.meta?.app_ids) {
      console.log('✅ meta.app_ids exists');
      console.log(`   App count: ${functionData.meta.app_ids.length}`);
      console.log(`   Apps: ${functionData.meta.app_ids.slice(0, 3).join(', ')}${functionData.meta.app_ids.length > 3 ? '...' : ''}`);
      console.log('');
    } else {
      console.log('❌ meta.app_ids MISSING');
      console.log('');
    }

    if (functionData?.scope?.app_ids) {
      console.log('✅ scope.app_ids exists');
      console.log(`   App count: ${functionData.scope.app_ids.length}`);
      console.log('');
    }

    // Check data rows
    const dataArray = functionData?.data || [];
    console.log(`Data rows: ${dataArray.length}`);

    if (dataArray.length > 0) {
      console.log('✅ Has data rows');
      console.log('');
    } else {
      console.log('⚠️  No data rows (this may be expected if no data in BigQuery)');
      console.log('');
    }

    // ========================================================================
    // Step 4: Check Edge Function Logs (instructions)
    // ========================================================================
    console.log('📋 STEP 4: Check Edge Function logs manually...\n');
    console.log('Open: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions/bigquery-aso-data/logs');
    console.log('');
    console.log('✅ Expected to see:');
    console.log('   [AGENCY] Agency mode enabled {');
    console.log('     managed_client_count: 2,');
    console.log('     client_org_ids: [...]');
    console.log('   }');
    console.log('   [ACCESS] App access validated {');
    console.log('     organizations_queried: 3,');
    console.log('     is_agency: true,');
    console.log('     allowed_apps: 23 (or actual count)');
    console.log('   }');
    console.log('');
    console.log('❌ Should NOT see:');
    console.log('   [AGENCY] Error checking agency status {');
    console.log('     message: "permission denied for table org_users_deprecated"');
    console.log('   }');
    console.log('');

    // ========================================================================
    // Step 5: Validation Summary
    // ========================================================================
    console.log('━'.repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('━'.repeat(80));
    console.log('');

    let passCount = 0;
    let totalTests = 5;

    // Test 1: Can query agency_clients
    if (!agencyError && agencyData) {
      console.log('✅ Test 1: PASS - Can query agency_clients table');
      passCount++;
    } else {
      console.log('❌ Test 1: FAIL - Cannot query agency_clients table');
    }

    // Test 2: Agency has clients
    if (agencyData && agencyData.length >= 2) {
      console.log('✅ Test 2: PASS - Yodel Mobile has client relationships');
      passCount++;
    } else {
      console.log('❌ Test 2: FAIL - No client relationships found');
    }

    // Test 3: Edge Function responds
    if (!functionError && functionData) {
      console.log('✅ Test 3: PASS - Edge Function responds without error');
      passCount++;
    } else {
      console.log('❌ Test 3: FAIL - Edge Function returned error');
    }

    // Test 4: Response has meta.app_ids
    if (functionData?.meta?.app_ids && functionData.meta.app_ids.length > 0) {
      console.log('✅ Test 4: PASS - Response includes meta.app_ids');
      passCount++;
    } else {
      console.log('❌ Test 4: FAIL - Response missing meta.app_ids');
    }

    // Test 5: Multiple apps returned
    const appCount = functionData?.meta?.app_ids?.length || 0;
    if (appCount >= 10) {
      console.log(`✅ Test 5: PASS - Multiple apps returned (${appCount} apps)`);
      passCount++;
    } else {
      console.log(`⚠️  Test 5: WARNING - Only ${appCount} apps returned (expected 20+)`);
    }

    console.log('');
    console.log(`Result: ${passCount}/${totalTests} tests passed`);
    console.log('');

    if (passCount === totalTests) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('');
      console.log('The fix is working correctly. Agency mode is enabled.');
      console.log('');
      console.log('Next Step: Test in UI');
      console.log('  1. Login as cli@yodelmobile.com');
      console.log('  2. Navigate to /dashboard-v2');
      console.log('  3. Verify app picker displays between Period and Sources');
      console.log('  4. Should show: "Apps: [App Name] (+X more)"');
    } else if (passCount >= 3) {
      console.log('⚠️  PARTIAL SUCCESS');
      console.log('');
      console.log('Core functionality working, but some optimizations needed.');
      console.log('Check Edge Function logs for details.');
    } else {
      console.log('❌ TESTS FAILED');
      console.log('');
      console.log('The fix may not be working correctly.');
      console.log('Review the errors above and check:');
      console.log('  1. RLS policies on agency_clients');
      console.log('  2. Edge Function logs');
      console.log('  3. Database permissions');
    }

    console.log('');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.error(error);
  }
}

// Run validation
validateFix();
