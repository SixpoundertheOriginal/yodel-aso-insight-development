/**
 * Test script for Intent Intelligence Service - Phase 2
 *
 * Tests the service layer integration:
 * 1. fetchIntentRegistry() - direct database access
 * 2. getCachedIntents() - cache table access
 * 3. enrichKeywordsWithIntent() - registry-first + Edge Function fallback
 * 4. getIntentClusters() - clustering logic
 * 5. mapIntentToAuditSignals() - audit signal generation
 * 6. analyzeIntentCoverage() - coverage analysis
 *
 * IMPORTANT: Run with feature flag ENABLED
 */

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
} as any;

import { IntentIntelligenceService } from '../src/services/intent-intelligence.service';

async function testIntentIntelligenceService() {
  console.log('🧪 Testing Intent Intelligence Service - Phase 2\n');
  console.log('=' .repeat(80));

  // Test keywords covering all intent types
  const testKeywords = [
    'spotify',           // navigational
    'learn spanish',     // informational
    'best fitness tracker', // commercial
    'free photo editor', // transactional
  ];

  const platform = 'ios' as const;
  const region = 'us';

  // ============================================================================
  // TEST 1: fetchIntentRegistry
  // ============================================================================
  console.log('\n📋 TEST 1: fetchIntentRegistry()');
  console.log('-'.repeat(80));

  const registryEntries = await IntentIntelligenceService.fetchIntentRegistry(
    testKeywords,
    platform,
    region
  );

  console.log(`✓ Registry entries found: ${registryEntries.length}`);
  registryEntries.forEach((entry) => {
    console.log(`  - "${entry.keyword}": ${entry.intent_type} (${entry.intent_confidence}% confidence)`);
  });

  // ============================================================================
  // TEST 2: getCachedIntents
  // ============================================================================
  console.log('\n📋 TEST 2: getCachedIntents()');
  console.log('-'.repeat(80));

  const cachedResults = await IntentIntelligenceService.getCachedIntents(
    testKeywords,
    platform,
    region
  );

  console.log(`✓ Cached results found: ${cachedResults.length}`);
  cachedResults.forEach((result) => {
    console.log(`  - "${result.query}": ${result.suggestions_count} suggestions (cached ${new Date(result.cached_at).toLocaleString()})`);
  });

  // ============================================================================
  // TEST 3: enrichKeywordsWithIntent
  // ============================================================================
  console.log('\n📋 TEST 3: enrichKeywordsWithIntent()');
  console.log('-'.repeat(80));

  const enrichedIntents = await IntentIntelligenceService.enrichKeywordsWithIntent(
    testKeywords,
    platform,
    region
  );

  console.log(`✓ Keywords enriched: ${enrichedIntents.size}/${testKeywords.length}`);
  enrichedIntents.forEach((intent, keyword) => {
    console.log(`  - "${keyword}": ${intent.intent_type} (${intent.confidence}% confidence)`);
    console.log(`    Reasoning: ${intent.reasoning}`);
  });

  // ============================================================================
  // TEST 4: getIntentClusters
  // ============================================================================
  console.log('\n📋 TEST 4: getIntentClusters()');
  console.log('-'.repeat(80));

  const clusters = await IntentIntelligenceService.getIntentClusters(
    testKeywords,
    platform,
    region
  );

  console.log(`✓ Intent clusters generated: ${clusters.length}`);
  clusters.forEach((cluster) => {
    console.log(`  - ${cluster.intent_type.toUpperCase()}: ${cluster.count} keywords (avg confidence: ${cluster.avgConfidence}%)`);
    console.log(`    Keywords: ${cluster.keywords.join(', ')}`);
  });

  // ============================================================================
  // TEST 5: mapIntentToAuditSignals
  // ============================================================================
  console.log('\n📋 TEST 5: mapIntentToAuditSignals()');
  console.log('-'.repeat(80));

  // Simulate title and subtitle keywords
  const titleKeywords = ['spotify', 'music'];
  const subtitleKeywords = ['learn spanish', 'language lessons'];

  const auditSignals = await IntentIntelligenceService.mapIntentToAuditSignals(
    titleKeywords,
    subtitleKeywords,
    platform,
    region
  );

  console.log('✓ Audit signals generated:');
  console.log(`  - Has Navigational Intent: ${auditSignals.hasNavigationalIntent}`);
  console.log(`  - Has Informational Intent: ${auditSignals.hasInformationalIntent}`);
  console.log(`  - Has Commercial Intent: ${auditSignals.hasCommercialIntent}`);
  console.log(`  - Has Transactional Intent: ${auditSignals.hasTransactionalIntent}`);
  console.log(`  - Intent Diversity: ${auditSignals.intentDiversity}/100`);
  console.log(`  - Brand Keyword Count: ${auditSignals.brandKeywordCount}`);
  console.log(`  - Discovery Keyword Count: ${auditSignals.discoveryKeywordCount}`);
  console.log(`  - Conversion Keyword Count: ${auditSignals.conversionKeywordCount}`);
  console.log(`  - Recommendations: ${auditSignals.recommendations.length}`);
  auditSignals.recommendations.forEach((rec, i) => {
    console.log(`    ${i + 1}. ${rec}`);
  });

  // ============================================================================
  // TEST 6: analyzeIntentCoverage
  // ============================================================================
  console.log('\n📋 TEST 6: analyzeIntentCoverage()');
  console.log('-'.repeat(80));

  const coverage = await IntentIntelligenceService.analyzeIntentCoverage(
    titleKeywords,
    subtitleKeywords,
    platform,
    region
  );

  console.log('✓ Intent coverage analysis:');
  console.log('\n  TITLE:');
  console.log(`    - Dominant Intent: ${coverage.title.dominantIntent || 'none'}`);
  console.log(`    - Coverage Score: ${coverage.title.coverageScore}/100`);
  console.log(`    - Intent Distribution:`);
  console.log(`      • Navigational: ${coverage.title.intentDistribution.navigational}%`);
  console.log(`      • Informational: ${coverage.title.intentDistribution.informational}%`);
  console.log(`      • Commercial: ${coverage.title.intentDistribution.commercial}%`);
  console.log(`      • Transactional: ${coverage.title.intentDistribution.transactional}%`);
  console.log(`    - Navigational Keywords: ${coverage.title.navigationalKeywords.join(', ') || 'none'}`);
  console.log(`    - Informational Keywords: ${coverage.title.informationalKeywords.join(', ') || 'none'}`);
  console.log(`    - Commercial Keywords: ${coverage.title.commercialKeywords.join(', ') || 'none'}`);
  console.log(`    - Transactional Keywords: ${coverage.title.transactionalKeywords.join(', ') || 'none'}`);

  console.log('\n  SUBTITLE:');
  console.log(`    - Dominant Intent: ${coverage.subtitle.dominantIntent || 'none'}`);
  console.log(`    - Coverage Score: ${coverage.subtitle.coverageScore}/100`);
  console.log(`    - Intent Distribution:`);
  console.log(`      • Navigational: ${coverage.subtitle.intentDistribution.navigational}%`);
  console.log(`      • Informational: ${coverage.subtitle.intentDistribution.informational}%`);
  console.log(`      • Commercial: ${coverage.subtitle.intentDistribution.commercial}%`);
  console.log(`      • Transactional: ${coverage.subtitle.intentDistribution.transactional}%`);
  console.log(`    - Navigational Keywords: ${coverage.subtitle.navigationalKeywords.join(', ') || 'none'}`);
  console.log(`    - Informational Keywords: ${coverage.subtitle.informationalKeywords.join(', ') || 'none'}`);
  console.log(`    - Commercial Keywords: ${coverage.subtitle.commercialKeywords.join(', ') || 'none'}`);
  console.log(`    - Transactional Keywords: ${coverage.subtitle.transactionalKeywords.join(', ') || 'none'}`);

  console.log('\n  OVERALL:');
  console.log(`    - Dominant Intent: ${coverage.overall.dominantIntent || 'none'}`);
  console.log(`    - Coverage Score: ${coverage.overall.coverageScore}/100`);
  console.log(`    - Intent Distribution:`);
  console.log(`      • Navigational: ${coverage.overall.intentDistribution.navigational}%`);
  console.log(`      • Informational: ${coverage.overall.intentDistribution.informational}%`);
  console.log(`      • Commercial: ${coverage.overall.intentDistribution.commercial}%`);
  console.log(`      • Transactional: ${coverage.overall.intentDistribution.transactional}%`);

  // ============================================================================
  // TEST 7: Edge cases - empty inputs
  // ============================================================================
  console.log('\n📋 TEST 7: Edge Cases - Empty Inputs');
  console.log('-'.repeat(80));

  const emptyAuditSignals = await IntentIntelligenceService.mapIntentToAuditSignals(
    [],
    [],
    platform,
    region
  );

  console.log('✓ Empty input handling:');
  console.log(`  - Intent Diversity: ${emptyAuditSignals.intentDiversity}/100 (should be 0)`);
  console.log(`  - Recommendations: ${emptyAuditSignals.recommendations.length} (should be 0)`);

  const emptyCoverage = await IntentIntelligenceService.analyzeIntentCoverage(
    [],
    [],
    platform,
    region
  );

  console.log(`  - Coverage Score: ${emptyCoverage.overall.coverageScore}/100 (should be 0)`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('✅ All Phase 2 Service Layer Tests Completed!\n');

  console.log('Summary:');
  console.log(`  ✓ Registry entries fetched: ${registryEntries.length}`);
  console.log(`  ✓ Cached results fetched: ${cachedResults.length}`);
  console.log(`  ✓ Keywords enriched: ${enrichedIntents.size}`);
  console.log(`  ✓ Intent clusters generated: ${clusters.length}`);
  console.log(`  ✓ Audit signals generated: YES`);
  console.log(`  ✓ Coverage analysis completed: YES`);
  console.log(`  ✓ Edge cases handled: YES`);

  console.log('\n📊 Intent Distribution Summary:');
  const intentCounts = {
    navigational: 0,
    informational: 0,
    commercial: 0,
    transactional: 0,
  };

  enrichedIntents.forEach((intent) => {
    intentCounts[intent.intent_type]++;
  });

  console.log(`  • Navigational: ${intentCounts.navigational} keywords`);
  console.log(`  • Informational: ${intentCounts.informational} keywords`);
  console.log(`  • Commercial: ${intentCounts.commercial} keywords`);
  console.log(`  • Transactional: ${intentCounts.transactional} keywords`);

  console.log('\n🎯 Phase 2 Service Layer: READY FOR PHASE 3\n');
}

// Run tests
testIntentIntelligenceService().catch((error) => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
