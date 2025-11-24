import { loadIntentPatterns, classifyTokenIntent, classifyComboIntent } from '../src/engine/asoBible/intentEngine';

async function testIntentEngine() {
  console.log('=== Intent Engine Test ===\n');

  // 1. Load patterns
  console.log('Loading intent patterns from database...');
  const patterns = await loadIntentPatterns();
  console.log(`✅ Loaded ${patterns.length} patterns`);

  if (patterns.length === 14) {
    console.log('⚠️  WARNING: Still using fallback patterns (14)');
    console.log('   Expected: 291 patterns from database');
  } else if (patterns.length === 291) {
    console.log('✅ SUCCESS: Using database patterns!');
  }

  console.log('\n📊 Pattern distribution:');
  const dist: Record<string, number> = {};
  patterns.forEach((p) => {
    dist[p.intentType] = (dist[p.intentType] || 0) + 1;
  });
  Object.entries(dist).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  // 2. Test token classification
  console.log('\n🧪 Testing token classification:');
  const testTokens = ['learn', 'best', 'download', 'free', 'official', 'spanish'];

  for (const token of testTokens) {
    const result = classifyTokenIntent(token, patterns);
    console.log(`   "${token}" → ${result.intentType} (weight: ${result.weight})`);
  }

  // 3. Test combo classification
  console.log('\n🧪 Testing combo classification:');
  const testCombos = [
    'learn spanish',
    'best fitness app',
    'download now',
    'official duolingo app',
  ];

  for (const combo of testCombos) {
    const result = classifyComboIntent(combo, patterns);
    console.log(`   "${combo}":`);
    console.log(`      Dominant: ${result.dominantIntent}`);
    console.log(`      Coverage: ${result.coverage.toFixed(1)}%`);
    console.log(`      Distribution: ${JSON.stringify(result.distribution)}`);
  }

  console.log('\n✅ Intent Engine test complete!');
}

testIntentEngine().catch((error) => {
  console.error('❌ Error testing intent engine:', error);
  process.exit(1);
});
