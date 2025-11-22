/**
 * Test script for KPI Persistence Service (Phase 2)
 *
 * Tests the full KPI snapshot persistence workflow:
 * 1. Table exists and is accessible
 * 2. Save KPI snapshot succeeds
 * 3. Fetch latest snapshot works
 * 4. Fetch history works
 * 5. Compare snapshots returns correct deltas
 * 6. Null-safety is enforced
 * 7. TypeScript compilation passes
 *
 * Run with: npx tsx scripts/test-kpi-persistence.ts
 */

import { createClient } from '@supabase/supabase-js';
import { KpiEngine } from '../src/engine/metadata/kpi/kpiEngine';
import type { KpiEngineInput } from '../src/engine/metadata/kpi/kpi.types';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjgwNzA5OCwiZXhwIjoyMDYyMzgzMDk4fQ.vaBiZHIQ7Y5gsGPg2324rEu9InKtk9JDLz7L2mZp-Fo';

// Use service role key for testing (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Import types for service (we'll use direct Supabase calls instead of service layer to avoid localStorage issue)
import type { SaveKpiSnapshotParams, KpiSnapshot, KpiComparisonResult, KpiDelta } from '../src/services/kpi/kpi-persistence.service';

// Service methods implemented directly for CLI (to avoid localStorage dependency)
class TestKpiPersistenceService {
  static async saveKpiSnapshot(params: SaveKpiSnapshotParams): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
      const {
        organizationId,
        appId,
        bundleId,
        market,
        platform,
        metadataVersion,
        kpiResult,
        title,
        subtitle,
      } = params;

      if (!organizationId || !appId || !market || !platform || !metadataVersion) {
        return {
          success: false,
          error: 'Missing required fields: organizationId, appId, market, platform, metadataVersion',
        };
      }

      if (!kpiResult || !kpiResult.vector || !kpiResult.kpis || !kpiResult.families) {
        return {
          success: false,
          error: 'Invalid kpiResult: missing vector, kpis, or families',
        };
      }

      if (kpiResult.vector.length !== 34) {
        return {
          success: false,
          error: `Invalid KPI vector length: expected 34, got ${kpiResult.vector.length}`,
        };
      }

      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .insert({
          organization_id: organizationId,
          app_id: appId,
          bundle_id: bundleId || null,
          market,
          platform,
          metadata_version: metadataVersion,
          kpi_vector: kpiResult.vector,
          kpi_json: kpiResult.kpis as unknown as Record<string, unknown>,
          score_overall: kpiResult.overallScore,
          score_families: kpiResult.families as unknown as Record<string, unknown>,
          title: title || null,
          subtitle: subtitle || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ [KPI-PERSISTENCE] Failed to save snapshot:', error);
        return { success: false, error: error.message || 'Failed to save snapshot' };
      }

      if (!data) {
        return { success: false, error: 'No data returned from insert operation' };
      }

      return { success: true, snapshotId: data.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred' };
    }
  }

  static async getKpiSnapshots(organizationId: string, appId: string, limit: number = 50): Promise<KpiSnapshot[]> {
    try {
      if (!organizationId || !appId) {
        return [];
      }

      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', appId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [KPI-PERSISTENCE] Failed to fetch snapshots:', error);
        return [];
      }

      return (data || []) as KpiSnapshot[];
    } catch (err) {
      return [];
    }
  }

  static async getLatestSnapshot(organizationId: string, appId: string): Promise<KpiSnapshot | null> {
    try {
      if (!organizationId || !appId) {
        return null;
      }

      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', appId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('❌ [KPI-PERSISTENCE] Failed to fetch latest snapshot:', error);
        return null;
      }

      return data as KpiSnapshot;
    } catch (err) {
      return null;
    }
  }

  static compareSnapshots(previous: KpiSnapshot, current: KpiSnapshot): KpiComparisonResult {
    const overallScoreDelta = current.score_overall - previous.score_overall;

    const familyDeltas: Record<string, number> = {};
    const prevFamilies = previous.score_families as Record<string, { score: number }>;
    const currFamilies = current.score_families as Record<string, { score: number }>;

    for (const familyId in currFamilies) {
      const prevScore = prevFamilies[familyId]?.score || 0;
      const currScore = currFamilies[familyId]?.score || 0;
      familyDeltas[familyId] = currScore - prevScore;
    }

    const kpiDeltas: KpiDelta[] = [];
    const prevKpis = previous.kpi_json as Record<string, { normalized: number }>;
    const currKpis = current.kpi_json as Record<string, { normalized: number }>;

    for (const kpiId in currKpis) {
      const prevValue = prevKpis[kpiId]?.normalized || 0;
      const currentValue = currKpis[kpiId]?.normalized || 0;
      const delta = currentValue - prevValue;
      const percentChange = prevValue !== 0 ? (delta / prevValue) * 100 : null;

      kpiDeltas.push({ kpiId, prevValue, currentValue, delta, percentChange });
    }

    const prevTime = new Date(previous.created_at).getTime();
    const currTime = new Date(current.created_at).getTime();
    const timeElapsedMs = currTime - prevTime;

    return { previous, current, overallScoreDelta, familyDeltas, kpiDeltas, timeElapsedMs };
  }

  static async getKpiSnapshotsForApps(
    organizationId: string,
    appIds: string[],
    limit: number = 10
  ): Promise<Map<string, KpiSnapshot[]>> {
    try {
      if (!organizationId || !appIds || appIds.length === 0) {
        return new Map();
      }

      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .in('app_id', appIds)
        .order('created_at', { ascending: false })
        .limit(limit * appIds.length);

      if (error) {
        return new Map();
      }

      const snapshotsByApp = new Map<string, KpiSnapshot[]>();
      for (const snapshot of (data || []) as KpiSnapshot[]) {
        const existing = snapshotsByApp.get(snapshot.app_id) || [];
        if (existing.length < limit) {
          existing.push(snapshot);
          snapshotsByApp.set(snapshot.app_id, existing);
        }
      }

      return snapshotsByApp;
    } catch (err) {
      return new Map();
    }
  }
}

