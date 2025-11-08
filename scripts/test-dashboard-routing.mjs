/**
 * TEST: Dashboard Routing Logic
 *
 * This script tests the hybrid feature+role routing logic
 * for determining which dashboard users should see.
 *
 * Run: CLI_TEST_EMAIL=cli@yodelmobile.com node scripts/test-dashboard-routing.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const TEST_EMAIL = process.env.CLI_TEST_EMAIL || 'cli@yodelmobile.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Routing Logic (matches src/utils/navigation/dashboardRouting.ts)
 */
function shouldUseV2Dashboard(context) {
  const { role, isSuperAdmin, hasExecutiveDashboard, hasReportingV2 } = context;

  if (isSuperAdmin) {
    return '/dashboard/executive';
  }

  const hasV2Access = hasExecutiveDashboard || hasReportingV2;

  if (hasV2Access) {
    const v2EligibleRoles = ['org_admin', 'aso_manager', 'analyst'];

    if (v2EligibleRoles.includes(role)) {
      return '/dashboard/executive';
    }

    return '/dashboard';
  }

  return '/dashboard';
}

/**
 * Main Test
 */
async function testDashboardRouting() {
  console.log('🧪 Testing Dashboard Routing Logic\n');
  console.log(`Testing with email: ${TEST_EMAIL}\n`);

  try {
    // Step 1: Get user profile
    console.log('📋 Step 1: Fetching user profile...');
    const { data: profilesList, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', TEST_EMAIL);

    if (profileError) {
      console.error('❌ Failed to fetch profile:', profileError.message);
      process.exit(1);
    }

    if (!profilesList || profilesList.length === 0) {
      console.error('❌ No profile found for email:', TEST_EMAIL);
      process.exit(1);
    }

    if (profilesList.length > 1) {
      console.warn(`⚠️  Multiple profiles found (${profilesList.length}), using first one`);
    }

    const profiles = profilesList[0];
    console.log(`✅ Found user: ${profiles.email} (${profiles.id})\n`);

    // Step 2: Get user role and organization
    console.log('📋 Step 2: Fetching user role...');
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        organization_id,
        role,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', profiles.id)
      .single();

    if (roleError) {
      console.error('❌ Failed to fetch role:', roleError.message);
      process.exit(1);
    }

    const role = userRoles.role.toLowerCase();
    const isSuperAdmin = role === 'super_admin';
    const organizationId = userRoles.organization_id;

    console.log(`✅ Role: ${role}`);
    console.log(`✅ Super Admin: ${isSuperAdmin}`);
    console.log(`✅ Organization: ${userRoles.organizations?.name} (${userRoles.organizations?.slug})\n`);

    // Step 3: Get organization features
    console.log('📋 Step 3: Fetching organization features...');
    const { data: orgFeatures, error: featuresError } = await supabase
      .from('organization_features')
      .select('feature_key, is_enabled')
      .eq('organization_id', organizationId);

    if (featuresError) {
      console.error('❌ Failed to fetch features:', featuresError.message);
      process.exit(1);
    }

    const enabledFeatures = orgFeatures
      .filter(f => f.is_enabled)
      .map(f => f.feature_key);

    console.log(`✅ Enabled features (${enabledFeatures.length}):`);
    enabledFeatures.forEach(f => console.log(`   - ${f}`));
    console.log('');

    // Step 4: Check v2 dashboard access
    const hasExecutiveDashboard = enabledFeatures.includes('executive_dashboard');
    const hasReportingV2 = enabledFeatures.includes('reporting_v2');

    console.log('📋 Step 4: V2 Dashboard Feature Check:');
    console.log(`   executive_dashboard: ${hasExecutiveDashboard ? '✅' : '❌'}`);
    console.log(`   reporting_v2: ${hasReportingV2 ? '✅' : '❌'}`);
    console.log('');

    // Step 5: Run routing logic
    console.log('📋 Step 5: Running routing logic...');
    const targetDashboard = shouldUseV2Dashboard({
      role,
      isSuperAdmin,
      hasExecutiveDashboard,
      hasReportingV2
    });

    console.log('\n🎯 ROUTING DECISION:');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`User: ${TEST_EMAIL}`);
    console.log(`Role: ${role}`);
    console.log(`Super Admin: ${isSuperAdmin}`);
    console.log(`Has executive_dashboard feature: ${hasExecutiveDashboard}`);
    console.log(`Has reporting_v2 feature: ${hasReportingV2}`);
    console.log('');
    console.log(`→ Target Dashboard: ${targetDashboard}`);
    console.log(`→ Dashboard Type: ${targetDashboard === '/dashboard/executive' ? 'v2 (Executive Dashboard)' : 'Legacy (Analytics Dashboard)'}`);
    console.log('\n═══════════════════════════════════════════════════\n');

    // Step 6: Expected vs Actual
    const expectedDashboard = '/dashboard/executive'; // cli@yodelmobile.com should get v2
    const isCorrect = targetDashboard === expectedDashboard;

    if (isCorrect) {
      console.log('✅ TEST PASSED: User will be routed to the correct dashboard');
    } else {
      console.log('❌ TEST FAILED: User will be routed to wrong dashboard');
      console.log(`   Expected: ${expectedDashboard}`);
      console.log(`   Actual: ${targetDashboard}`);
      process.exit(1);
    }

    // Step 7: Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (!hasExecutiveDashboard && !hasReportingV2) {
      console.log('⚠️  User does not have v2 dashboard features enabled');
      console.log('   To enable v2 dashboard, run:');
      console.log(`   INSERT INTO organization_features (organization_id, feature_key, is_enabled)`);
      console.log(`   VALUES ('${organizationId}', 'executive_dashboard', true)`);
      console.log(`   ON CONFLICT (organization_id, feature_key) DO UPDATE SET is_enabled = true;`);
    } else {
      console.log('✅ All features configured correctly');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run test
testDashboardRouting();
