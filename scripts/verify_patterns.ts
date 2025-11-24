import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPatterns() {
  console.log('=== Phase 22 Pattern Verification ===\n');

  // 1. Total count
  const { count: totalCount } = await supabase
    .from('aso_intent_patterns')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Total patterns in database: ${totalCount}`);

  // 2. Count by intent type
  const { data: byType } = await supabase
    .from('aso_intent_patterns')
    .select('intent_type')
    .eq('scope', 'base')
    .eq('is_active', true);

  const counts: Record<string, number> = {};
  byType?.forEach((row) => {
    counts[row.intent_type] = (counts[row.intent_type] || 0) + 1;
  });

  console.log('\n📊 Distribution by intent type:');
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} patterns`);
    });

  // 3. Show first 5 patterns
  const { data: samples } = await supabase
    .from('aso_intent_patterns')
    .select('pattern, intent_type, weight, priority, example')
    .eq('scope', 'base')
    .order('priority', { ascending: false })
    .limit(5);

  console.log('\n📝 First 5 patterns (by priority):');
  samples?.forEach((p, i) => {
    console.log(
      `   ${i + 1}. "${p.pattern}" → ${p.intent_type} (weight: ${p.weight}, priority: ${p.priority})`
    );
    console.log(`      Example: "${p.example}"`);
  });

  // 4. Check scope values
  const { data: scopeCheck } = await supabase
    .from('aso_intent_patterns')
    .select('scope')
    .neq('scope', 'base');

  console.log(`\n🔍 Non-base scope patterns: ${scopeCheck?.length || 0}`);

  // 5. Check for nulls in vertical/market/org
  const { data: nullCheck } = await supabase
    .from('aso_intent_patterns')
    .select('vertical, market, organization_id, app_id')
    .or('vertical.not.is.null,market.not.is.null,organization_id.not.is.null,app_id.not.is.null');

  console.log(`🔍 Patterns with vertical/market/org values: ${nullCheck?.length || 0}`);

  console.log('\n✅ Verification complete!\n');
  console.log('Expected behavior:');
  console.log('- Intent Engine will now load 291 patterns from DB (not 14 fallback)');
  console.log('- Coverage should increase from ~30-40% to ~70-80%');
  console.log('- Layer 1 classification powered by database patterns');
  console.log('- Layer 2 mapping still uses intentTypeMapping.ts');
}

verifyPatterns().catch(console.error);
