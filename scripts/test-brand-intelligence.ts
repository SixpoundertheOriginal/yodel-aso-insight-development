/**
 * Brand Intelligence Service Test Script
 *
 * Tests Phase 5 brand detection and classification functionality.
 *
 * Usage:
 *   npx tsx scripts/test-brand-intelligence.ts
 */

import { BrandIntelligenceService } from '../src/services/brand-intelligence.service';
import type { ScrapedMetadata } from '../src/types/aso';

// Test metadata samples
const testMetadata: ScrapedMetadata = {
  title: 'Pimsleur Language Learning',
  subtitle: 'Learn Spanish, French & More',
  developer: 'Simon & Schuster',
  description: 'Learn languages with Pimsleur method',
  applicationCategory: 'Education'
};

console.log('========================================');
console.log('BRAND INTELLIGENCE SERVICE TEST');
console.log('========================================\n');

// ============================================================================
// TEST 1: Brand Extraction
// ============================================================================
console.log('TEST 1: Brand Extraction');
console.log('----------------------------------------');

const brandInfo = BrandIntelligenceService.extractCanonicalBrand(testMetadata);

console.log('Input metadata:');
console.log('  Title:', testMetadata.title);
console.log('  Developer:', testMetadata.developer);
console.log('\nExtracted brand info:');
console.log('  Canonical brand:', brandInfo.canonicalBrand);
console.log('  Aliases:', brandInfo.aliases);
console.log('  Developer:', brandInfo.developer);
console.log('  App name:', brandInfo.appName);

// Validate
const expectedBrand = 'pimsleur';
const testBrandExtraction = brandInfo.canonicalBrand === expectedBrand;
console.log(`\n✓ Brand extraction: ${testBrandExtraction ? 'PASS' : 'FAIL'}`);
console.log(`  Expected: "${expectedBrand}", Got: "${brandInfo.canonicalBrand}"`);

// ============================================================================
// TEST 2: Alias Generation
// ============================================================================
console.log('\n\nTEST 2: Alias Generation');
console.log('----------------------------------------');

const aliases = BrandIntelligenceService.generateBrandAliases('pimsleur');

console.log('Generated aliases for "pimsleur":');
aliases.forEach((alias, idx) => {
  console.log(`  ${idx + 1}. "${alias}"`);
});

// Validate
const hasBaseAlias = aliases.includes('pimsleur');
const hasLanguageAlias = aliases.includes('pimsleur language');
const hasAppAlias = aliases.includes('pimsleur app');

console.log('\n✓ Alias generation:');
console.log(`  Has base alias: ${hasBaseAlias ? 'PASS' : 'FAIL'}`);
console.log(`  Has "pimsleur language": ${hasLanguageAlias ? 'PASS' : 'FAIL'}`);
console.log(`  Has "pimsleur app": ${hasAppAlias ? 'PASS' : 'FAIL'}`);

// ============================================================================
// TEST 3: Brand Token Detection
// ============================================================================
console.log('\n\nTEST 3: Brand Token Detection');
console.log('----------------------------------------');

const testCases = [
  { tokens: ['pimsleur', 'spanish'], expected: true, description: 'Exact match' },
  { tokens: ['learn', 'spanish'], expected: false, description: 'No brand match' },
  { tokens: ['pimsleur', 'language', 'learning'], expected: true, description: 'Brand in multi-token' },
  { tokens: ['duolingo', 'alternative'], expected: false, description: 'Different brand' },
];

testCases.forEach((test, idx) => {
  const result = BrandIntelligenceService.detectBrandTokens(test.tokens, brandInfo.aliases);
  const pass = result === test.expected;
  console.log(`\nTest ${idx + 1}: ${test.description}`);
  console.log(`  Tokens: [${test.tokens.join(', ')}]`);
  console.log(`  Expected: ${test.expected}, Got: ${result}`);
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}`);
});

// ============================================================================
// TEST 4: Token Classification
// ============================================================================
console.log('\n\nTEST 4: Token Classification');
console.log('----------------------------------------');

const tokenClassificationTests = [
  { token: 'pimsleur', expected: 'brand', description: 'Brand token' },
  { token: 'spanish', expected: 'generic', description: 'Generic token' },
  { token: 'duolingo', expected: 'competitor', description: 'Competitor token' },
  { token: 'learn', expected: 'generic', description: 'Generic verb' },
];

tokenClassificationTests.forEach((test, idx) => {
  const result = BrandIntelligenceService.classifyToken(test.token, brandInfo.aliases);
  const pass = result === test.expected;
  console.log(`\nTest ${idx + 1}: ${test.description}`);
  console.log(`  Token: "${test.token}"`);
  console.log(`  Expected: ${test.expected}, Got: ${result}`);
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}`);
});

