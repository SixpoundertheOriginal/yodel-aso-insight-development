# ASO Intelligence Layer - Real Data Validation Instructions

## Quick Validation (Recommended)

Add this temporary validation code to `ReportingDashboardV2.tsx` to test with real data:

### Step 1: Add Import

At the top of `ReportingDashboardV2.tsx`, add:

```typescript
import {
  calculateStabilityScore,
  calculateOpportunityMap,
  simulateOutcomes,
  generateAnomalyAttributions,
  type TimeSeriesPoint,
  type AnomalyContext
} from '@/utils/asoIntelligence';
```

### Step 2: Add Validation Effect

After all the `useMemo` hooks (around line 260), add this validation effect:

```typescript
// 🧪 TEMPORARY: Intelligence Layer Validation
useEffect(() => {
  if (!data?.processedData || !twoPathMetrics || !derivedKpis) return;

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  ASO INTELLIGENCE LAYER VALIDATION - REAL DATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ===== 1. STABILITY SCORE =====
  console.log('=== 1. STABILITY SCORE ===\n');

  const timeSeriesData: TimeSeriesPoint[] = data.processedData.timeseries.map(point => ({
    date: point.date,
    impressions: point.impressions || 0,
    downloads: point.downloads || point.installs || 0,
    product_page_views: point.product_page_views || 0,
    cvr: point.cvr || point.conversion_rate || 0
  }));

  console.log(`📊 Time series: ${timeSeriesData.length} days`);
  console.log(`📅 Range: ${timeSeriesData[0]?.date} to ${timeSeriesData[timeSeriesData.length - 1]?.date}\n`);

  const stabilityResult = calculateStabilityScore(timeSeriesData);
  console.log('✅ Stability Score Result:');
  console.log(JSON.stringify(stabilityResult, null, 2));

  // Sanity checks
  const s1 = typeof stabilityResult.score === 'number' || stabilityResult.score === null;
  const s2 = stabilityResult.score === null || (stabilityResult.score >= 0 && stabilityResult.score <= 100);
  const s3 = !!stabilityResult.interpretation || !!stabilityResult.message;
  console.log(`\n✅ Checks: score=${s1}, range=${s2}, interpretation=${s3}\n`);

  // ===== 2. OPPORTUNITY MAP =====
  console.log('=== 2. OPPORTUNITY MAP ===\n');

  const opportunities = calculateOpportunityMap(
    derivedKpis,
    twoPathMetrics.search,
    twoPathMetrics.browse
  );

  console.log(`✅ Found ${opportunities.length} opportunities:\n`);
  opportunities.forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.category} (${opp.priority}) - Score: ${opp.score.toFixed(1)}`);
    console.log(`   Gap: ${opp.gap.toFixed(1)} | ${opp.message}`);
  });

  const o1 = opportunities.length <= 4;
  const o2 = opportunities.every((o, i) => i === 0 || o.score <= opportunities[i - 1].score);
  const o3 = opportunities.every(o => isFinite(o.score) && o.score >= 0 && o.score <= 100);
  console.log(`\n✅ Checks: max4=${o1}, sorted=${o2}, valid=${o3}\n`);

  // ===== 3. OUTCOME SIMULATION =====
  console.log('=== 3. OUTCOME SIMULATION ===\n');

  const totalMetrics = {
    impressions: twoPathMetrics.search.impressions + twoPathMetrics.browse.impressions,
    downloads: twoPathMetrics.search.downloads + twoPathMetrics.browse.downloads,
    cvr: ((twoPathMetrics.search.downloads + twoPathMetrics.browse.downloads) /
          (twoPathMetrics.search.impressions + twoPathMetrics.browse.impressions)) * 100
  };

  const scenarios = simulateOutcomes(
    totalMetrics,
    twoPathMetrics.search,
    twoPathMetrics.browse,
    derivedKpis
  );

  console.log(`✅ Generated ${scenarios.length} scenarios:\n`);
  scenarios.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (${s.confidence})`);
    console.log(`   Impact: +${s.estimatedImpact.delta.toLocaleString()} downloads`);
  });

  const sim1 = scenarios.length <= 3;
  const sim2 = scenarios.every(s => s.estimatedImpact.delta > 0);
  const sim3 = scenarios.every(s => isFinite(s.estimatedImpact.projectedValue));
  console.log(`\n✅ Checks: max3=${sim1}, positive=${sim2}, finite=${sim3}\n`);

  // ===== 4. ANOMALY ATTRIBUTION =====
  console.log('=== 4. ANOMALY ATTRIBUTION ===\n');

  // Create test anomaly context
  const testContext: AnomalyContext = {
    anomaly: {
      date: timeSeriesData[timeSeriesData.length - 1]?.date || new Date().toISOString().split('T')[0],
      value: totalMetrics.downloads,
      expectedValue: totalMetrics.downloads * 1.15,
      deviation: -2.5,
      severity: 'medium',
      type: 'drop',
      explanation: 'Test anomaly: 15% drop'
    },
    currentMetrics: {
      search: twoPathMetrics.search,
      browse: twoPathMetrics.browse
    },
    previousMetrics: {
      search: { ...twoPathMetrics.search, impressions: twoPathMetrics.search.impressions * 1.15 },
      browse: { ...twoPathMetrics.browse, impressions: twoPathMetrics.browse.impressions * 1.15 }
    },
    derivedKpis: {
      current: derivedKpis,
      previous: { ...derivedKpis, search_browse_ratio: derivedKpis.search_browse_ratio * 1.1 }
    }
  };

  const attributions = generateAnomalyAttributions(testContext);

  console.log(`✅ Generated ${attributions.length} attributions:\n`);
  attributions.forEach((a, i) => {
    console.log(`${i + 1}. ${a.category} (${a.confidence})`);
    console.log(`   ${a.message}`);
  });

  const a1 = attributions.length <= 5;
  const a2 = attributions.every(a => ['metadata', 'creative', 'brand', 'algorithm', 'technical', 'featuring'].includes(a.category));
  const a3 = attributions.every(a => a.message && a.message.length > 0);
  console.log(`\n✅ Checks: max5=${a1}, validCategory=${a2}, hasMessage=${a3}\n`);

  // ===== FINAL STATUS =====
  console.log('═══════════════════════════════════════════════════════════');
  const allPassed = s1 && s2 && s3 && o1 && o2 && o3 && sim1 && sim2 && sim3 && a1 && a2 && a3;

  if (allPassed) {
    console.log('🎉 ALL VALIDATION CHECKS PASSED!');
    console.log('✅ Safe to proceed to Phase 3 (component implementation)');
  } else {
    console.log('⚠️  SOME CHECKS FAILED - Review output above');
  }
  console.log('═══════════════════════════════════════════════════════════\n\n');

}, [data, twoPathMetrics, derivedKpis]); // Run when data is loaded
```

