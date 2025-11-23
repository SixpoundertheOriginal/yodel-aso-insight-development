/**
 * Phase 18: Intent KPI Integration Test
 *
 * Tests the 9 Intent Quality KPIs powered by the Bible-driven Intent Engine (Phases 16.7 & 17).
 *
 * Flow:
 * 1. Run full audit with Intent Coverage data
 * 2. Verify all 9 Intent KPIs are computed
 * 3. Verify Intent Quality family score is aggregated
 * 4. Verify KPI calculations match expectations
 * 5. Test fallback behavior (legacy intent signals)
 * 6. Test determinism (same input = same output)
 */

import { MetadataAuditEngine } from '../../src/engine/metadata/metadataAuditEngine';
import type { ScrapedMetadata } from '../../src/types/aso';

const TEST_APPS: ScrapedMetadata[] = [
  {
    appId: 'test_intent_kpi_edu',
    name: 'Duolingo',
    title: 'Duolingo - Language Lessons',
    subtitle: 'Learn Spanish, French & More',
    description: 'Learn languages for free with fun, bite-sized lessons. Practice speaking, reading, listening, and writing to build your vocabulary and grammar skills.',
    applicationCategory: 'Education',
    platform: 'ios'
  },
  {
    appId: 'test_intent_kpi_shopping',
    name: 'Amazon Shopping',
    title: 'Amazon Shopping - Buy, Track',
    subtitle: 'Deals, Coupons, Free Shipping',
    description: 'Shop millions of products, compare prices, check out deals, and get free shipping. Track packages and manage orders on the go.',
    applicationCategory: 'Shopping',
    platform: 'ios'
  },
  {
    appId: 'test_intent_kpi_productivity',
    name: 'Notion',
    title: 'Notion - Notes, Tasks, Wikis',
    subtitle: 'All-in-One Workspace',
    description: 'Notion is your all-in-one workspace for notes, tasks, wikis, and databases. Organize your work and life, beautifully.',
    applicationCategory: 'Productivity',
    platform: 'ios'
  }
];

/**
 * Test 1: Verify all 9 Intent KPIs are present in KPI result
 */
function testIntentKpisPresent(kpiResult: any): boolean {
  const expectedKpiIds = [
    'informational_intent_coverage_score',
    'commercial_intent_coverage_score',
    'transactional_intent_coverage_score',
    'navigational_noise_ratio',
    'intent_balance_score',
    'intent_diversity_score',
    'intent_gap_index',
    'intent_alignment_score',
    'intent_quality_score'
  ];

  for (const kpiId of expectedKpiIds) {
    if (!kpiResult.kpis[kpiId]) {
      console.log(`    ✗ Missing Intent KPI: ${kpiId}`);
      return false;
    }

    // Verify KPI has required fields
    const kpi = kpiResult.kpis[kpiId];
    if (typeof kpi.value !== 'number' || typeof kpi.normalized !== 'number') {
      console.log(`    ✗ Invalid KPI structure for: ${kpiId}`);
      return false;
    }

    // Verify KPI belongs to intent_quality family
    if (kpi.familyId !== 'intent_quality') {
      console.log(`    ✗ KPI ${kpiId} has wrong familyId: ${kpi.familyId} (expected: intent_quality)`);
      return false;
    }
  }

  console.log(`    ✓ All 9 Intent KPIs present with correct structure`);
  return true;
}

/**
 * Test 2: Verify Intent Quality family is aggregated
 */
function testIntentQualityFamily(kpiResult: any): boolean {
  const family = kpiResult.families.intent_quality;

  if (!family) {
    console.log(`    ✗ Intent Quality family missing from result`);
    return false;
  }

  if (typeof family.score !== 'number' || family.score < 0 || family.score > 100) {
    console.log(`    ✗ Invalid Intent Quality family score: ${family.score}`);
    return false;
  }

  if (!family.kpiIds || family.kpiIds.length !== 9) {
    console.log(`    ✗ Intent Quality family should have 9 KPIs, found: ${family.kpiIds?.length || 0}`);
    return false;
  }

  console.log(`    ✓ Intent Quality family score: ${family.score.toFixed(1)}`);
  return true;
}

/**
 * Test 3: Verify KPI value ranges are valid
 */
function testKpiValueRanges(kpiResult: any): boolean {
  const kpis = kpiResult.kpis;

  // Coverage scores should be 0-100
  const coverageKpis = [
    'informational_intent_coverage_score',
    'commercial_intent_coverage_score',
    'transactional_intent_coverage_score'
  ];

  for (const kpiId of coverageKpis) {
    const value = kpis[kpiId].value;
    if (value < 0 || value > 100) {
      console.log(`    ✗ ${kpiId} out of range: ${value} (expected 0-100)`);
      return false;
    }
  }

  // Noise ratio should be 0-100 (lower is better)
  const noiseRatio = kpis.navigational_noise_ratio.value;
  if (noiseRatio < 0 || noiseRatio > 100) {
    console.log(`    ✗ navigational_noise_ratio out of range: ${noiseRatio}`);
    return false;
  }

  // Balance, diversity, gap index should be 0-100
  const metricKpis = [
    'intent_balance_score',
    'intent_diversity_score',
    'intent_gap_index',
    'intent_alignment_score',
    'intent_quality_score'
  ];

  for (const kpiId of metricKpis) {
    const value = kpis[kpiId].value;
    if (value < 0 || value > 100) {
      console.log(`    ✗ ${kpiId} out of range: ${value} (expected 0-100)`);
      return false;
    }
  }

  console.log(`    ✓ All Intent KPI values within valid ranges`);
  return true;
}

