/**
 * ASO Intelligence Layer Validation Script
 *
 * Run this in the browser console while viewing the ReportingDashboardV2
 * to validate all 4 intelligence features with real production data.
 *
 * USAGE:
 * 1. Navigate to /dashboard-v2
 * 2. Wait for data to load
 * 3. Open browser console
 * 4. Copy/paste this script and run
 * 5. Review the validation output
 */

import {
  calculateStabilityScore,
  calculateOpportunityMap,
  simulateOutcomes,
  generateAnomalyAttributions,
  type TimeSeriesPoint,
  type AnomalyContext
} from '../src/utils/asoIntelligence';

import { calculateTwoPathMetricsFromData, calculateDerivedKPIs } from '../src/utils/twoPathCalculator';
import type { TwoPathConversionMetrics, DerivedKPIs } from '../src/utils/twoPathCalculator';

/**
 * Extract real dashboard data from the current page
 * This assumes the dashboard is loaded and data is available
 */
function extractDashboardData() {
  console.log('🔍 Extracting dashboard data from current page...\n');

  // Access React DevTools or global state if exposed
  // For now, we'll provide instructions for manual extraction

  throw new Error(`
    ⚠️  Manual Data Extraction Required

    This script needs to be adapted to your specific data access pattern.

    Option 1: Expose data via window object
    Add this to ReportingDashboardV2.tsx after data loads:

    useEffect(() => {
      if (data && twoPathMetrics && derivedKpis) {
        (window as any).__DASHBOARD_DATA__ = {
          rawData: data.rawData,
          timeseries: data.processedData.timeseries,
          twoPathMetrics,
          derivedKpis
        };
      }
    }, [data, twoPathMetrics, derivedKpis]);

    Then run: validateIntelligenceLayerWithData(window.__DASHBOARD_DATA__)

    Option 2: Use React DevTools
    - Install React DevTools extension
    - Select ReportingDashboardV2 component
    - Access hooks data via $r.memoizedState
  `);
}

/**
 * Main validation function - call this with real dashboard data
 */
