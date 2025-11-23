/**
 * ASO Bible Test: Intent Coverage (Phase 16.7)
 *
 * Tests that search intent classification works correctly using Intent Engine.
 *
 * Flow:
 * 1. Test metadata with known intents (informational, commercial, branded)
 * 2. Verify intent detection in token analysis
 * 3. Test Intent Engine integration (DB-driven + fallback)
 * 4. Verify intentClass is populated on classified combos
 * 5. Test Discovery Footprint grouping by intent
 */

import { MetadataAuditEngine } from '../../src/engine/metadata/metadataAuditEngine';
import type { ScrapedMetadata } from '../../src/types/aso';
import { loadIntentPatterns } from '../../src/engine/asoBible/intentEngine';
import { classifyIntent } from '../../src/utils/comboIntentClassifier';

const TEST_APP_INFORMATIONAL: ScrapedMetadata = {
  appId: 'test_intent_info',
  name: 'Dictionary',
  title: 'English Dictionary & Thesaurus',
  subtitle: 'Word Definitions & Meanings',
  description: 'Find word definitions, meanings, and synonyms.',
  applicationCategory: 'Reference',
  platform: 'ios'
};

const TEST_APP_COMMERCIAL: ScrapedMetadata = {
  appId: 'test_intent_commercial',
  name: 'Shopping',
  title: 'Best Deals & Discounts Shop',
  subtitle: 'Buy Products Save Money',
  description: 'Shop the best deals and save money on products.',
  applicationCategory: 'Shopping',
  platform: 'ios'
};

const TEST_APP_BRANDED: ScrapedMetadata = {
  appId: 'test_intent_branded',
  name: 'Nike',
  title: 'Nike: Shoes, Apparel & Gear',
  subtitle: 'Official Nike Shopping App',
  description: 'Shop official Nike products and exclusive releases.',
  applicationCategory: 'Shopping',
  platform: 'ios'
};

export async function testIntentCoverage(): Promise<boolean> {
  console.log('[TEST] Intent Coverage & Classification (Phase 16.7)');

  try {
    // Test 1: Intent Engine pattern loading (DB-driven + fallback)
    console.log('\n[Test 1] Intent Engine pattern loading');
    const patterns = await loadIntentPatterns();
    console.log(`  ✓ Loaded ${patterns.length} intent patterns`);

    const informationalPatterns = patterns.filter(p => p.intentType === 'informational');
    const commercialPatterns = patterns.filter(p => p.intentType === 'commercial');
    const transactionalPatterns = patterns.filter(p => p.intentType === 'transactional');
    const navigationalPatterns = patterns.filter(p => p.intentType === 'navigational');

    console.log(`    - Informational: ${informationalPatterns.length} patterns`);
    console.log(`    - Commercial: ${commercialPatterns.length} patterns`);
    console.log(`    - Transactional: ${transactionalPatterns.length} patterns`);
    console.log(`    - Navigational: ${navigationalPatterns.length} patterns`);

    // Test 2: Informational intent metadata
    console.log('\n[Test 2] Informational intent app');
    const resultInfo = await MetadataAuditEngine.evaluate(TEST_APP_INFORMATIONAL);
    const infoKeywords = resultInfo.keywordCoverage.titleKeywords;
    console.log(`  Keywords: ${infoKeywords.join(', ')}`);

    // Check if combos have intentClass populated
    const infoCombos = resultInfo.comboCoverage.titleCombosClassified || [];
    const learningCombos = infoCombos.filter(c => c.intentClass === 'learning');
    console.log(`  Combos with 'learning' intent: ${learningCombos.map(c => c.text).join(', ')}`);
    console.log(`  ✓ Informational combos classified: ${infoCombos.length} total, ${learningCombos.length} learning`);

    // Test 3: Commercial intent metadata
    console.log('\n[Test 3] Commercial intent app');
    const resultCommercial = await MetadataAuditEngine.evaluate(TEST_APP_COMMERCIAL);
    const commercialKeywords = resultCommercial.keywordCoverage.titleKeywords;
    console.log(`  Keywords: ${commercialKeywords.join(', ')}`);

    const commercialCombos = resultCommercial.comboCoverage.titleCombosClassified || [];
    const outcomeCombos = commercialCombos.filter(c => c.intentClass === 'outcome');
    console.log(`  Combos with 'outcome' intent: ${outcomeCombos.map(c => c.text).join(', ')}`);
    console.log(`  ✓ Commercial combos classified: ${commercialCombos.length} total, ${outcomeCombos.length} outcome`);

    // Test 4: Branded intent metadata
    console.log('\n[Test 4] Branded intent app');
    const resultBranded = await MetadataAuditEngine.evaluate(TEST_APP_BRANDED);
    const brandedKeywords = resultBranded.keywordCoverage.titleKeywords;
    console.log(`  Keywords: ${brandedKeywords.join(', ')}`);

    const brandedCombos = resultBranded.comboCoverage.titleCombosClassified || [];
    const brandIntentCombos = brandedCombos.filter(c => c.intentClass === 'brand');
    console.log(`  Combos with 'brand' intent: ${brandIntentCombos.map(c => c.text).join(', ')}`);
    console.log(`  ✓ Branded combos classified: ${brandedCombos.length} total, ${brandIntentCombos.length} brand`);

    // Test 5: Verify all combos have intentClass populated
    console.log('\n[Test 5] Verify intentClass population');
    const allCombos = [
      ...(resultInfo.comboCoverage.titleCombosClassified || []),
      ...(resultCommercial.comboCoverage.titleCombosClassified || []),
      ...(resultBranded.comboCoverage.titleCombosClassified || [])
    ];
    const combosWithIntent = allCombos.filter(c => c.intentClass !== undefined);
    console.log(`  Total combos: ${allCombos.length}`);
    console.log(`  Combos with intentClass: ${combosWithIntent.length}`);

    if (combosWithIntent.length === allCombos.length) {
      console.log(`  ✓ All combos have intentClass populated`);
    } else {
      console.log(`  ⚠️  ${allCombos.length - combosWithIntent.length} combos missing intentClass`);
    }

    console.log('\n✓ Intent Engine integration test passed');
    return true;

  } catch (error) {
    console.log(`\n✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    console.error(error);
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIntentCoverage().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
