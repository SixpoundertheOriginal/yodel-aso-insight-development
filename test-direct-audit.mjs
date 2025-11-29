/**
 * Test MetadataAuditEngine directly with subtitle
 * to see if subtitle is being analyzed
 */

const testData = {
  name: "Inspire - Self Care & Wellness",
  title: "Inspire - Self Care & Wellness",
  subtitle: "Daily Healthy Habits & Routine",
  description: "Test description..."
};

console.log('Input to MetadataAuditEngine:');
console.log(`  Title: "${testData.title}"`);
console.log(`  Subtitle: "${testData.subtitle}"`);
console.log(`  Subtitle length: ${testData.subtitle.length}`);

console.log('\nExpected analysis:');
console.log('  Title keywords: inspire, self, care, wellness (4)');
console.log('  Subtitle keywords: daily, healthy, habits, routine (4)');
console.log('  Total keywords: ~8');
console.log('  Title combos: inspire self, self care, care wellness, etc.');
console.log('  Combined combos (title + subtitle): Should include combinations like:');
console.log('    - wellness daily');
console.log('    - care healthy');
console.log('    - self care wellness');
console.log('    - healthy habits routine');
console.log('  Expected total: 100+ combos from combining all 8 keywords');

console.log('\n❓ QUESTION: Where did you see 112 combos in the UI?');
console.log('   Can you check the browser DevTools Network tab for the');
console.log('   metadata-audit-v2 response and share the comboCoverage object?');
