# ASO Intelligence Layer - Validation Instructions

This document provides step-by-step instructions for validating the ASO Intelligence Layer with real production data before proceeding to Phase 3 (component implementation).

## Overview

The Intelligence Layer consists of:
1. **Stability Score** - Volatility analysis using Coefficient of Variation
2. **Opportunity Map** - Prioritized optimization recommendations
3. **Outcome Simulation** - Impact projections for improvements
4. **Anomaly Attribution** - Root cause analysis for detected anomalies

## Prerequisites

- ✅ Formula Registry extended (`src/constants/asoFormulas.ts`)
- ✅ Calculation module created (`src/utils/asoIntelligence.ts`)
- ✅ Unit tests passing (40/40 tests)
- ⏳ Real data validation (this step)

## Validation Steps

### Step 1: Prepare Test Data

Create a test script to fetch real production data:

```typescript
// scripts/validateIntelligence.ts
import { calculateStabilityScore, calculateOpportunityMap, simulateOutcomes, generateAnomalyAttributions } from '../src/utils/asoIntelligence';
import type { TimeSeriesPoint } from '../src/utils/asoIntelligence';

// Fetch last 30 days of real data from your BigQuery dataset
// Replace with actual data fetching logic
async function fetchRealData() {
  // Example: Query BigQuery for time series data
  const timeSeriesData: TimeSeriesPoint[] = [
    // ... your real data
  ];

  return timeSeriesData;
}
```

### Step 2: Validate Stability Score

Test the stability score calculation with real time series data:

```typescript
// Test 1: Stability Score with 30 days of data
async function validateStabilityScore() {
  const data = await fetchRealData();

  const result = calculateStabilityScore(data);

  console.log('=== STABILITY SCORE VALIDATION ===');
  console.log(`Score: ${result.score}/100`);
  console.log(`Interpretation: ${result.interpretation}`);
  console.log(`Color: ${result.color}`);
  console.log(`Data Points: ${result.dataPoints}`);
  console.log('\nMetric Breakdown:');

  if (result.breakdown) {
    console.log(`  Impressions CV: ${result.breakdown.impressions.cv.toFixed(4)} → Score: ${result.breakdown.impressions.score}`);
    console.log(`  Downloads CV: ${result.breakdown.downloads.cv.toFixed(4)} → Score: ${result.breakdown.downloads.score}`);
    console.log(`  CVR CV: ${result.breakdown.cvr.cv.toFixed(4)} → Score: ${result.breakdown.cvr.score}`);
    console.log(`  Direct Share CV: ${result.breakdown.directShare.cv.toFixed(4)} → Score: ${result.breakdown.directShare.score}`);
  }

  // Validation checks
  console.log('\n✅ Validation Checks:');
  console.log(`  - Score is between 0-100: ${result.score !== null && result.score >= 0 && result.score <= 100 ? '✅' : '❌'}`);
  console.log(`  - Interpretation matches score band: ${result.interpretation ? '✅' : '❌'}`);
  console.log(`  - Breakdown has 4 metrics: ${result.breakdown && Object.keys(result.breakdown).length === 4 ? '✅' : '❌'}`);
}
```

**Expected Outputs:**
- Score should be between 0-100
- Interpretation should match configured bands (Very Stable, Stable, Moderate Volatility, Unstable, Highly Volatile)
- CV values should be realistic (typically 0.1 - 1.5 for most metrics)
- Higher CV → Lower score (inverted relationship)

**Edge Cases to Test:**
- Less than 7 days of data → Should return `score: null` with error message
- All zeros → Should handle gracefully with CV = 0
- Missing days → Should work with available data points

---

### Step 3: Validate Opportunity Map

Test opportunity identification with real derived KPIs:

```typescript
// Test 2: Opportunity Map
async function validateOpportunityMap() {
  // Use real derived KPIs from your dashboard
  const derivedKpis = {
    search_browse_ratio: 1.2,
    first_impression_effectiveness: 18.5,
    metadata_strength: 1.8,
    creative_strength: 2.1,
    funnel_leak_rate: 65.0,
    direct_install_propensity: 22.0
  };

  // Real search and browse metrics
  const searchMetrics = { /* ... real data ... */ };
  const browseMetrics = { /* ... real data ... */ };

  const opportunities = calculateOpportunityMap(derivedKpis, searchMetrics, browseMetrics);

  console.log('\n=== OPPORTUNITY MAP VALIDATION ===');
  console.log(`Found ${opportunities.length} opportunities (max 4)\n`);

  opportunities.forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.category} (${opp.priority.toUpperCase()})`);
    console.log(`   Score: ${opp.score.toFixed(1)}/100`);
    console.log(`   Current: ${opp.currentValue.toFixed(1)} | Benchmark: ${opp.benchmark.toFixed(1)} | Gap: ${opp.gap.toFixed(1)}`);
    console.log(`   Message: ${opp.message}`);
    console.log(`   Action: ${opp.actionableInsight}\n`);
  });

  // Validation checks
  console.log('✅ Validation Checks:');
  console.log(`  - Max 4 opportunities: ${opportunities.length <= 4 ? '✅' : '❌'}`);
  console.log(`  - Sorted by score (desc): ${opportunities.every((o, i) => i === 0 || o.score <= opportunities[i-1].score) ? '✅' : '❌'}`);
  console.log(`  - All have priority: ${opportunities.every(o => ['high', 'medium', 'low'].includes(o.priority)) ? '✅' : '❌'}`);
  console.log(`  - High priority has score >= 70: ${opportunities.filter(o => o.priority === 'high').every(o => o.score >= 70) ? '✅' : '❌'}`);
}
```

**Expected Outputs:**
- 0-4 opportunities returned
- Sorted by score (highest first)
- Priority correctly assigned: high (>=70), medium (>=40), low (<40)
- Categories match registry: "Icon & Title", "Search Creative Assets", "Browse Creative Assets", etc.
- Actionable insights are specific and helpful

**Scenarios to Test:**
- Excellent performance → Should find 0 high-priority opportunities
- Poor performance → Should identify multiple high-priority opportunities
- Imbalanced Search/Browse Ratio → Should suggest metadata or creative discovery improvements

---

### Step 4: Validate Outcome Simulation

Test impact projections with real baseline metrics:

```typescript
// Test 3: Outcome Simulation
async function validateOutcomeSimulation() {
  const totalMetrics = {
    impressions: 50000,
    downloads: 5000,
    cvr: 10.0
  };

  const searchMetrics = { /* ... real data ... */ };
  const browseMetrics = { /* ... real data ... */ };
  const derivedKpis = { /* ... real data ... */ };

  const scenarios = simulateOutcomes(totalMetrics, searchMetrics, browseMetrics, derivedKpis);

  console.log('\n=== OUTCOME SIMULATION VALIDATION ===');
  console.log(`Generated ${scenarios.length} scenarios (max 3)\n`);

  scenarios.forEach((scenario, i) => {
    console.log(`${i + 1}. ${scenario.name} (${scenario.confidence.toUpperCase()} confidence)`);
    console.log(`   ID: ${scenario.id}`);
    console.log(`   Improvement: ${scenario.improvement.metric} from ${scenario.improvement.currentValue.toFixed(1)} to ${scenario.improvement.improvedValue.toFixed(1)} (${scenario.improvement.change})`);
    console.log(`   Impact: Downloads from ${scenario.estimatedImpact.currentValue} to ${scenario.estimatedImpact.projectedValue} (${scenario.estimatedImpact.deltaFormatted})`);
    console.log(`   Calculation: ${scenario.calculation}\n`);
  });

  // Validation checks
  console.log('✅ Validation Checks:');
  console.log(`  - Max 3 scenarios: ${scenarios.length <= 3 ? '✅' : '❌'}`);
  console.log(`  - Sorted by impact (desc): ${scenarios.every((s, i) => i === 0 || s.estimatedImpact.delta <= scenarios[i-1].estimatedImpact.delta) ? '✅' : '❌'}`);
  console.log(`  - All projections > current: ${scenarios.every(s => s.estimatedImpact.projectedValue > s.estimatedImpact.currentValue) ? '✅' : '❌'}`);
  console.log(`  - High confidence scenarios exist: ${scenarios.some(s => s.confidence === 'high') ? '✅' : '❌'}`);
  console.log(`  - No unrealistic projections: ${scenarios.every(s => s.estimatedImpact.projectedValue < totalMetrics.downloads * 2) ? '✅' : '❌'}`);
}
```

**Expected Outputs:**
- 1-3 scenarios returned
- Sorted by delta installs (highest impact first)
- Projected downloads always > current downloads
- Confidence levels assigned correctly (high for TTR/PDP CVR, medium for funnel/impressions)
- Caps respected (PDP CVR max 70%, Total CVR max 30%, etc.)

**Scenarios to Validate:**
- `improve_ttr` - Tap-through rate improvement
- `improve_pdp_cvr` - PDP conversion rate improvement
- `reduce_funnel_leak` - Funnel leakage reduction
- `increase_search_impressions` - Search impressions growth

---

### Step 5: Validate Anomaly Attribution

Test attribution logic with real anomaly data:

```typescript
// Test 4: Anomaly Attribution
async function validateAnomalyAttribution() {
  // Real anomaly from anomalyDetection.ts
  const anomaly = {
    date: '2025-01-15',
    value: 4200,
    expectedValue: 5000,
    deviation: -2.8,
    severity: 'high',
    type: 'drop',
    explanation: 'Downloads dropped by 16% (800 installs)'
  };

  // Real metrics from that day and previous period
  const currentMetrics = {
    search: { /* ... current search metrics ... */ },
    browse: { /* ... current browse metrics ... */ }
  };

  const previousMetrics = {
    search: { /* ... previous search metrics ... */ },
    browse: { /* ... previous browse metrics ... */ }
  };

  const derivedKpis = {
    current: { /* ... current KPIs ... */ },
    previous: { /* ... previous KPIs ... */ }
  };

  const context = { anomaly, currentMetrics, previousMetrics, derivedKpis };
  const attributions = generateAnomalyAttributions(context);

  console.log('\n=== ANOMALY ATTRIBUTION VALIDATION ===');
  console.log(`Anomaly: ${anomaly.explanation}`);
  console.log(`Found ${attributions.length} attributions (max 5)\n`);

  attributions.forEach((attr, i) => {
    console.log(`${i + 1}. ${attr.category.toUpperCase()} (${attr.confidence.toUpperCase()} confidence)`);
    console.log(`   Message: ${attr.message}`);
    console.log(`   Action: ${attr.actionableInsight || 'N/A'}`);
    console.log(`   Related Metrics: ${attr.relatedMetrics.join(', ')}\n`);
  });

  // Validation checks
  console.log('✅ Validation Checks:');
  console.log(`  - Max 5 attributions: ${attributions.length <= 5 ? '✅' : '❌'}`);
  console.log(`  - Sorted by confidence: ${attributions.every((a, i) => i === 0 || ['low','medium','high'].indexOf(a.confidence) <= ['low','medium','high'].indexOf(attributions[i-1].confidence)) ? '✅' : '❌'}`);
  console.log(`  - All have valid categories: ${attributions.every(a => ['metadata', 'creative', 'brand', 'algorithm', 'technical', 'featuring'].includes(a.category)) ? '✅' : '❌'}`);
  console.log(`  - High confidence has 3+ related metrics: ${attributions.filter(a => a.confidence === 'high').every(a => a.relatedMetrics.length >= 2) ? '✅' : '❌'}`);
}
```

**Expected Outputs:**
- 0-5 attributions returned
- Sorted by confidence (high → medium → low)
- Categories match attribution types: metadata, creative, brand, algorithm, technical, featuring
- Messages are specific to the pattern detected
- Actionable insights provide clear next steps

**Patterns to Validate:**
1. **Search impression drop** → Metadata/keywords attribution
2. **PDP CVR drop** → Creative assets attribution
3. **Browse impression spike** → App Store featuring attribution
4. **Direct share spike** → Brand/marketing attribution
5. **Uniform decline** → Algorithm/platform attribution

---

## Validation Checklist

Before proceeding to Phase 3 (component implementation), confirm:

### Formula Registry
- [ ] All 4 intelligence configs present in `FORMULA_REGISTRY.intelligence`
- [ ] Weights sum to 1.0 for stability score
- [ ] All thresholds are realistic and industry-aligned
- [ ] Version 2.0.0 metadata is correct

### Calculation Functions
- [ ] `calculateStabilityScore()` handles edge cases (insufficient data, NaN, zero values)
- [ ] `calculateOpportunityMap()` returns max 4 opportunities, sorted by score
- [ ] `simulateOutcomes()` respects caps and returns realistic projections
- [ ] `generateAnomalyAttributions()` detects patterns correctly and limits to 5

### Unit Tests
- [ ] All 40 tests passing
- [ ] Coverage > 90% on `asoIntelligence.ts`
- [ ] Edge cases covered (empty data, zero values, extremes)
- [ ] Config overrides tested

### Real Data Validation
- [ ] Stability scores make sense for your app's volatility
- [ ] Opportunities align with known performance gaps
- [ ] Simulations produce believable impact estimates
- [ ] Attributions correctly identify root causes of anomalies

### Documentation
- [ ] Formula Registry has clear comments
- [ ] Calculation functions have JSDoc
- [ ] Interfaces are exported for component use
- [ ] This validation guide is complete

---

## Common Issues and Solutions

### Issue: Stability score always returns null
**Cause**: Insufficient data points (< 7 days)
**Solution**: Ensure you're passing at least 7 TimeSeriesPoint objects

### Issue: Opportunity Map returns 0 opportunities
**Cause**: All metrics are performing excellently
**Solution**: This is expected! Try with lower-performing KPIs to test

### Issue: Simulations show unrealistic projections
**Cause**: Baseline metrics are extreme or caps not applied
**Solution**: Check that caps in `SIMULATION_CONFIG` are enforced correctly

### Issue: Attributions don't match expected root cause
**Cause**: Pattern thresholds don't match your data ranges
**Solution**: Review `ATTRIBUTION_CONFIG.patternThresholds` and adjust if needed

---

## Next Steps

Once all validation checks pass:

1. **Mark validation as complete** in project tracking
2. **Document any formula adjustments** made during validation
3. **Proceed to Phase 3** - Component implementation:
   - Create `StabilityScoreCard.tsx`
   - Create `OpportunityMapCard.tsx`
   - Create `OutcomeSimulationCard.tsx`
   - Create `AnomalyAttributionCard.tsx`
   - Integrate into `ReportingDashboardV2.tsx`

---

## Support

If you encounter issues during validation:
- Review the Phase 2 specification document
- Check unit tests for expected behavior
- Verify Formula Registry configuration
- Ensure BigQuery data matches expected TimeSeriesPoint interface

**DO NOT** proceed to Phase 3 until all validation checks pass with real data.
