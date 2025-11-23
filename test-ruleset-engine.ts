/**
 * QA Test Script for Phase 12 Ruleset Engine
 *
 * Tests:
 * 1. Normalization layer (DB rows → NormalizedRuleSet)
 * 2. Merge layer (base → vertical → market → client precedence)
 * 3. Cache behavior (hit/miss/TTL)
 * 4. Version stamping
 * 5. Legacy compatibility (Phase 10 format)
 * 6. Utility functions
 *
 * Run with: npx tsx test-ruleset-engine.ts
 *
 * Note: This is a unit test suite that doesn't require DB connection.
 * For full integration tests with DB, see Phase 12 documentation.
 */

import {
  buildNormalizedRuleSet,
  createEmptyNormalizedRuleSet,
} from './src/engine/asoBible/rulesetEngine/rulesetNormalizer';
import {
  mergeRuleSets,
  hasActiveOverrides,
  toLegacyMergedRuleSet,
} from './src/engine/asoBible/rulesetEngine/rulesetMerger';
import { buildVersionInfo } from './src/engine/asoBible/rulesetEngine/rulesetVersionManager';
import {
  buildCacheKey,
  getCachedRuleset,
  setCachedRuleset,
  invalidateRuleset,
  clearRulesetCache,
  getCacheStats,
} from './src/engine/asoBible/rulesetEngine/rulesetCache';

// ============================================================================
// Test Results Tracking
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, duration?: number) {
  results.push({ name, passed, error, duration });

  const status = passed ? '✅ PASS' : '❌ FAIL';
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`${status}: ${name}${durationStr}`);

  if (error) {
    console.error(`  Error: ${error}`);
  }
}

// ============================================================================
// Test 1: Empty Normalized RuleSet
// ============================================================================