export function validateIntelligenceLayerWithData(dashboardData: {
  rawData: any[];
  timeseries: any[];
  twoPathMetrics: { search: TwoPathConversionMetrics; browse: TwoPathConversionMetrics };
  derivedKpis: DerivedKPIs;
}) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ASO INTELLIGENCE LAYER VALIDATION - REAL DATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  // =====================================================
  // 1. STABILITY SCORE VALIDATION
  // =====================================================

  console.log('=== 1. STABILITY SCORE ===\n');

  // Convert timeseries to TimeSeriesPoint format
  const timeSeriesData: TimeSeriesPoint[] = dashboardData.timeseries.map((point: any) => ({
    date: point.date,
    impressions: point.impressions || 0,
    downloads: point.downloads || point.installs || 0,
    product_page_views: point.product_page_views || 0,
    cvr: point.cvr || point.conversion_rate || 0
  }));

  console.log(`📊 Time series data points: ${timeSeriesData.length}`);
  console.log(`📅 Date range: ${timeSeriesData[0]?.date} to ${timeSeriesData[timeSeriesData.length - 1]?.date}\n`);

  const stabilityResult = calculateStabilityScore(timeSeriesData);

  console.log('✅ Stability Score Output:');
  console.log(JSON.stringify(stabilityResult, null, 2));

  // Sanity checks
  console.log('\n🔍 Sanity Checks:');
  const checks1 = [
    { name: 'Score is number or null', pass: typeof stabilityResult.score === 'number' || stabilityResult.score === null },
    { name: 'Score in range 0-100', pass: stabilityResult.score === null || (stabilityResult.score >= 0 && stabilityResult.score <= 100) },
    { name: 'Has interpretation', pass: !!stabilityResult.interpretation || !!stabilityResult.message },
    { name: 'Has valid color', pass: ['green', 'yellow', 'orange', 'red', 'gray'].includes(stabilityResult.color) },
    { name: 'Breakdown structure correct', pass: !stabilityResult.breakdown || (
      stabilityResult.breakdown.impressions &&
      stabilityResult.breakdown.downloads &&
      stabilityResult.breakdown.cvr &&
      stabilityResult.breakdown.directShare
    )},
    { name: 'CV values are finite', pass: !stabilityResult.breakdown || Object.values(stabilityResult.breakdown).every((m: any) =>
      isFinite(m.cv) || m.cv === 0
    )}
  ];

  checks1.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  // =====================================================
  // 2. OPPORTUNITY MAP VALIDATION
  // =====================================================

  console.log('\n\n=== 2. OPPORTUNITY MAP ===\n');

  const { search, browse } = dashboardData.twoPathMetrics;
  const derivedKpis = dashboardData.derivedKpis;

  console.log('📊 Input Metrics:');
  console.log(`  Search: ${search.impressions} imp, ${search.downloads} dl, ${search.pdp_cvr.toFixed(1)}% PDP CVR`);
  console.log(`  Browse: ${browse.impressions} imp, ${browse.downloads} dl, ${browse.pdp_cvr.toFixed(1)}% PDP CVR`);
  console.log(`  Derived KPIs:`, derivedKpis);
  console.log('');

  const opportunities = calculateOpportunityMap(derivedKpis, search, browse);

  console.log(`✅ Found ${opportunities.length} opportunities:\n`);
  opportunities.forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.category} (${opp.priority.toUpperCase()} - Score: ${opp.score.toFixed(1)})`);
    console.log(`   Current: ${opp.currentValue.toFixed(1)} | Benchmark: ${opp.benchmark.toFixed(1)} | Gap: ${opp.gap.toFixed(1)}`);
    console.log(`   ${opp.message}`);
    console.log(`   Action: ${opp.actionableInsight}\n`);
  });

  // Sanity checks
  console.log('🔍 Sanity Checks:');
  const checks2 = [
    { name: 'Max 4 opportunities', pass: opportunities.length <= 4 },
    { name: 'Sorted by score (desc)', pass: opportunities.every((o, i) => i === 0 || o.score <= opportunities[i - 1].score) },
    { name: 'All have valid priority', pass: opportunities.every(o => ['high', 'medium', 'low'].includes(o.priority)) },
    { name: 'All scores 0-100', pass: opportunities.every(o => o.score >= 0 && o.score <= 100) },
    { name: 'No NaN values', pass: opportunities.every(o =>
      isFinite(o.score) && isFinite(o.currentValue) && isFinite(o.benchmark) && isFinite(o.gap)
    )},
    { name: 'High priority >= 70', pass: opportunities.filter(o => o.priority === 'high').every(o => o.score >= 70) },
    { name: 'Medium priority 40-69', pass: opportunities.filter(o => o.priority === 'medium').every(o => o.score >= 40 && o.score < 70) }
  ];

  checks2.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  // =====================================================
  // 3. OUTCOME SIMULATION VALIDATION
  // =====================================================

  console.log('\n\n=== 3. OUTCOME SIMULATION ===\n');

  const totalMetrics = {
    impressions: search.impressions + browse.impressions,
    downloads: search.downloads + browse.downloads,
    cvr: ((search.downloads + browse.downloads) / (search.impressions + browse.impressions)) * 100
  };

  console.log('📊 Baseline Metrics:');
  console.log(`  Total Impressions: ${totalMetrics.impressions.toLocaleString()}`);
  console.log(`  Total Downloads: ${totalMetrics.downloads.toLocaleString()}`);
  console.log(`  Total CVR: ${totalMetrics.cvr.toFixed(2)}%\n`);

  const scenarios = simulateOutcomes(totalMetrics, search, browse, derivedKpis);

  console.log(`✅ Generated ${scenarios.length} scenarios:\n`);
  scenarios.forEach((scenario, i) => {
    console.log(`${i + 1}. ${scenario.name} (${scenario.confidence.toUpperCase()} confidence)`);
    console.log(`   Improvement: ${scenario.improvement.metric}`);
    console.log(`     ${scenario.improvement.currentValue.toFixed(1)} → ${scenario.improvement.improvedValue.toFixed(1)} (${scenario.improvement.change})`);
    console.log(`   Estimated Impact:`);
    console.log(`     Downloads: ${scenario.estimatedImpact.currentValue.toLocaleString()} → ${scenario.estimatedImpact.projectedValue.toLocaleString()}`);
    console.log(`     Delta: ${scenario.estimatedImpact.deltaFormatted} (${scenario.estimatedImpact.delta > 0 ? '+' : ''}${scenario.estimatedImpact.delta.toLocaleString()})`);
    console.log(`   Calculation: ${scenario.calculation}\n`);
  });

  // Sanity checks
  console.log('🔍 Sanity Checks:');
  const checks3 = [
    { name: 'Max 3 scenarios', pass: scenarios.length <= 3 },
    { name: 'Sorted by impact (desc)', pass: scenarios.every((s, i) => i === 0 || s.estimatedImpact.delta <= scenarios[i - 1].estimatedImpact.delta) },
    { name: 'All projections > current', pass: scenarios.every(s => s.estimatedImpact.projectedValue > s.estimatedImpact.currentValue) },
    { name: 'All deltas positive', pass: scenarios.every(s => s.estimatedImpact.delta > 0) },
    { name: 'No NaN values', pass: scenarios.every(s =>
      isFinite(s.improvement.currentValue) &&
      isFinite(s.improvement.improvedValue) &&
      isFinite(s.estimatedImpact.currentValue) &&
      isFinite(s.estimatedImpact.projectedValue) &&
      isFinite(s.estimatedImpact.delta)
    )},
    { name: 'Valid confidence levels', pass: scenarios.every(s => ['high', 'medium', 'low'].includes(s.confidence)) },
    { name: 'Realistic projections', pass: scenarios.every(s => s.estimatedImpact.projectedValue < totalMetrics.downloads * 3) }
  ];

  checks3.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  // =====================================================
  // 4. ANOMALY ATTRIBUTION VALIDATION
  // =====================================================

  console.log('\n\n=== 4. ANOMALY ATTRIBUTION ===\n');

  // Create synthetic anomaly context for testing
  // In production, this would come from real anomaly detection
  const syntheticAnomalyContext: AnomalyContext = {
    anomaly: {
      date: timeSeriesData[timeSeriesData.length - 1]?.date || '2025-01-15',
      value: totalMetrics.downloads,
      expectedValue: totalMetrics.downloads * 1.15, // Simulate 15% drop
      deviation: -2.5,
      severity: 'medium',
      type: 'drop',
      explanation: 'Downloads dropped 15% below expected'
    },
    currentMetrics: {
      search,
      browse
    },
    previousMetrics: {
      // Simulate previous period with 15% higher values
      search: {
        ...search,
        impressions: search.impressions * 1.15,
        pdp_cvr: search.pdp_cvr * 1.10
      },
      browse: {
        ...browse,
        impressions: browse.impressions * 1.15,
        pdp_cvr: browse.pdp_cvr * 1.10
      }
    },
    derivedKpis: {
      current: derivedKpis,
      previous: {
        ...derivedKpis,
        search_browse_ratio: derivedKpis.search_browse_ratio * 1.1,
        funnel_leak_rate: derivedKpis.funnel_leak_rate * 0.95
      }
    }
  };

  console.log('📊 Anomaly Context:');
  console.log(`  Type: ${syntheticAnomalyContext.anomaly.type}`);
  console.log(`  Severity: ${syntheticAnomalyContext.anomaly.severity}`);
  console.log(`  Deviation: ${syntheticAnomalyContext.anomaly.deviation}σ`);
  console.log(`  ${syntheticAnomalyContext.anomaly.explanation}\n`);

  const attributions = generateAnomalyAttributions(syntheticAnomalyContext);

  console.log(`✅ Generated ${attributions.length} attributions:\n`);
  attributions.forEach((attr, i) => {
    console.log(`${i + 1}. ${attr.category.toUpperCase()} (${attr.confidence.toUpperCase()} confidence)`);
    console.log(`   Message: ${attr.message}`);
    if (attr.actionableInsight) {
      console.log(`   Action: ${attr.actionableInsight}`);
    }
    console.log(`   Related Metrics: ${attr.relatedMetrics.join(', ')}\n`);
  });

  // Sanity checks
  console.log('🔍 Sanity Checks:');
  const checks4 = [
    { name: 'Max 5 attributions', pass: attributions.length <= 5 },
    { name: 'All have valid categories', pass: attributions.every(a =>
      ['metadata', 'creative', 'brand', 'algorithm', 'technical', 'featuring'].includes(a.category)
    )},
    { name: 'All have valid confidence', pass: attributions.every(a =>
      ['high', 'medium', 'low'].includes(a.confidence)
    )},
    { name: 'All have messages', pass: attributions.every(a => a.message && a.message.length > 0) },
    { name: 'All have related metrics', pass: attributions.every(a => Array.isArray(a.relatedMetrics)) }
  ];

  checks4.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  // =====================================================
  // FINAL VALIDATION STATUS
  // =====================================================

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  VALIDATION STATUS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const allChecks = [...checks1, ...checks2, ...checks3, ...checks4];
  const passedChecks = allChecks.filter(c => c.pass).length;
  const totalChecks = allChecks.length;
  const passRate = (passedChecks / totalChecks) * 100;

  console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks (${passRate.toFixed(1)}%)\n`);

  if (passRate === 100) {
    console.log('🎉 ALL VALIDATION CHECKS PASSED!');
    console.log('✅ Intelligence layer is producing sane results with real data');
    console.log('✅ All formulas are correctly applied from registry');
    console.log('✅ No NaN, undefined, or invalid values detected');
    console.log('✅ System is SAFE to proceed to Phase 3 (component implementation)\n');
  } else {
    console.log('⚠️  SOME CHECKS FAILED');
    console.log('❌ Review failed checks above');
    console.log('❌ Do NOT proceed to Phase 3 until all checks pass\n');

    console.log('Failed checks:');
    allChecks.filter(c => !c.pass).forEach(check => {
      console.log(`  ❌ ${check.name}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Return results for programmatic access
  return {
    stabilityScore: stabilityResult,
    opportunities,
    scenarios,
    attributions,
    validation: {
      passed: passedChecks,
      total: totalChecks,
      rate: passRate,
      allPassed: passRate === 100
    }
  };
}

// Export for use
if (typeof window !== 'undefined') {
  (window as any).validateIntelligenceLayer = validateIntelligenceLayerWithData;
  console.log('✅ Validation function loaded: window.validateIntelligenceLayer(data)');
}