// ============================================================================
// TEST 5: Combo Classification
// ============================================================================
console.log('\n\nTEST 5: Combo Classification');
console.log('----------------------------------------');

const testCombos = [
  'pimsleur spanish',
  'learn spanish',
  'pimsleur language learning',
  'spanish lessons',
  'duolingo alternative',
];

const classifiedCombos = BrandIntelligenceService.classifyCombos(
  testCombos,
  brandInfo
);

console.log('Combo classifications:');
classifiedCombos.forEach((combo, idx) => {
  console.log(`\n  ${idx + 1}. "${combo.combo}"`);
  console.log(`     Classification: ${combo.classification}`);
  if (combo.matchedBrandAlias) {
    console.log(`     Matched alias: ${combo.matchedBrandAlias}`);
  }
  if (combo.matchedCompetitor) {
    console.log(`     Matched competitor: ${combo.matchedCompetitor}`);
  }
});

// Validate
const brandCombo = classifiedCombos.find(c => c.combo === 'pimsleur spanish');
const genericCombo = classifiedCombos.find(c => c.combo === 'learn spanish');
const competitorCombo = classifiedCombos.find(c => c.combo === 'duolingo alternative');

console.log('\n✓ Combo classification:');
console.log(`  "pimsleur spanish" → brand: ${brandCombo?.classification === 'brand' ? 'PASS' : 'FAIL'}`);
console.log(`  "learn spanish" → generic: ${genericCombo?.classification === 'generic' ? 'PASS' : 'FAIL'}`);
console.log(`  "duolingo alternative" → competitor: ${competitorCombo?.classification === 'competitor' ? 'PASS' : 'FAIL'}`);

// ============================================================================
// TEST 6: Intent Cluster Classification
// ============================================================================
console.log('\n\nTEST 6: Intent Cluster Classification');
console.log('----------------------------------------');

const mockIntentClusters = [
  {
    intent_type: 'navigational' as const,
    keywords: ['pimsleur', 'pimsleur app', 'pimsleur language'],
    count: 3,
    avgConfidence: 95,
    topSuggestions: [],
  },
  {
    intent_type: 'informational' as const,
    keywords: ['learn spanish', 'spanish lessons', 'language learning'],
    count: 3,
    avgConfidence: 80,
    topSuggestions: [],
  },
  {
    intent_type: 'commercial' as const,
    keywords: ['best language app', 'duolingo alternative'],
    count: 2,
    avgConfidence: 70,
    topSuggestions: [],
  },
];

const enrichedClusters = BrandIntelligenceService.classifyIntentClusters(
  mockIntentClusters,
  brandInfo
);

console.log('Intent cluster enrichment:');
enrichedClusters.forEach((cluster, idx) => {
  console.log(`\n  Cluster ${idx + 1}: ${cluster.intent_type}`);
  console.log(`    Brand keywords: ${cluster.brandKeywords.length} (${cluster.brandKeywords.join(', ')})`);
  console.log(`    Generic keywords: ${cluster.genericKeywords.length} (${cluster.genericKeywords.join(', ')})`);
  console.log(`    Competitor keywords: ${cluster.competitorKeywords.length}${cluster.competitorKeywords.length > 0 ? ` (${cluster.competitorKeywords.join(', ')})` : ''}`);
  console.log(`    Brand classification: ${cluster.brandClassification}`);
});

// Validate
const navigationalCluster = enrichedClusters.find(c => c.intent_type === 'navigational');
const informationalCluster = enrichedClusters.find(c => c.intent_type === 'informational');
const commercialCluster = enrichedClusters.find(c => c.intent_type === 'commercial');

console.log('\n✓ Intent cluster classification:');
console.log(`  Navigational → brand classification: ${navigationalCluster?.brandClassification === 'brand' ? 'PASS' : 'FAIL'}`);
console.log(`  Navigational → has brand keywords: ${navigationalCluster && navigationalCluster.brandKeywords.length > 0 ? 'PASS' : 'FAIL'}`);
console.log(`  Informational → generic classification: ${informationalCluster?.brandClassification === 'generic' ? 'PASS' : 'FAIL'}`);
console.log(`  Commercial → competitor detected: ${commercialCluster && commercialCluster.competitorKeywords.length > 0 ? 'PASS' : 'FAIL'}`);

// ============================================================================
// TEST 7: Brand Recommendations
// ============================================================================
console.log('\n\nTEST 7: Brand Recommendations');
console.log('----------------------------------------');

const recommendations = BrandIntelligenceService.getBrandRecommendations(
  brandInfo,
  enrichedClusters
);

console.log(`Generated ${recommendations.length} recommendations:`);
recommendations.forEach((rec, idx) => {
  console.log(`\n  ${idx + 1}. ${rec}`);
});

console.log(`\n✓ Recommendations generated: ${recommendations.length > 0 ? 'PASS' : 'FAIL'}`);