async function test1_EmptyNormalizedRuleSet() {
  console.log('\n🧪 Test 1: Empty Normalized RuleSet');

  const startTime = Date.now();

  try {
    // Create empty normalized ruleset
    const empty = createEmptyNormalizedRuleSet('base');

    // Verify structure
    const hasTokenOverrides = Object.keys(empty.tokenOverrides).length === 0;
    const hasIntentOverrides =
      empty.intentOverrides.informational.length === 0 &&
      empty.intentOverrides.commercial.length === 0 &&
      empty.intentOverrides.transactional.length === 0 &&
      empty.intentOverrides.navigational.length === 0;
    const hasHookOverrides = Object.keys(empty.hookOverrides).length === 0;
    const hasStopwords = empty.stopwordOverrides.length === 0;
    const hasKpiOverrides = Object.keys(empty.kpiWeightOverrides).length === 0;
    const hasFormulaOverrides = Object.keys(empty.formulaOverrides).length === 0;
    const hasRecommendations = Object.keys(empty.recommendationTemplates).length === 0;
    const hasSource = empty.meta.source === 'base';

    const passed =
      hasTokenOverrides &&
      hasIntentOverrides &&
      hasHookOverrides &&
      hasStopwords &&
      hasKpiOverrides &&
      hasFormulaOverrides &&
      hasRecommendations &&
      hasSource;

    if (passed) {
      logTest(
        'Empty normalized ruleset structure',
        true,
        undefined,
        Date.now() - startTime
      );
    } else {
      logTest(
        'Empty normalized ruleset structure',
        false,
        `Structure mismatch: tokens=${hasTokenOverrides}, intents=${hasIntentOverrides}, hooks=${hasHookOverrides}, stopwords=${hasStopwords}, kpi=${hasKpiOverrides}, formula=${hasFormulaOverrides}, recs=${hasRecommendations}, source=${hasSource}`,
        Date.now() - startTime
      );
    }
  } catch (error) {
    logTest(
      'Empty normalized ruleset structure',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Test 2: Normalization Layer
// ============================================================================

async function test2_NormalizationLayer() {
  console.log('\n🧪 Test 2: Normalization Layer');

  const startTime = Date.now();

  try {
    // Create a mock DB bundle
    const mockBundle = {
      tokenOverrides: [
        {
          id: '1',
          scope: 'vertical' as const,
          vertical: 'language_learning',
          token: 'LEARN',
          relevance: 3,
          version: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          scope: 'vertical' as const,
          vertical: 'language_learning',
          token: 'master',
          relevance: 2,
          version: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      hookOverrides: [
        {
          id: '1',
          scope: 'vertical' as const,
          vertical: 'language_learning',
          hook_category: 'learning_educational',
          keywords: ['learn', 'study', 'practice'],
          weight_multiplier: 1.5,
          version: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      stopwordOverrides: [
        {
          id: '1',
          scope: 'market' as const,
          market: 'us',
          stopwords: ['the', 'a', 'an'],
          version: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      kpiOverrides: [],
      formulaOverrides: [],
      recommendationOverrides: [],
      meta: {
        vertical: 'language_learning',
      },
    };

    // Normalize
    const normalized = buildNormalizedRuleSet(mockBundle as any);

    // Verify token normalization (should be lowercased)
    const hasLearnToken = normalized.tokenOverrides['learn']?.relevance === 3;
    const hasMasterToken = normalized.tokenOverrides['master']?.relevance === 2;

    // Verify hook normalization
    const hasHookOverride =
      normalized.hookOverrides['learning_educational']?.weight === 1.5;

    // Verify stopwords
    const hasStopwords = normalized.stopwordOverrides.includes('the');

    const passed =
      hasLearnToken && hasMasterToken && hasHookOverride && hasStopwords;

    if (passed) {
      logTest('Normalization layer works', true, undefined, Date.now() - startTime);
    } else {
      logTest(
        'Normalization layer works',
        false,
        `Expected normalized data, got: learn=${hasLearnToken}, master=${hasMasterToken}, hook=${hasHookOverride}, stopwords=${hasStopwords}`,
        Date.now() - startTime
      );
    }
  } catch (error) {
    logTest(
      'Normalization layer works',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Test 3: Merge Layer (Precedence)
// ============================================================================

async function test3_MergePrecedence() {
  console.log('\n🧪 Test 3: Merge Layer (Precedence)');

  const startTime = Date.now();

  try {
    // Create base layer
    const base = createEmptyNormalizedRuleSet('base');

    // Create vertical layer with token override
    const vertical = createEmptyNormalizedRuleSet('vertical');
    vertical.tokenOverrides = {
      learn: { relevance: 2, source: 'vertical' },
    };

    // Create market layer that overrides the same token
    const market = createEmptyNormalizedRuleSet('market');
    market.tokenOverrides = {
      learn: { relevance: 3, source: 'market' }, // Should win
    };

    // Create client layer
    const client = createEmptyNormalizedRuleSet('client');
    client.tokenOverrides = {
      master: { relevance: 3, source: 'client' },
    };

    // Merge
    const merged = mergeRuleSets(base, vertical, market, client);

    // Verify precedence: market should override vertical for "learn"
    const learnRelevance = merged.tokenRelevanceOverrides?.['learn'];
    const masterRelevance = merged.tokenRelevanceOverrides?.['master'];

    const passed = learnRelevance === 3 && masterRelevance === 3;

    if (passed) {
      logTest(
        'Merge precedence (client > market > vertical > base)',
        true,
        undefined,
        Date.now() - startTime
      );
    } else {
      logTest(
        'Merge precedence (client > market > vertical > base)',
        false,
        `Expected learn=3, master=3, got learn=${learnRelevance}, master=${masterRelevance}`,
        Date.now() - startTime
      );
    }
  } catch (error) {
    logTest(
      'Merge precedence (client > market > vertical > base)',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Test 4: Cache Behavior (Hit/Miss)
// ============================================================================

async function test4_CacheBehavior() {
  console.log('\n🧪 Test 4: Cache Behavior (Hit/Miss)');

  const startTime = Date.now();

  try {
    // Clear cache first
    clearRulesetCache();

    // Build cache key
    const cacheKey = buildCacheKey('language_learning', 'us');

    // Check cache (should be miss)
    const miss = getCachedRuleset(cacheKey);
    if (miss !== null) {
      logTest(
        'Cache MISS on first access',
        false,
        'Expected null, got cached result',
        Date.now() - startTime
      );
      return;
    }

    // Create a mock merged ruleset
    const mockMerged = {
      verticalId: 'language_learning',
      marketId: 'us',
      tokenRelevanceOverrides: { learn: 3 },
      source: 'code' as const,
    };

    // Set cache
    setCachedRuleset(cacheKey, mockMerged);

    // Check cache (should be hit)
    const hit = getCachedRuleset(cacheKey);
    if (hit === null || hit.tokenRelevanceOverrides?.['learn'] !== 3) {
      logTest(
        'Cache HIT on second access',
        false,
        'Expected cached result, got null or wrong data',
        Date.now() - startTime
      );
      return;
    }

    // Invalidate cache
    invalidateRuleset(cacheKey);

    // Check cache (should be miss again)
    const missAfterInvalidate = getCachedRuleset(cacheKey);
    if (missAfterInvalidate !== null) {
      logTest(
        'Cache MISS after invalidation',
        false,
        'Expected null after invalidation, got cached result',
        Date.now() - startTime
      );
      return;
    }

    logTest('Cache behavior (hit/miss/invalidate)', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest(
      'Cache behavior (hit/miss/invalidate)',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Test 5: Cache TTL
// ============================================================================

async function test5_CacheTTL() {
  console.log('\n🧪 Test 5: Cache TTL (Expiration)');

  const startTime = Date.now();

  try {
    // Clear cache first
    clearRulesetCache();

    // Build cache key
    const cacheKey = buildCacheKey('finance', 'uk');

    // Create a mock merged ruleset
    const mockMerged = {
      verticalId: 'finance',
      marketId: 'uk',
      tokenRelevanceOverrides: { invest: 3 },
      source: 'code' as const,
    };

    // Set cache
    setCachedRuleset(cacheKey, mockMerged);

    // Check cache immediately (should be hit)
    const hit = getCachedRuleset(cacheKey, 100); // 100ms TTL for testing
    if (hit === null) {
      logTest(
        'Cache HIT before TTL expires',
        false,
        'Expected cached result, got null',
        Date.now() - startTime
      );
      return;
    }

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 150)); // Wait 150ms

    // Check cache after TTL (should be miss)
    const missAfterTTL = getCachedRuleset(cacheKey, 100);
    if (missAfterTTL !== null) {
      logTest(
        'Cache MISS after TTL expires',
        false,
        'Expected null after TTL expiration, got cached result',
        Date.now() - startTime
      );
      return;
    }

    logTest('Cache TTL expiration', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest(
      'Cache TTL expiration',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Test 6: Version Stamping
// ============================================================================

async function test6_VersionStamping() {
  console.log('\n🧪 Test 6: Version Stamping');

  const startTime = Date.now();

  try {
    // Create version metadata
    const versionInfo = buildVersionInfo({
      rulesetVersion: 1,
      verticalVersion: 2,
      marketVersion: 3,
      clientVersion: 4,
    });

    // Verify all fields present
    const passed =
      versionInfo.rulesetVersion === 1 &&
      versionInfo.verticalVersion === 2 &&
      versionInfo.marketVersion === 3 &&
      versionInfo.clientVersion === 4 &&
      versionInfo.kpiSchemaVersion === 'v1' &&
      versionInfo.formulaSchemaVersion === 'v1';

    if (passed) {
      logTest('Version stamping', true, undefined, Date.now() - startTime);
    } else {
      logTest(
        'Version stamping',
        false,
        `Version info mismatch: ${JSON.stringify(versionInfo)}`,
        Date.now() - startTime
      );
    }
  } catch (error) {
    logTest(
      'Version stamping',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Test 7: Legacy Compatibility
// ============================================================================

async function test7_LegacyCompatibility() {
  console.log('\n🧪 Test 7: Legacy Format Compatibility (Phase 10)');

  const startTime = Date.now();

  try {
    // Create a Phase 12 merged ruleset
    const base = createEmptyNormalizedRuleSet('base');
    const vertical = createEmptyNormalizedRuleSet('vertical');
    vertical.tokenOverrides = {
      learn: { relevance: 3, source: 'vertical' },
    };

    const merged = mergeRuleSets(base, vertical);

    // Convert to legacy format
    const legacy = toLegacyMergedRuleSet(merged);

    // Verify legacy structure
    const hasId = typeof legacy.id === 'string';
    const hasLabel = typeof legacy.label === 'string';
    const hasSource = typeof legacy.source === 'string';
    const hasVersion = typeof legacy.version === 'string';
    const hasTokenOverrides = legacy.tokenRelevanceOverrides?.['learn'] === 3;

    const passed =
      hasId && hasLabel && hasSource && hasVersion && hasTokenOverrides;

    if (passed) {
      logTest(
        'Legacy format compatibility (Phase 10)',
        true,
        undefined,
        Date.now() - startTime
      );
    } else {
      logTest(
        'Legacy format compatibility (Phase 10)',
        false,
        `Legacy format missing fields: id=${hasId}, label=${hasLabel}, source=${hasSource}, version=${hasVersion}, tokenOverrides=${hasTokenOverrides}`,
        Date.now() - startTime
      );
    }
  } catch (error) {
    logTest(
      'Legacy format compatibility (Phase 10)',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Test 8: hasActiveOverrides Utility
// ============================================================================

async function test8_HasActiveOverrides() {
  console.log('\n🧪 Test 8: hasActiveOverrides() Utility');

  const startTime = Date.now();

  try {
    // Create empty merged ruleset
    const emptyBase = createEmptyNormalizedRuleSet('base');
    const emptyMerged = mergeRuleSets(emptyBase);

    const hasOverridesEmpty = hasActiveOverrides(emptyMerged);

    // Create merged ruleset with overrides
    const withOverrides = createEmptyNormalizedRuleSet('vertical');
    withOverrides.tokenOverrides = {
      learn: { relevance: 3, source: 'vertical' },
    };
    const mergedWithOverrides = mergeRuleSets(emptyBase, withOverrides);

    const hasOverridesFilled = hasActiveOverrides(mergedWithOverrides);

    const passed = !hasOverridesEmpty && hasOverridesFilled;

    if (passed) {
      logTest(
        'hasActiveOverrides() utility',
        true,
        undefined,
        Date.now() - startTime
      );
    } else {
      logTest(
        'hasActiveOverrides() utility',
        false,
        `Expected empty=false, filled=true, got empty=${hasOverridesEmpty}, filled=${hasOverridesFilled}`,
        Date.now() - startTime
      );
    }
  } catch (error) {
    logTest(
      'hasActiveOverrides() utility',
      false,
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime
    );
  }
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║         Phase 12 Ruleset Engine QA Test Suite                 ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const totalStartTime = Date.now();

  // Run all tests
  await test1_EmptyNormalizedRuleSet();
  await test2_NormalizationLayer();
  await test3_MergePrecedence();
  await test4_CacheBehavior();
  await test5_CacheTTL();
  await test6_VersionStamping();
  await test7_LegacyCompatibility();
  await test8_HasActiveOverrides();

  const totalDuration = Date.now() - totalStartTime;

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}`);
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
      });
    console.log('');
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
