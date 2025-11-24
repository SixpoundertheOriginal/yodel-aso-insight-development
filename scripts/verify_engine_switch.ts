import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEngineSwitch() {
  console.log('=== Verifying Intent Engine Switch to DB Patterns ===\n');

  // Simulate what loadIntentPatterns() does
  const { data: dbPatterns, error } = await supabase
    .from('aso_intent_patterns')
    .select('*')
    .eq('scope', 'base')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('❌ Error loading patterns from DB:', error);
    process.exit(1);
  }

  console.log(`✅ Database query successful: ${dbPatterns?.length || 0} patterns loaded`);

  if (!dbPatterns || dbPatterns.length === 0) {
    console.log('\n⚠️  WARNING: No patterns in database!');
    console.log('   Intent Engine will use 14 fallback patterns.');
    console.log('   Expected: 291 patterns from Phase 22 seed.');
  } else if (dbPatterns.length < 100) {
    console.log(`\n⚠️  WARNING: Only ${dbPatterns.length} patterns found.`);
    console.log('   Expected: ~291 patterns from Phase 22 seed.');
  } else {
    console.log('\n✅ SUCCESS: Intent Engine will use database patterns!');
    console.log(`   Fallback disabled: ${dbPatterns.length} patterns available`);
  }

  // Show distribution
  console.log('\n📊 Intent type distribution:');
  const dist: Record<string, number> = {};
  dbPatterns.forEach((p: any) => {
    dist[p.intent_type] = (dist[p.intent_type] || 0) + 1;
  });
  Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} patterns`);
    });

  // Show top priority patterns
  console.log('\n🔝 Top 10 patterns (by priority):');
  dbPatterns.slice(0, 10).forEach((p: any, i: number) => {
    console.log(
      `   ${i + 1}. "${p.pattern}" → ${p.intent_type} (weight: ${p.weight}, priority: ${p.priority})`
    );
  });

  // Test sample classifications
  console.log('\n🧪 Sample token classification (simulated):');
  const testTokens = ['learn', 'best', 'download', 'free', 'official', 'spanish'];

  for (const token of testTokens) {
    const match = dbPatterns.find((p: any) => {
      if (p.is_regex) return false; // Skip regex for simple test
      if (p.word_boundary) {
        // Simple word boundary check
        return p.pattern === token;
      }
      return p.pattern.includes(token) || token.includes(p.pattern);
    });

    if (match) {
      console.log(
        `   "${token}" → ${match.intent_type} (weight: ${match.weight}, priority: ${match.priority})`
      );
    } else {
      console.log(`   "${token}" → unclassified`);
    }
  }

  console.log('\n✅ Verification complete!');
  console.log('\nNext steps:');
  console.log('1. Run an audit on the UI to verify coverage improvement');
  console.log('2. Check console logs for "Loaded X patterns" message');
  console.log('3. Compare intent coverage % before/after (expect +40-50% improvement)');
}

verifyEngineSwitch().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
