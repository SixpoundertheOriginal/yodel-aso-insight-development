# ASO Bible Engine - Test Suite

Comprehensive regression test suite for the ASO Bible Engine, validating that database-driven rules correctly power the metadata scoring engine.

## Overview

This test suite ensures:
- ✅ Admin UI changes propagate into the scoring engine
- ✅ ASO AI Hub (`/aso-ai-hub/audit`) is 100% DB-driven
- ✅ Overrides update scores, KPIs, hooks, and recommendations
- ✅ Ruleset precedence works (Base → Vertical → Market → Client)
- ✅ Cached and uncached runs produce identical results
- ✅ Empty DB fallback maintains backward compatibility

## Test Structure

### Master Test Harness
**File**: `scripts/test-aso-bible-engine.ts`

Runs comprehensive regression tests:
- Baseline audit (Pimsleur app)
- Determinism test (3 consecutive runs)
- Short title penalty validation
- Ruleset loading verification
- Token relevance classification

**Usage**:
```bash
npm run test:aso-bible              # Run all tests
npm run test:aso-bible:debug        # Run with debug output
```

### Atomic Tests

Each test validates a specific component:

| Test File | Command | Purpose |
|-----------|---------|---------|
| `test_kpi_override.ts` | `npm run test:aso-bible:kpi` | KPI weight multiplier overrides |
| `test_formula_override.ts` | `npm run test:aso-bible:formula` | Formula parameter overrides |
| `test_rule_thresholds.ts` | `npm run test:aso-bible:rules` | Rule threshold overrides |
| `test_stopwords.ts` | `npm run test:aso-bible:stopwords` | Custom stopword lists |
| `test_token_relevance.ts` | `npm run test:aso-bible:tokens` | Token relevance level overrides |
| `test_hook_patterns.ts` | `npm run test:aso-bible:hooks` | Hook pattern overrides |
| `test_intent_coverage.ts` | `npm run test:aso-bible:intent` | Search intent classification |
| `test_ruleset_merging.ts` | `npm run test:aso-bible:ruleset` | Ruleset precedence merging |
| `test_full_audit_output.ts` | `npm run test:aso-bible:audit` | Complete audit output validation |

## Snapshots

Test snapshots are saved in `scripts/tests/snapshots/`:
- `baseline_pimsleur.json` - Current baseline
- `baseline_pimsleur_previous.json` - Previous baseline for regression detection

### Snapshot Structure
```json
{
  "metadata": {
    "appId": "id375850155",
    "timestamp": "2025-11-23T...",
    "verticalId": "education",
    "marketId": "en-US"
  },
  "scores": {
    "overall": 75.5,
    "title": 85.2,
    "subtitle": 72.3,
    "description": 68.9
  },
  "rules": {
    "title_character_usage": {
      "score": 100,
      "passed": true,
      "message": "Using 28/30 characters (93%)"
    }
  },
  "tokens": {
    "title": ["pimsleur", "language", "learning"],
    "subtitle": ["spanish", "french"],
    "description": [...]
  },
  "recommendations": {
    "ranking": [...],
    "conversion": [...]
  }
}
```

## Test Patterns

### 1. Override Test Pattern
```typescript
// 1. Load baseline
const baseline = await MetadataAuditEngine.evaluate(testApp);

// 2. Apply override (via Admin API)
await AdminRuleApi.updateRuleThreshold({
  ruleId: 'title_character_usage',
  thresholdLow: 50
});

// 3. Clear cache
clearRuleConfigCache();

// 4. Re-run audit
const updated = await MetadataAuditEngine.evaluate(testApp);

// 5. Assert changes
expect(updated.elements.title.score).not.toEqual(baseline.elements.title.score);

// 6. Revert override
await AdminRuleApi.deleteOverride(overrideId);
```

### 2. Determinism Test Pattern
```typescript
const runs: UnifiedMetadataAuditResult[] = [];

for (let i = 0; i < 3; i++) {
  runs.push(await MetadataAuditEngine.evaluate(testApp));
}

const firstScore = runs[0].overallScore;
const allMatch = runs.every(r => Math.abs(r.overallScore - firstScore) < 1);

expect(allMatch).toBe(true);
```