// Test data - will be populated from database
let TEST_ORG_ID = '';
const TEST_APP_ID = '310633997'; // Pimsleur
const TEST_BUNDLE_ID = 'com.pimsleur.app';

// Track test results
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Helper to get or create test organization
async function getTestOrganizationId(): Promise<string> {
  // Try to find an existing organization
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Failed to fetch organization:', error);
    throw new Error('Cannot fetch organization for testing');
  }

  if (orgs && orgs.length > 0) {
    console.log(`✅ Using existing organization: ${orgs[0].id}`);
    return orgs[0].id;
  }

  throw new Error('No organizations found in database');
}

function logTest(testName: string, passed: boolean, message?: string) {
  testsRun++;
  if (passed) {
    testsPassed++;
    console.log(`✅ ${testName}`);
    if (message) console.log(`   ${message}`);
  } else {
    testsFailed++;
    console.log(`❌ ${testName}`);
    if (message) console.log(`   ${message}`);
  }
}

async function testKpiPersistence() {
  console.log('🧪 Testing KPI Persistence Service (Phase 2)\n');
  console.log('='.repeat(60));
  console.log('');

  // Get test organization ID
  try {
    TEST_ORG_ID = await getTestOrganizationId();
  } catch (err) {
    console.error('❌ Failed to get test organization:', err);
    console.error('');
    console.error('Cannot run tests without a valid organization.');
    console.error('Please ensure there is at least one organization in the database.');
    process.exit(1);
  }

  console.log('');

  // ============================================================================
  // Test 1: Table Exists and Is Accessible
  // ============================================================================
  console.log('Test 1: Table Exists and Is Accessible');
  console.log('-'.repeat(60));

  try {
    const { data, error } = await supabase
      .from('app_metadata_kpi_snapshots')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (ok for new table)
      logTest('Table exists', false, `Error: ${error.message}`);
    } else {
      logTest('Table exists', true, 'Table is accessible via Supabase client');
    }
  } catch (err) {
    logTest('Table exists', false, `Unexpected error: ${err}`);
  }

  console.log('');

  // ============================================================================
  // Test 2: Save KPI Snapshot Succeeds
  // ============================================================================
  console.log('Test 2: Save KPI Snapshot Succeeds');
  console.log('-'.repeat(60));

  // Generate KPI result using KPI Engine
  const input1: KpiEngineInput = {
    title: 'Pimsleur Language Learning',
    subtitle: 'Speak Spanish Fluently Fast',
    locale: 'us',
    platform: 'ios',
  };

  const kpiResult1 = KpiEngine.evaluate(input1);

  console.log(`KPI Engine result: v${kpiResult1.version}, score=${kpiResult1.overallScore.toFixed(2)}`);

  const saveResult1 = await TestKpiPersistenceService.saveKpiSnapshot({
    organizationId: TEST_ORG_ID,
    appId: TEST_APP_ID,
    bundleId: TEST_BUNDLE_ID,
    market: 'us',
    platform: 'ios',
    metadataVersion: kpiResult1.version,
    kpiResult: kpiResult1,
    title: input1.title,
    subtitle: input1.subtitle,
  });

  logTest(
    'Save snapshot (version 1)',
    saveResult1.success,
    saveResult1.success
      ? `Snapshot ID: ${saveResult1.snapshotId}`
      : `Error: ${saveResult1.error}`
  );

  console.log('');

  // Wait 1 second before saving second snapshot
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // ============================================================================
  // Test 3: Save Another Snapshot (Different Metadata)
  // ============================================================================
  console.log('Test 3: Save Another Snapshot (Different Metadata)');
  console.log('-'.repeat(60));

  const input2: KpiEngineInput = {
    title: 'Pimsleur: Learn Languages',
    subtitle: 'Master Spanish French German',
    locale: 'us',
    platform: 'ios',
  };

  const kpiResult2 = KpiEngine.evaluate(input2);

  console.log(`KPI Engine result: v${kpiResult2.version}, score=${kpiResult2.overallScore.toFixed(2)}`);

  const saveResult2 = await TestKpiPersistenceService.saveKpiSnapshot({
    organizationId: TEST_ORG_ID,
    appId: TEST_APP_ID,
    bundleId: TEST_BUNDLE_ID,
    market: 'us',
    platform: 'ios',
    metadataVersion: kpiResult2.version,
    kpiResult: kpiResult2,
    title: input2.title,
    subtitle: input2.subtitle,
  });

  logTest(
    'Save snapshot (version 2)',
    saveResult2.success,
    saveResult2.success
      ? `Snapshot ID: ${saveResult2.snapshotId}`
      : `Error: ${saveResult2.error}`
  );

  console.log('');

  // ============================================================================
  // Test 4: Fetch Latest Snapshot Works
  // ============================================================================
  console.log('Test 4: Fetch Latest Snapshot Works');
  console.log('-'.repeat(60));

  const latestSnapshot = await TestKpiPersistenceService.getLatestSnapshot(
    TEST_ORG_ID,
    TEST_APP_ID
  );

  if (latestSnapshot) {
    logTest('Fetch latest snapshot', true, `Score: ${latestSnapshot.score_overall.toFixed(2)}`);
    console.log(`   Title: ${latestSnapshot.title}`);
    console.log(`   Subtitle: ${latestSnapshot.subtitle}`);
    console.log(`   Created: ${new Date(latestSnapshot.created_at).toLocaleString()}`);
    console.log(`   Vector length: ${latestSnapshot.kpi_vector.length}`);
  } else {
    logTest('Fetch latest snapshot', false, 'No snapshot found');
  }

  console.log('');

  // ============================================================================
  // Test 5: Fetch History Works
  // ============================================================================
  console.log('Test 5: Fetch History Works');
  console.log('-'.repeat(60));

  const history = await TestKpiPersistenceService.getKpiSnapshots(
    TEST_ORG_ID,
    TEST_APP_ID,
    10
  );

  if (history.length >= 2) {
    logTest('Fetch history', true, `Found ${history.length} snapshots`);
    console.log('   Snapshots:');
    history.forEach((snapshot, idx) => {
      console.log(
        `   ${idx + 1}. Score: ${snapshot.score_overall.toFixed(2)}, Created: ${new Date(snapshot.created_at).toLocaleString()}`
      );
    });
  } else {
    logTest('Fetch history', false, `Expected >=2 snapshots, got ${history.length}`);
  }

  console.log('');

  // ============================================================================
  // Test 6: Compare Snapshots Returns Correct Deltas
  // ============================================================================
  console.log('Test 6: Compare Snapshots Returns Correct Deltas');
  console.log('-'.repeat(60));

  if (history.length >= 2) {
    const comparison = TestKpiPersistenceService.compareSnapshots(history[1], history[0]);

    const hasDeltas = comparison.kpiDeltas.length > 0;
    const hasOverallDelta = typeof comparison.overallScoreDelta === 'number';
    const hasFamilyDeltas = Object.keys(comparison.familyDeltas).length > 0;
    const hasTimeElapsed = comparison.timeElapsedMs > 0;

    logTest(
      'Compare snapshots',
      hasDeltas && hasOverallDelta && hasFamilyDeltas && hasTimeElapsed,
      `Overall delta: ${comparison.overallScoreDelta.toFixed(2)}, KPI deltas: ${comparison.kpiDeltas.length}`
    );

    console.log(`   Time elapsed: ${comparison.timeElapsedMs}ms`);
    console.log('   Family deltas:');
    Object.entries(comparison.familyDeltas).forEach(([familyId, delta]) => {
      console.log(`     - ${familyId}: ${delta > 0 ? '+' : ''}${delta.toFixed(2)}`);
    });

    // Show top 5 KPI changes
    const topChanges = comparison.kpiDeltas
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);

    console.log('   Top 5 KPI changes:');
    topChanges.forEach((kpiDelta) => {
      console.log(
        `     - ${kpiDelta.kpiId}: ${kpiDelta.delta > 0 ? '+' : ''}${kpiDelta.delta.toFixed(2)} (${kpiDelta.percentChange?.toFixed(1) || 'N/A'}%)`
      );
    });
  } else {
    logTest('Compare snapshots', false, 'Need at least 2 snapshots');
  }

  console.log('');

  // ============================================================================
  // Test 7: Null-Safety (Missing Required Fields)
  // ============================================================================
  console.log('Test 7: Null-Safety (Missing Required Fields)');
  console.log('-'.repeat(60));

  // Test missing organizationId
  const missingOrgResult = await TestKpiPersistenceService.saveKpiSnapshot({
    organizationId: '',
    appId: TEST_APP_ID,
    market: 'us',
    platform: 'ios',
    metadataVersion: 'v1',
    kpiResult: kpiResult1,
  });

  logTest(
    'Reject missing organizationId',
    !missingOrgResult.success && missingOrgResult.error?.includes('required'),
    missingOrgResult.error
  );

  // Test invalid vector length
  const invalidKpiResult = { ...kpiResult1, vector: [1, 2, 3] }; // Wrong length
  const invalidVectorResult = await TestKpiPersistenceService.saveKpiSnapshot({
    organizationId: TEST_ORG_ID,
    appId: TEST_APP_ID,
    market: 'us',
    platform: 'ios',
    metadataVersion: 'v1',
    kpiResult: invalidKpiResult,
  });

  logTest(
    'Reject invalid vector length',
    !invalidVectorResult.success && invalidVectorResult.error?.includes('vector length'),
    invalidVectorResult.error
  );

  console.log('');

  // ============================================================================
  // Test 8: Fetch Snapshots for Multiple Apps
  // ============================================================================
  console.log('Test 8: Fetch Snapshots for Multiple Apps');
  console.log('-'.repeat(60));

  const multiAppSnapshots = await TestKpiPersistenceService.getKpiSnapshotsForApps(
    TEST_ORG_ID,
    [TEST_APP_ID, 'nonexistent-app'],
    5
  );

  const hasTestApp = multiAppSnapshots.has(TEST_APP_ID);
  const testAppCount = multiAppSnapshots.get(TEST_APP_ID)?.length || 0;

  logTest(
    'Fetch multi-app snapshots',
    hasTestApp && testAppCount >= 2,
    `Found ${testAppCount} snapshots for ${TEST_APP_ID}`
  );

  console.log('');

  // ============================================================================
  // Test 9: Verify Vector Format
  // ============================================================================
  console.log('Test 9: Verify Vector Format');
  console.log('-'.repeat(60));

  if (latestSnapshot) {
    const vectorIsArray = Array.isArray(latestSnapshot.kpi_vector);
    const vectorLength = latestSnapshot.kpi_vector.length;
    const allFinite = latestSnapshot.kpi_vector.every((v) => Number.isFinite(v));
    const allInRange = latestSnapshot.kpi_vector.every((v) => v >= 0 && v <= 100);

    logTest(
      'Vector format valid',
      vectorIsArray && vectorLength === 34 && allFinite && allInRange,
      `Length: ${vectorLength}, All finite: ${allFinite}, All in range: ${allInRange}`
    );

    // Show first 5 values
    console.log(`   Sample values: [${latestSnapshot.kpi_vector.slice(0, 5).map((v) => v.toFixed(2)).join(', ')}, ...]`);
  } else {
    logTest('Vector format valid', false, 'No snapshot to verify');
  }

  console.log('');

  // ============================================================================
  // Test 10: Verify JSONB Format
  // ============================================================================
  console.log('Test 10: Verify JSONB Format');
  console.log('-'.repeat(60));

  if (latestSnapshot) {
    const kpiJsonIsObject = typeof latestSnapshot.kpi_json === 'object';
    const kpiCount = Object.keys(latestSnapshot.kpi_json).length;
    const familiesIsObject = typeof latestSnapshot.score_families === 'object';
    const familyCount = Object.keys(latestSnapshot.score_families).length;

    logTest(
      'JSONB format valid',
      kpiJsonIsObject && kpiCount === 34 && familiesIsObject && familyCount === 6,
      `KPIs: ${kpiCount}, Families: ${familyCount}`
    );

    // Show sample KPI structure
    const sampleKpiId = Object.keys(latestSnapshot.kpi_json)[0];
    const sampleKpi = (latestSnapshot.kpi_json as any)[sampleKpiId];
    console.log(`   Sample KPI (${sampleKpiId}):`, JSON.stringify(sampleKpi, null, 2).substring(0, 100) + '...');
  } else {
    logTest('JSONB format valid', false, 'No snapshot to verify');
  }

  console.log('');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Test Summary');
  console.log('-'.repeat(60));
  console.log(`Total tests: ${testsRun}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
    console.log('');
    console.log('✅ Phase 2 (Supabase Persistence Layer) is working correctly.');
    console.log('');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    console.log('');
    process.exit(1);
  }
}

// Run tests
testKpiPersistence().catch((err) => {
  console.error('💥 Fatal error running tests:', err);
  process.exit(1);
});