### Step 3: Test

1. Navigate to `/dashboard-v2` in your browser
2. Wait for data to load
3. Open browser console (F12 or Cmd+Option+I)
4. Look for the validation output

### Step 4: Review Output

The console will show:
- ✅ Stability score with all metrics
- ✅ Opportunity list with priorities
- ✅ Simulation scenarios with projected impacts
- ✅ Anomaly attributions with confidence levels
- ✅ Final pass/fail status

### Step 5: Remove Validation Code

Once validated, **remove** the entire `useEffect` block from the dashboard component.

---

## Alternative: Node Script Validation

If you prefer to run validation as a standalone script:

### Option A: Create Test File

```typescript
// test-intelligence.ts
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateStabilityScore,
  calculateOpportunityMap,
  simulateOutcomes,
  generateAnomalyAttributions
} from '@/utils/asoIntelligence';
import { calculateTwoPathMetricsFromData, calculateDerivedKPIs } from '@/utils/twoPathCalculator';

describe('Intelligence Layer - Real Data', () => {
  it('should validate with production data', async () => {
    // Fetch real data from BigQuery
    const { data } = await supabase.functions.invoke('query-bigquery', {
      body: {
        organizationId: 'YOUR_ORG_ID',
        dateRange: {
          start: '2025-01-01',
          end: '2025-01-31'
        }
      }
    });

    // Run validations...
    expect(data).toBeDefined();
  });
});
```

Then run: `npm test test-intelligence.ts`

---

## Expected Validation Results

### ✅ Stability Score
- Score: 0-100 (or null if insufficient data)
- Interpretation: "Very Stable", "Stable", "Moderate Volatility", etc.
- Breakdown: 4 metrics (impressions, downloads, cvr, directShare)
- All CV values should be finite numbers

### ✅ Opportunity Map
- Returns 0-4 opportunities
- Sorted by score (highest first)
- Priority correctly assigned (high >= 70, medium >= 40, low < 40)
- All scores 0-100, no NaN values

### ✅ Outcome Simulation
- Returns 1-3 scenarios
- Sorted by impact (highest delta first)
- All projected downloads > current downloads
- All deltas are positive integers
- No unrealistic projections (e.g., 10x growth)

### ✅ Anomaly Attribution
- Returns 0-5 attributions
- Valid categories (metadata, creative, brand, algorithm, technical, featuring)
- Valid confidence levels (high, medium, low)
- All have messages and actionable insights

---

## Troubleshooting

### Issue: "Cannot find module '@/utils/asoIntelligence'"
**Fix**: Make sure the import path is correct relative to your file location.

### Issue: Stability score returns null
**Cause**: Less than 7 days of data
**Fix**: This is expected behavior. Test with a longer date range (30+ days).

### Issue: No opportunities found
**Cause**: All metrics are performing excellently
**Fix**: This is expected! Your app is doing great. Test with lower-performing KPIs to see opportunities.

### Issue: Console shows TypeScript errors
**Fix**: This validation is for runtime testing. TypeScript errors can be ignored if the code runs.

---

## Next Steps After Validation

Once ALL validation checks pass:

1. ✅ Remove validation code from dashboard
2. ✅ Document any findings or adjustments needed
3. ✅ Proceed to **Phase 3: Component Implementation**
   - Create `StabilityScoreCard.tsx`
   - Create `OpportunityMapCard.tsx`
   - Create `OutcomeSimulationCard.tsx`
   - Create `AnomalyAttributionCard.tsx`
   - Integrate into `ReportingDashboardV2.tsx`

**DO NOT** proceed to Phase 3 until all validation checks pass with real production data.
