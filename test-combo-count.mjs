/**
 * Calculate expected combo counts with full permutations
 */

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function combinations(n, r) {
  return factorial(n) / (factorial(r) * factorial(n - r));
}

function permutations(n, r) {
  return factorial(n) / factorial(n - r);
}

// Test with Inspire app: 8 keywords
const keywords = 8;

console.log('📊 Combo Count Analysis (8 keywords from title + subtitle)\n');
console.log('Keywords: inspire, self, care, wellness, daily, healthy, habits, routine\n');

// Current UI approach (2-word both orders + 3-word one order)
const twoWordBothOrders = combinations(keywords, 2) * 2; // C(8,2) × 2
const threeWordOneOrder = combinations(keywords, 3);
const uiTotal = twoWordBothOrders + threeWordOneOrder;

console.log('CURRENT UI APPROACH (what user sees now):');
console.log(`  2-word combos (both orders): C(8,2) × 2 = ${combinations(keywords, 2)} × 2 = ${twoWordBothOrders}`);
console.log(`  3-word combos (one order): C(8,3) = ${threeWordOneOrder}`);
console.log(`  Total: ${uiTotal} ✅ (matches "112" in UI)\n`);

// Proposed backend approach (full permutations)
console.log('PROPOSED BACKEND (Option C - All Permutations):');

const twoWordAllPerms = combinations(keywords, 2) * 2; // Same as UI
console.log(`  2-word: C(8,2) × 2! / 2 × 2 = ${twoWordAllPerms}`);

const threeWordAllPerms = combinations(keywords, 3) * 6; // C(8,3) × 3!
console.log(`  3-word: C(8,3) × 3! = ${combinations(keywords, 3)} × 6 = ${threeWordAllPerms}`);

const fourWordAllPerms = combinations(keywords, 4) * 24; // C(8,4) × 4!
console.log(`  4-word: C(8,4) × 4! = ${combinations(keywords, 4)} × 24 = ${fourWordAllPerms}`);

const proposedTotal = twoWordAllPerms + threeWordAllPerms + fourWordAllPerms;
console.log(`  Total: ${proposedTotal} ⚠️\n`);

// Analysis
console.log('ANALYSIS:');
console.log(`  Current UI: ${uiTotal} combos`);
console.log(`  Proposed Backend: ${proposedTotal} combos`);
console.log(`  Difference: ${proposedTotal - uiTotal} more combos\n`);

if (proposedTotal > 2000) {
  console.log('❌ CONCERN: >2000 combos may be too many for competitive analysis UI');
} else if (proposedTotal > 1000) {
  console.log('⚠️  WARNING: >1000 combos - monitor performance');
} else {
  console.log('✅ OK: Combo count is reasonable');
}

console.log('\n🤔 RECOMMENDATION:');
console.log('   Option 1: Match UI behavior (2-word both orders, 3-word one order)');
console.log('   Option 2: Full permutations but limit to 3-word max (no 4-word)');
console.log('   Option 3: Full permutations with all orders (most accurate, highest count)');
