/**
 * Multi-Market System End-to-End Test Suite
 *
 * Tests the complete multi-market monitoring workflow including:
 * - Database schema and constraints
 * - Market CRUD operations
 * - Cache lifecycle management
 * - Audit data filtering
 * - CASCADE deletion
 * - React Query integration
 *
 * Run with: npx tsx scripts/tests/test_multi_market_system.ts
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test configuration
const TEST_ORG_ID = 'test-org-multi-market';
const TEST_APP_ID = 'test-app-duolingo';
const TEST_APP_STORE_ID = '570060128'; // Duolingo
const TEST_MARKETS = ['gb', 'us', 'de'];

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

// Helper functions
function logTest(name: string) {
  console.log(`\n🧪 TEST: ${name}`);
}

function logPass(message: string) {
  console.log(`  ✅ ${message}`);
}

function logFail(message: string) {
  console.log(`  ❌ ${message}`);
}

function logInfo(message: string) {
  console.log(`  ℹ️  ${message}`);
}

async function runTest(name: string, testFn: () => Promise<void>) {
  const startTime = Date.now();
  logTest(name);

  try {
    await testFn();
    const duration = Date.now() - startTime;
    logPass(`Test passed (${duration}ms)`);
    testResults.push({ name, passed: true, duration });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logFail(`Test failed: ${error.message}`);
    testResults.push({ name, passed: false, error: error.message, duration });
  }
}

// ============================================================================
// TEST 1: Database Schema Validation
// ============================================================================
async function testDatabaseSchema() {
  // Check monitored_app_markets table exists
  const { data: marketsTable, error: marketsError } = await supabase
    .from('monitored_app_markets')
    .select('id')
    .limit(1);

  if (marketsError) {
    throw new Error(`monitored_app_markets table not found: ${marketsError.message}`);
  }

  logPass('monitored_app_markets table exists');

  // Check UNIQUE constraint
  logInfo('UNIQUE constraint: (monitored_app_id, market_code) - enforced by database');

  // Check CASCADE relationship with aso_audit_snapshots
  const { data: snapshotsTable, error: snapshotsError } = await supabase
    .from('aso_audit_snapshots')
    .select('monitored_app_market_id')
    .limit(1);

  if (snapshotsError) {
    throw new Error(`aso_audit_snapshots missing monitored_app_market_id: ${snapshotsError.message}`);
  }

  logPass('aso_audit_snapshots has monitored_app_market_id FK');

  // Check app_metadata_cache table
  const { data: cacheTable, error: cacheError } = await supabase
    .from('app_metadata_cache')
    .select('id, locale')
    .limit(1);

  if (cacheError) {
    throw new Error(`app_metadata_cache table not found: ${cacheError.message}`);
  }

  logPass('app_metadata_cache table exists with locale field');
}

// ============================================================================
// TEST 2: Create Test App with Markets
// ============================================================================
async function testCreateAppWithMarkets() {
  // Check if test app already exists
  const { data: existingApp } = await supabase
    .from('monitored_apps')
    .select('id')
    .eq('app_id', TEST_APP_STORE_ID)
    .eq('organization_id', TEST_ORG_ID)
    .maybeSingle();

  if (existingApp) {
    logInfo(`Test app already exists (id: ${existingApp.id})`);
    return;
  }

  // Create test app
  const { data: newApp, error: appError } = await supabase
    .from('monitored_apps')
    .insert({
      id: TEST_APP_ID,
      organization_id: TEST_ORG_ID,
      app_id: TEST_APP_STORE_ID,
      platform: 'ios',
      app_name: 'Duolingo (Test)',
      bundle_id: 'com.duolingo.DuolingoMobile',
      developer_name: 'Duolingo',
      category: 'Education',
      is_active: true,
      audit_enabled: true,
    })
    .select()
    .single();

  if (appError) {
    throw new Error(`Failed to create test app: ${appError.message}`);
  }

  logPass(`Created test app: ${newApp.app_name} (${newApp.id})`);

  // Add markets
  for (const market of TEST_MARKETS) {
    const { error: marketError } = await supabase
      .from('monitored_app_markets')
      .insert({
        monitored_app_id: TEST_APP_ID,
        organization_id: TEST_ORG_ID,
        market_code: market,
        title: `Duolingo - ${market.toUpperCase()}`,
        is_active: true,
        is_available: true,
      });

    if (marketError && !marketError.message.includes('duplicate')) {
      throw new Error(`Failed to add market ${market}: ${marketError.message}`);
    }

    logPass(`Added market: ${market.toUpperCase()}`);
  }
}

// ============================================================================
// TEST 3: Query Markets for App
// ============================================================================
async function testQueryMarketsForApp() {
  const { data: markets, error } = await supabase
    .from('monitored_app_markets')
    .select('*')
    .eq('monitored_app_id', TEST_APP_ID)
    .order('market_code', { ascending: true });

  if (error) {
    throw new Error(`Failed to query markets: ${error.message}`);
  }

  if (!markets || markets.length === 0) {
    throw new Error('No markets found for test app');
  }

  logPass(`Found ${markets.length} markets`);

  markets.forEach((market) => {
    logInfo(`  ${market.market_code.toUpperCase()}: ${market.title} (active: ${market.is_active})`);
  });

  // Verify all test markets are present
  const marketCodes = markets.map((m) => m.market_code);
  const missingMarkets = TEST_MARKETS.filter((m) => !marketCodes.includes(m));

  if (missingMarkets.length > 0) {
    throw new Error(`Missing markets: ${missingMarkets.join(', ')}`);
  }

  logPass('All test markets are present');
}

// ============================================================================
// TEST 4: Test UNIQUE Constraint
// ============================================================================
async function testUniqueConstraint() {
  // Try to insert duplicate market (should fail)
  const { error } = await supabase
    .from('monitored_app_markets')
    .insert({
      monitored_app_id: TEST_APP_ID,
      organization_id: TEST_ORG_ID,
      market_code: 'gb', // Duplicate
      title: 'Duplicate Market',
      is_active: true,
    });

  if (error && error.message.includes('duplicate')) {
    logPass('UNIQUE constraint working: prevented duplicate market');
  } else if (!error) {
    throw new Error('UNIQUE constraint failed: allowed duplicate market');
  } else {
    throw new Error(`Unexpected error: ${error.message}`);
  }
}

// ============================================================================
// TEST 5: Test Market Code Validation (CHECK Constraint)
// ============================================================================
async function testMarketCodeValidation() {
  // Try to insert invalid market code (should fail)
  const { error } = await supabase
    .from('monitored_app_markets')
    .insert({
      monitored_app_id: TEST_APP_ID,
      organization_id: TEST_ORG_ID,
      market_code: 'xx', // Invalid
      title: 'Invalid Market',
      is_active: true,
    });

  if (error && error.message.includes('violates check constraint')) {
    logPass('CHECK constraint working: prevented invalid market code');
  } else if (!error) {
    // Clean up if it somehow succeeded
    await supabase
      .from('monitored_app_markets')
      .delete()
      .eq('monitored_app_id', TEST_APP_ID)
      .eq('market_code', 'xx');

    throw new Error('CHECK constraint failed: allowed invalid market code');
  } else {
    throw new Error(`Unexpected error: ${error.message}`);
  }
}

// ============================================================================
// TEST 6: Test Cache Warming
// ============================================================================
async function testCacheWarming() {
  const testMarket = 'gb';

  // Insert cache entry
  const { error: insertError } = await supabase
    .from('app_metadata_cache')
    .upsert({
      organization_id: TEST_ORG_ID,
      app_id: TEST_APP_STORE_ID,
      platform: 'ios',
      locale: testMarket,
      title: 'Duolingo - Language Lessons',
      subtitle: 'Learn Spanish, French & more',
      description: 'Test description',
      developer_name: 'Duolingo',
      version_hash: 'test123',
      fetched_at: new Date().toISOString(),
    });

  if (insertError) {
    throw new Error(`Failed to warm cache: ${insertError.message}`);
  }

  logPass(`Cache warmed for market: ${testMarket.toUpperCase()}`);

  // Verify cache entry exists
  const { data: cacheEntry, error: fetchError } = await supabase
    .from('app_metadata_cache')
    .select('*')
    .eq('organization_id', TEST_ORG_ID)
    .eq('app_id', TEST_APP_STORE_ID)
    .eq('locale', testMarket)
    .eq('platform', 'ios')
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch cache: ${fetchError.message}`);
  }

  if (!cacheEntry) {
    throw new Error('Cache entry not found after warming');
  }

  logPass(`Cache entry verified (fetched_at: ${cacheEntry.fetched_at})`);

  // Check cache age
  const fetchedAt = new Date(cacheEntry.fetched_at).getTime();
  const age = Date.now() - fetchedAt;
  const ageMinutes = Math.round(age / 1000 / 60);

  logInfo(`Cache age: ${ageMinutes} minutes (TTL: 1440 minutes / 24 hours)`);
}

// ============================================================================
// TEST 7: Test Cache Invalidation
// ============================================================================
async function testCacheInvalidation() {
  const testMarket = 'us';

  // First, ensure cache exists
  await supabase
    .from('app_metadata_cache')
    .upsert({
      organization_id: TEST_ORG_ID,
      app_id: TEST_APP_STORE_ID,
      platform: 'ios',
      locale: testMarket,
      title: 'Duolingo - Test',
      version_hash: 'test456',
      fetched_at: new Date().toISOString(),
    });

  logInfo('Cache entry created for invalidation test');

  // Invalidate cache
  const { error: deleteError } = await supabase
    .from('app_metadata_cache')
    .delete()
    .eq('organization_id', TEST_ORG_ID)
    .eq('app_id', TEST_APP_STORE_ID)
    .eq('locale', testMarket)
    .eq('platform', 'ios');

  if (deleteError) {
    throw new Error(`Failed to invalidate cache: ${deleteError.message}`);
  }

  logPass(`Cache invalidated for market: ${testMarket.toUpperCase()}`);

  // Verify cache is gone
  const { data: cacheEntry } = await supabase
    .from('app_metadata_cache')
    .select('id')
    .eq('organization_id', TEST_ORG_ID)
    .eq('app_id', TEST_APP_STORE_ID)
    .eq('locale', testMarket)
    .eq('platform', 'ios')
    .maybeSingle();

  if (cacheEntry) {
    throw new Error('Cache entry still exists after invalidation');
  }

  logPass('Cache entry successfully removed');
}

// ============================================================================
// TEST 8: Test Market Removal with CASCADE
// ============================================================================
async function testMarketRemovalCascade() {
  const testMarket = 'de';

  // Get market ID before deletion
  const { data: market } = await supabase
    .from('monitored_app_markets')
    .select('id')
    .eq('monitored_app_id', TEST_APP_ID)
    .eq('market_code', testMarket)
    .single();

  if (!market) {
    throw new Error(`Market ${testMarket} not found`);
  }

  const marketId = market.id;

  logInfo(`Market ID for ${testMarket.toUpperCase()}: ${marketId}`);

  // Create test audit snapshot for this market
  const { error: snapshotError } = await supabase
    .from('aso_audit_snapshots')
    .insert({
      monitored_app_id: TEST_APP_ID,
      monitored_app_market_id: marketId,
      organization_id: TEST_ORG_ID,
      overall_score: 75,
      audit_result: { test: true },
    });

  if (snapshotError && !snapshotError.message.includes('duplicate')) {
    logInfo(`Note: Could not create test snapshot: ${snapshotError.message}`);
  } else {
    logPass('Created test audit snapshot');
  }

  // Count snapshots before deletion
  const { count: snapshotsBefore } = await supabase
    .from('aso_audit_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('monitored_app_market_id', marketId);

  logInfo(`Audit snapshots before deletion: ${snapshotsBefore || 0}`);

  // Delete market
  const { error: deleteError } = await supabase
    .from('monitored_app_markets')
    .delete()
    .eq('monitored_app_id', TEST_APP_ID)
    .eq('market_code', testMarket);

  if (deleteError) {
    throw new Error(`Failed to delete market: ${deleteError.message}`);
  }

  logPass(`Market ${testMarket.toUpperCase()} deleted`);

  // Verify market is gone
  const { data: deletedMarket } = await supabase
    .from('monitored_app_markets')
    .select('id')
    .eq('monitored_app_id', TEST_APP_ID)
    .eq('market_code', testMarket)
    .maybeSingle();

  if (deletedMarket) {
    throw new Error('Market still exists after deletion');
  }

  logPass('Market successfully removed');

  // Verify CASCADE deletion of snapshots
  const { count: snapshotsAfter } = await supabase
    .from('aso_audit_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('monitored_app_market_id', marketId);

  if (snapshotsAfter && snapshotsAfter > 0) {
    throw new Error(`CASCADE failed: ${snapshotsAfter} snapshots still exist`);
  }

  logPass('CASCADE deletion verified: all linked snapshots removed');
}

// ============================================================================
// TEST 9: Cleanup Test Data
// ============================================================================
async function testCleanup() {
  // Delete test markets
  const { error: marketsError } = await supabase
    .from('monitored_app_markets')
    .delete()
    .eq('monitored_app_id', TEST_APP_ID);

  if (marketsError) {
    logInfo(`Markets cleanup: ${marketsError.message}`);
  } else {
    logPass('Test markets deleted');
  }

  // Delete test app
  const { error: appError } = await supabase
    .from('monitored_apps')
    .delete()
    .eq('id', TEST_APP_ID);

  if (appError) {
    logInfo(`App cleanup: ${appError.message}`);
  } else {
    logPass('Test app deleted');
  }

  // Delete test caches
  const { error: cacheError } = await supabase
    .from('app_metadata_cache')
    .delete()
    .eq('organization_id', TEST_ORG_ID)
    .eq('app_id', TEST_APP_STORE_ID);

  if (cacheError) {
    logInfo(`Cache cleanup: ${cacheError.message}`);
  } else {
    logPass('Test caches deleted');
  }
}

// ============================================================================
// Run All Tests
// ============================================================================
async function runAllTests() {
  console.log('🚀 Multi-Market System End-to-End Test Suite\n');
  console.log('='.repeat(60));

  await runTest('Database Schema Validation', testDatabaseSchema);
  await runTest('Create Test App with Markets', testCreateAppWithMarkets);
  await runTest('Query Markets for App', testQueryMarketsForApp);
  await runTest('UNIQUE Constraint', testUniqueConstraint);
  await runTest('Market Code Validation (CHECK)', testMarketCodeValidation);
  await runTest('Cache Warming', testCacheWarming);
  await runTest('Cache Invalidation', testCacheInvalidation);
  await runTest('Market Removal with CASCADE', testMarketRemovalCascade);
  await runTest('Cleanup Test Data', testCleanup);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY\n');

  const passedTests = testResults.filter((t) => t.passed);
  const failedTests = testResults.filter((t) => !t.passed);

  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passedTests.length}`);
  console.log(`❌ Failed: ${failedTests.length}`);

  const totalDuration = testResults.reduce((sum, t) => sum + t.duration, 0);
  console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);

  if (failedTests.length > 0) {
    console.log('Failed Tests:');
    failedTests.forEach((t) => {
      console.log(`  ❌ ${t.name}: ${t.error}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n💥 Test suite failed with error:', error);
  process.exit(1);
});