### 3. Ruleset Precedence Test Pattern
```typescript
// Load base ruleset
const base = getActiveRuleSet(appContext, 'en-US');

// Apply vertical override
await AdminRulesetApi.createVerticalOverride({
  vertical: 'education',
  stopwords: ['custom_word']
});

// Re-load ruleset
const withVertical = getActiveRuleSet(appContext, 'en-US');

// Verify vertical override applied
expect(withVertical.stopwords).toContain('custom_word');

// Apply market override (should take precedence)
await AdminRulesetApi.createMarketOverride({
  market: 'en-GB',
  stopwords: ['market_word']
});

// Re-load ruleset
const withMarket = getActiveRuleSet(appContext, 'en-GB');

// Verify market override supersedes vertical
expect(withMarket.stopwords).toContain('market_word');
```

## Regression Detection

The master test harness automatically detects regressions by:

1. **Snapshot Comparison**: Compares current results with previous baseline
2. **Tolerance Thresholds**: Allows ±1 point difference for rounding
3. **Structural Validation**: Ensures all expected fields are present
4. **Exit Codes**: Returns exit code 1 on any failure

### Example Output

**Success**:
```
╔═══════════════════════════════════════════════════════════╗
║        ASO Bible Engine - Master Test Harness            ║
╚═══════════════════════════════════════════════════════════╝

[TEST] Baseline Audit (Pimsleur)
  ✓ Baseline Audit: Successfully audited Pimsleur (score: 75.5)

[TEST] Audit Determinism (Multiple Runs)
  ✓ Determinism Test: All 3 runs produced identical scores

[TEST] Short Title Penalty
  ✓ Short Title Penalty: Short title correctly penalized (score: 42)

[TEST] Ruleset Loading
  ✓ Ruleset Loading: Ruleset loaded successfully (vertical: education, market: en-US)

[TEST] Token Relevance Classification
  ✓ Token Relevance: Found 3 high-value tokens: language, learning, pimsleur

════════════════════════════════════════════════════════════
Total: 5 | Passed: 5 | Failed: 0 | Duration: 2.34s
════════════════════════════════════════════════════════════
```

**Regression Detected**:
```
[TEST] Baseline Audit (Pimsleur)
  ⚠️  Detected differences from previous baseline:
    - Overall score: 75.5 → 73.2
    - Rule title_character_usage score: 100 → 85
  ✗ Snapshot Comparison: Found 2 differences

════════════════════════════════════════════════════════════
Total: 5 | Passed: 4 | Failed: 1 | Duration: 2.34s
════════════════════════════════════════════════════════════
```

## Debug Mode

Enable detailed logging:
```bash
DEBUG_ASO_BIBLE_TESTS=true npm run test:aso-bible
```

Debug output includes:
- Active ruleset details (vertical, market, leak warnings)
- Individual rule scores
- Keyword lists
- Combo coverage
- Snapshot save/load operations

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run ASO Bible Tests
  run: npm run test:aso-bible
  env:
    NODE_ENV: test
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Maintenance

### Adding New Tests

1. Create test file in `scripts/tests/test_your_feature.ts`
2. Follow the atomic test pattern
3. Export test function
4. Add script to `package.json`:
   ```json
   "test:aso-bible:your-feature": "tsx scripts/tests/test_your_feature.ts"
   ```
5. Optionally add to master harness

### Updating Snapshots

When intentional changes are made:
```bash
# Run tests to generate new baseline
npm run test:aso-bible

# New snapshot saved as baseline_pimsleur.json
# Previous snapshot backed up as baseline_pimsleur_previous.json
```

### Cleaning Snapshots

Remove old snapshots:
```bash
rm scripts/tests/snapshots/*.json
```

## Known Limitations

1. **No DB Seeding**: Tests assume database is already seeded with rules
2. **No Cleanup**: Overrides created during tests must be manually cleaned up
3. **No Parallelization**: Tests run sequentially to avoid cache conflicts
4. **Local Only**: Tests require local Supabase instance or remote access

## Future Enhancements

- [ ] Automated DB seeding before tests
- [ ] Automatic override cleanup after each test
- [ ] Parallel test execution with isolated caches
- [ ] Visual diff tool for snapshot comparison
- [ ] Performance benchmarking (track audit execution time)
- [ ] Integration with admin API for full end-to-end testing

---

**Last Updated**: 2025-11-23
**Version**: 1.0.0
**Maintainer**: ASO Bible Team
