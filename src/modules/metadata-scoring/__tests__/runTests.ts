/**
 * Simple Test Runner for Metadata Scoring
 *
 * Run this with: npx tsx src/modules/metadata-scoring/__tests__/runTests.ts
 */

import { scoreMetadata } from '../services/combinedMetadataScore';
import { testFixtures, validateScoring } from './fixtures';

console.log('🧪 Running Metadata Scoring Tests...\n');

let passed = 0;
let failed = 0;

for (const [appName, fixture] of Object.entries(testFixtures)) {
  console.log(`Testing: ${appName} (${fixture.title} / ${fixture.subtitle})`);

  const result = scoreMetadata(fixture.title, fixture.subtitle);

  const validation = validateScoring(appName, result.title, result.subtitle);

  if (validation.passed) {
    console.log(`  ✅ PASSED`);
    passed++;
  } else {
    console.log(`  ❌ FAILED`);
    validation.errors.forEach(err => console.log(`     - ${err}`));
    failed++;
  }

  console.log(`  Title Score: ${result.title.score}/100`);
  console.log(`  Subtitle Score: ${result.subtitle.score}/100`);
  console.log(`  Metadata Score: ${result.metadataScore}/100`);
  console.log(`  New Tokens: ${result.subtitle.breakdown.newTokens.join(', ')}`);
  console.log(`  New Combos: ${result.subtitle.breakdown.newCombos.join(', ')}`);
  console.log('');
}

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