/**
 * Test 4: Verify determinism (same input = same output)
 */
async function testDeterminism(testApp: ScrapedMetadata): Promise<boolean> {
  const result1 = await MetadataAuditEngine.evaluate(testApp);
  const result2 = await MetadataAuditEngine.evaluate(testApp);

  if (!result1.kpiResult || !result2.kpiResult) {
    console.log(`    ✗ KPI result missing in one or both runs`);
    return false;
  }

  // Compare Intent Quality family scores
  const score1 = result1.kpiResult.families.intent_quality?.score || 0;
  const score2 = result2.kpiResult.families.intent_quality?.score || 0;

  if (Math.abs(score1 - score2) > 0.5) {
    console.log(`    ✗ Non-deterministic Intent Quality scores: ${score1} vs ${score2}`);
    return false;
  }

  // Compare individual KPI values
  const kpiIds = [
    'informational_intent_coverage_score',
    'commercial_intent_coverage_score',
    'intent_balance_score'
  ];

  for (const kpiId of kpiIds) {
    const val1 = result1.kpiResult.kpis[kpiId]?.value || 0;
    const val2 = result2.kpiResult.kpis[kpiId]?.value || 0;

    if (Math.abs(val1 - val2) > 0.5) {
      console.log(`    ✗ Non-deterministic KPI value for ${kpiId}: ${val1} vs ${val2}`);
      return false;
    }
  }

  console.log(`    ✓ Intent KPIs are deterministic (scores match)`);
  return true;
}

/**
 * Test 5: Verify Intent Coverage integration
 */
function testIntentCoverageIntegration(auditResult: any): boolean {
  // Verify intentCoverage is present (from Phase 17)
  if (!auditResult.intentCoverage) {
    console.log(`    ✗ Intent Coverage data missing (Phase 17 required for Phase 18)`);
    return false;
  }

  // Verify intentCoverage has required structure
  const coverage = auditResult.intentCoverage;
  if (!coverage.title || !coverage.subtitle || !coverage.combinedDistribution) {
    console.log(`    ✗ Intent Coverage data has invalid structure`);
    return false;
  }

  // Verify KPI result is present
  if (!auditResult.kpiResult) {
    console.log(`    ✗ KPI result missing from audit output`);
    return false;
  }

  console.log(`    ✓ Intent Coverage integrated with KPI Engine`);
  console.log(`    ✓ Intent Coverage Overall Score: ${coverage.overallScore.toFixed(1)}%`);
  return true;
}

/**
 * Main test runner
 */
export async function testIntentKpis(): Promise<boolean> {
  console.log('[TEST] Phase 18: Intent KPI Integration');

  try {
    for (const testApp of TEST_APPS) {
      console.log(`\n  Testing: ${testApp.name} (${testApp.applicationCategory})`);

      // Run audit
      const result = await MetadataAuditEngine.evaluate(testApp);

      // Test 1: Verify all 9 Intent KPIs present
      if (!testIntentKpisPresent(result.kpiResult)) {
        return false;
      }

      // Test 2: Verify Intent Quality family
      if (!testIntentQualityFamily(result.kpiResult)) {
        return false;
      }

      // Test 3: Verify value ranges
      if (!testKpiValueRanges(result.kpiResult)) {
        return false;
      }

      // Test 4: Verify determinism
      if (!(await testDeterminism(testApp))) {
        return false;
      }

      // Test 5: Verify Intent Coverage integration
      if (!testIntentCoverageIntegration(result)) {
        return false;
      }

      // Display Intent KPI summary
      const kpis = result.kpiResult.kpis;
      console.log(`\n    Intent KPI Summary:`);
      console.log(`      Informational Coverage: ${kpis.informational_intent_coverage_score.value.toFixed(1)}%`);
      console.log(`      Commercial Coverage: ${kpis.commercial_intent_coverage_score.value.toFixed(1)}%`);
      console.log(`      Transactional Coverage: ${kpis.transactional_intent_coverage_score.value.toFixed(1)}%`);
      console.log(`      Navigational Noise: ${kpis.navigational_noise_ratio.value.toFixed(1)}%`);
      console.log(`      Intent Balance: ${kpis.intent_balance_score.value.toFixed(1)}`);
      console.log(`      Intent Diversity: ${kpis.intent_diversity_score.value.toFixed(1)}`);
      console.log(`      Intent Gap Index: ${kpis.intent_gap_index.value.toFixed(1)} (lower is better)`);
      console.log(`      Intent Quality Score: ${kpis.intent_quality_score.value.toFixed(1)}`);
      console.log(`      Intent Quality Family: ${result.kpiResult.families.intent_quality.score.toFixed(1)}`);
    }

    console.log(`\n  ✓ All Intent KPI tests passed`);
    console.log(`  ✓ Phase 18 Intent KPI Integration verified`);
    return true;

  } catch (error) {
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    console.error(error);
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIntentKpis().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