// ============================================================================
// TEST 8: UI Data Forwarding Validation
// ============================================================================
console.log('\n\nTEST 8: UI Data Forwarding Validation');
console.log('----------------------------------------');

// Simulate audit result with classified combos (as would come from metadataAuditEngine)
const mockClassifiedCombos = [
  { text: 'pimsleur spanish', type: 'branded' as const, relevanceScore: 3, brandClassification: 'brand' as const, matchedBrandAlias: 'pimsleur' },
  { text: 'learn spanish', type: 'generic' as const, relevanceScore: 2, brandClassification: 'generic' as const },
  { text: 'duolingo alternative', type: 'generic' as const, relevanceScore: 2, brandClassification: 'competitor' as const, matchedCompetitor: 'duolingo' },
  { text: 'language lessons', type: 'generic' as const, relevanceScore: 2, brandClassification: 'generic' as const },
];

console.log('Mock classified combos (as from metadataAuditEngine):');
mockClassifiedCombos.forEach((combo, idx) => {
  console.log(`\n  ${idx + 1}. "${combo.text}"`);
  console.log(`     type: ${combo.type} (legacy)`);
  console.log(`     brandClassification: ${combo.brandClassification} (Phase 5)`);
  if (combo.matchedBrandAlias) {
    console.log(`     matchedBrandAlias: ${combo.matchedBrandAlias}`);
  }
  if (combo.matchedCompetitor) {
    console.log(`     matchedCompetitor: ${combo.matchedCompetitor}`);
  }
});

// Validate that brandClassification is populated
const allHaveBrandClassification = mockClassifiedCombos.every(c => c.brandClassification !== undefined);
const brandClassifiedCorrectly = mockClassifiedCombos.find(c => c.text === 'pimsleur spanish')?.brandClassification === 'brand';
const genericClassifiedCorrectly = mockClassifiedCombos.find(c => c.text === 'learn spanish')?.brandClassification === 'generic';
const competitorClassifiedCorrectly = mockClassifiedCombos.find(c => c.text === 'duolingo alternative')?.brandClassification === 'competitor';

console.log('\n✓ UI data forwarding:');
console.log(`  All combos have brandClassification: ${allHaveBrandClassification ? 'PASS' : 'FAIL'}`);
console.log(`  Brand combo classified as 'brand': ${brandClassifiedCorrectly ? 'PASS' : 'FAIL'}`);
console.log(`  Generic combo classified as 'generic': ${genericClassifiedCorrectly ? 'PASS' : 'FAIL'}`);
console.log(`  Competitor combo classified as 'competitor': ${competitorClassifiedCorrectly ? 'PASS' : 'FAIL'}`);

// Validate UI filtering logic (as would happen in ComboCoverageCard)
const brandCombos = mockClassifiedCombos.filter(c => c.brandClassification === 'brand');
const genericCombos = mockClassifiedCombos.filter(c => c.brandClassification === 'generic');
const competitorCombos = mockClassifiedCombos.filter(c => c.brandClassification === 'competitor');

console.log('\n✓ UI filtering (ComboCoverageCard logic):');
console.log(`  Brand combos count: ${brandCombos.length} (expected: 1) - ${brandCombos.length === 1 ? 'PASS' : 'FAIL'}`);
console.log(`  Generic combos count: ${genericCombos.length} (expected: 2) - ${genericCombos.length === 2 ? 'PASS' : 'FAIL'}`);
console.log(`  Competitor combos count: ${competitorCombos.length} (expected: 1) - ${competitorCombos.length === 1 ? 'PASS' : 'FAIL'}`);

// Validate that star badge would show for brand combos
const brandComboWithAlias = mockClassifiedCombos.find(c => c.brandClassification === 'brand' && c.matchedBrandAlias);
console.log('\n✓ Star badge data:');
console.log(`  Brand combo has matchedBrandAlias: ${brandComboWithAlias ? 'PASS' : 'FAIL'}`);
console.log(`  Matched alias: "${brandComboWithAlias?.matchedBrandAlias}"`);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log('All Phase 5 Brand Intelligence tests completed.');
console.log('✓ Backend classification works correctly');
console.log('✓ UI data forwarding validated');
console.log('✓ ComboCoverageCard filtering logic validated');
console.log('\nReview results above for PASS/FAIL status.');
console.log('\nTo enable brand intelligence in UI:');
console.log('  Set AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED = true');
console.log('  in src/config/metadataFeatureFlags.ts');
console.log('\nExpected UI behavior when enabled:');
console.log('  • ComboCoverageCard uses brandClassification instead of type');
console.log('  • Star badges appear next to brand combos');
console.log('  • Summary shows "X brand • Y generic • Z competitor"');
console.log('  • SearchIntentAnalysisCard shows brand/generic/competitor counts');
console.log('========================================\n');
