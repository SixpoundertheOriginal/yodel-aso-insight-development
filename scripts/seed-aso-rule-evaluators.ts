/**
 * Seed ASO Rule Evaluators
 *
 * Phase 15: Seed all metadata audit rule evaluators into the database
 *
 * This script:
 * - Reads the 12 rule evaluators from metadataScoringRegistry.ts
 * - Seeds them into aso_rule_evaluators table
 * - Is idempotent (safe to run multiple times)
 * - Maintains backward compatibility (no behavior changes)
 *
 * Usage:
 *   npx tsx scripts/seed-aso-rule-evaluators.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// Rule Evaluator Definitions (from metadataScoringRegistry.ts)
// ============================================================================

interface RuleEvaluatorSeed {
  rule_id: string;
  name: string;
  description: string;
  scope: 'title' | 'subtitle' | 'description' | 'coverage' | 'intent' | 'global';
  family: 'ranking' | 'conversion' | 'diagnostic' | 'coverage';
  weight_default: number;
  severity_default: 'critical' | 'strong' | 'moderate' | 'optional' | 'info';
  threshold_low?: number;
  threshold_high?: number;
  kpi_ids?: string[];
  formula_id?: string;
  notes?: string;
  help_text?: string;
  tags?: string[];
}

const RULE_EVALUATORS: RuleEvaluatorSeed[] = [
  // ===================================================================
  // TITLE RULES (4)
  // ===================================================================
  {
    rule_id: 'title_character_usage',
    name: 'Character Usage Efficiency',
    description: 'Measures how well the title uses available character space (30 chars)',
    scope: 'title',
    family: 'ranking',
    weight_default: 0.25,
    severity_default: 'moderate',
    threshold_low: 70,  // 70% character usage
    threshold_high: 100, // 100% character usage
    kpi_ids: ['title_character_count', 'slot_utilization'],
    formula_id: 'weighted_sum',
    help_text: 'Aim for 70-100% character usage. Titles under 70% waste valuable ranking space.',
    tags: ['title', 'character_count', 'slot_usage'],
  },
  {
    rule_id: 'title_unique_keywords',
    name: 'Unique Keyword Density',
    description: 'Evaluates meaningful keyword coverage with semantic relevance weighting',
    scope: 'title',
    family: 'ranking',
    weight_default: 0.30,
    severity_default: 'strong',
    threshold_low: 2,  // 2 unique keywords minimum
    threshold_high: 5, // 5+ unique keywords ideal
    kpi_ids: ['title_unique_keyword_count', 'keyword_efficiency'],
    formula_id: 'weighted_sum',
    help_text: 'Include at least 2-5 unique, relevant keywords. Higher relevance scores (languages, intent verbs) boost this metric.',
    tags: ['title', 'keywords', 'relevance'],
  },
  {
    rule_id: 'title_combo_coverage',
    name: 'Keyword Combination Coverage',
    description: 'Evaluates multi-word keyword combinations (2-4 words)',
    scope: 'title',
    family: 'ranking',
    weight_default: 0.30,
    severity_default: 'strong',
    threshold_low: 2,  // 2 combos minimum
    threshold_high: 5, // 5+ combos ideal
    kpi_ids: ['title_combo_coverage', 'discovery_footprint'],
    formula_id: 'weighted_sum',
    help_text: 'Multi-word combinations (e.g. "learn spanish", "language lessons") expand search coverage.',
    tags: ['title', 'combinations', 'ngrams'],
  },
  {
    rule_id: 'title_filler_penalty',
    name: 'Filler Token Penalty',
    description: 'Penalizes excessive use of stopwords and generic terms using noise ratio',
    scope: 'title',
    family: 'diagnostic',
    weight_default: 0.15,
    severity_default: 'moderate',
    threshold_low: 0.3,  // 30% noise ratio (good)
    threshold_high: 0.5, // 50% noise ratio (bad)
    kpi_ids: [],
    formula_id: 'penalty_based',
    help_text: 'Avoid filler words like "best", "top", "new". Keep noise ratio under 30%.',
    tags: ['title', 'stopwords', 'filler', 'penalty'],
  },

  // ===================================================================
  // SUBTITLE RULES (4)
  // ===================================================================
  {
    rule_id: 'subtitle_character_usage',
    name: 'Character Usage Efficiency',
    description: 'Measures how well the subtitle uses available character space (30 chars)',
    scope: 'subtitle',
    family: 'ranking',
    weight_default: 0.20,
    severity_default: 'moderate',
    threshold_low: 70,
    threshold_high: 100,
    kpi_ids: ['subtitle_character_count', 'slot_utilization'],
    formula_id: 'weighted_sum',
    help_text: 'Subtitles should use 70-100% of available space for maximum ASO impact.',
    tags: ['subtitle', 'character_count', 'slot_usage'],
  },
  {
    rule_id: 'subtitle_incremental_value',
    name: 'Incremental Value',
    description: 'Measures how much NEW high-value information subtitle adds vs title',
    scope: 'subtitle',
    family: 'ranking',
    weight_default: 0.40,  // HIGHEST weight - most important
    severity_default: 'critical',
    threshold_low: 2,  // 2 new high-value keywords
    threshold_high: 3, // 3+ new high-value keywords
    kpi_ids: ['subtitle_incremental_value', 'keyword_efficiency'],
    formula_id: 'weighted_sum',
    help_text: 'Subtitle should add NEW high-value keywords (relevance ≥2), not repeat title words.',
    tags: ['subtitle', 'incremental', 'value', 'critical'],
  },
  {
    rule_id: 'subtitle_combo_coverage',
    name: 'New Combination Coverage',
    description: 'Evaluates NEW multi-word combinations vs title',
    scope: 'subtitle',
    family: 'ranking',
    weight_default: 0.25,
    severity_default: 'strong',
    threshold_low: 2,
    threshold_high: 5,
    kpi_ids: ['subtitle_combo_coverage', 'discovery_footprint'],
    formula_id: 'weighted_sum',
    help_text: 'Subtitle should create NEW keyword combinations beyond what title offers.',
    tags: ['subtitle', 'combinations', 'incremental'],
  },
  {
    rule_id: 'subtitle_complementarity',
    name: 'Title Complementarity',
    description: 'Ensures subtitle complements (not duplicates) title based on relevant tokens',
    scope: 'subtitle',
    family: 'ranking',
    weight_default: 0.15,
    severity_default: 'moderate',
    threshold_low: 0.4,  // <40% overlap is good
    threshold_high: 0.6, // >60% overlap is bad
    kpi_ids: [],
    formula_id: 'complementarity',
    help_text: 'Avoid repeating title keywords. Low overlap (<40%) means good complementarity.',
    tags: ['subtitle', 'complementarity', 'overlap'],
  },

  // ===================================================================
  // DESCRIPTION RULES (4) - Conversion, not ranking
  // ===================================================================
  {
    rule_id: 'description_hook_strength',
    name: 'Opening Hook Strength',
    description: 'Evaluates the first paragraph\'s ability to capture attention using category-based weighted scoring',
    scope: 'description',
    family: 'conversion',
    weight_default: 0.30,
    severity_default: 'strong',
    threshold_low: 60,  // 60 score is good
    threshold_high: 80, // 80+ score is excellent
    kpi_ids: ['hook_strength'],
    formula_id: 'category_weighted_hook',
    help_text: 'First paragraph should use compelling hook words (category keywords, benefits, CTAs, time-sensitive language).',
    tags: ['description', 'hook', 'conversion', 'first_paragraph'],
  },
  {
    rule_id: 'description_feature_mentions',
    name: 'Feature Mentions',
    description: 'Counts explicit feature/benefit mentions',
    scope: 'description',
    family: 'conversion',
    weight_default: 0.25,
    severity_default: 'moderate',
    threshold_low: 3,  // 3 feature mentions
    threshold_high: 6, // 6+ feature mentions
    kpi_ids: [],
    formula_id: 'linear_count',
    help_text: 'Mention specific features, tools, functions, capabilities, or benefits (aim for 3-6).',
    tags: ['description', 'features', 'benefits'],
  },
  {
    rule_id: 'description_cta_strength',
    name: 'Call-to-Action Strength',
    description: 'Evaluates presence of conversion-focused CTAs',
    scope: 'description',
    family: 'conversion',
    weight_default: 0.20,
    severity_default: 'moderate',
    threshold_low: 2,  // 2 CTAs
    threshold_high: 4, // 4+ CTAs
    kpi_ids: ['cta_strength'],
    formula_id: 'linear_count',
    help_text: 'Include strong CTAs like "download", "try", "start", "get", "join", "subscribe".',
    tags: ['description', 'cta', 'conversion'],
  },
  {
    rule_id: 'description_readability',
    name: 'Readability Score',
    description: 'Flesch-Kincaid Reading Ease (0-100, higher is better)',
    scope: 'description',
    family: 'conversion',
    weight_default: 0.25,
    severity_default: 'optional',
    threshold_low: 40,  // 40 = moderate readability
    threshold_high: 60, // 60+ = easy readability
    kpi_ids: [],
    formula_id: 'flesch_kincaid',
    help_text: 'Aim for easy readability (60+). Use shorter sentences and simpler words.',
    tags: ['description', 'readability', 'flesch_kincaid'],
  },
];

// ============================================================================
// Seeding Functions
// ============================================================================

async function ruleExists(ruleId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('aso_rule_evaluators')
    .select('id')
    .eq('rule_id', ruleId)
    .maybeSingle();

  if (error) {
    console.error(`  ❌ Error checking if rule ${ruleId} exists:`, error.message);
    return false;
  }

  return !!data;
}

async function seedRule(rule: RuleEvaluatorSeed): Promise<boolean> {
  const exists = await ruleExists(rule.rule_id);

  if (exists) {
    console.log(`  ⏭️  Rule "${rule.rule_id}" already exists, skipping`);
    return false;
  }

  const { error } = await supabase
    .from('aso_rule_evaluators')
    .insert({
      rule_id: rule.rule_id,
      name: rule.name,
      description: rule.description,
      scope: rule.scope,
      family: rule.family,
      weight_default: rule.weight_default,
      severity_default: rule.severity_default,
      threshold_low: rule.threshold_low,
      threshold_high: rule.threshold_high,
      kpi_ids: rule.kpi_ids || [],
      formula_id: rule.formula_id,
      notes: rule.notes,
      help_text: rule.help_text,
      tags: rule.tags || [],
      is_active: true,
      is_deprecated: false,
    });

  if (error) {
    console.error(`  ❌ Error seeding rule "${rule.rule_id}":`, error.message);
    return false;
  }

  console.log(`  ✅ Seeded rule: ${rule.rule_id} (${rule.name})`);
  return true;
}

async function seedAllRules(): Promise<void> {
  console.log('\n📦 Seeding ASO Rule Evaluators\n');
  console.log(`Total rules to seed: ${RULE_EVALUATORS.length}\n`);

  let seeded = 0;
  let skipped = 0;
  let errors = 0;

  for (const rule of RULE_EVALUATORS) {
    console.log(`\n🔧 Processing: ${rule.rule_id}`);
    const success = await seedRule(rule);

    if (success) {
      seeded++;
    } else {
      const exists = await ruleExists(rule.rule_id);
      if (exists) {
        skipped++;
      } else {
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Seeding Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Seeded:  ${seeded} rule${seeded !== 1 ? 's' : ''}`);
  console.log(`⏭️  Skipped: ${skipped} rule${skipped !== 1 ? 's' : ''} (already exist)`);
  console.log(`❌ Errors:  ${errors} rule${errors !== 1 ? 's' : ''}`);
  console.log('='.repeat(60) + '\n');

  if (errors > 0) {
    console.error('⚠️  Some rules failed to seed. Check errors above.');
    process.exit(1);
  }

  console.log('✅ Rule evaluator seeding complete!\n');
}

// ============================================================================
// Verification Function
// ============================================================================

async function verifySeeding(): Promise<void> {
  console.log('🔍 Verifying seeded rules...\n');

  const { data: rules, error } = await supabase
    .from('aso_rule_evaluators')
    .select('rule_id, name, scope, family, weight_default, severity_default, is_active')
    .order('scope', { ascending: true })
    .order('rule_id', { ascending: true });

  if (error) {
    console.error('❌ Error fetching rules for verification:', error.message);
    return;
  }

  if (!rules || rules.length === 0) {
    console.warn('⚠️  No rules found in database after seeding!');
    return;
  }

  console.log(`Found ${rules.length} rules in database:\n`);

  // Group by scope
  const byScope: Record<string, any[]> = {};
  rules.forEach((rule) => {
    if (!byScope[rule.scope]) {
      byScope[rule.scope] = [];
    }
    byScope[rule.scope].push(rule);
  });

  // Display by scope
  for (const [scope, scopeRules] of Object.entries(byScope)) {
    console.log(`\n📍 ${scope.toUpperCase()} (${scopeRules.length} rules):`);
    scopeRules.forEach((rule) => {
      const activeFlag = rule.is_active ? '🟢' : '🔴';
      console.log(`  ${activeFlag} ${rule.rule_id}`);
      console.log(`     └─ ${rule.name}`);
      console.log(`        Weight: ${rule.weight_default}, Severity: ${rule.severity_default}, Family: ${rule.family}`);
    });
  }

  console.log('\n✅ Verification complete!\n');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  ASO Rule Evaluator Seeding Script');
  console.log('  Phase 15: Rule Evaluator Registry');
  console.log('='.repeat(60) + '\n');

  try {
    // Seed all rules
    await seedAllRules();

    // Verify seeding
    await verifySeeding();

    console.log('🎉 All done! Rule evaluators are now in the database.\n');
    console.log('Next steps:');
    console.log('  1. View rules in Admin UI: /admin/aso-bible/rule-registry');
    console.log('  2. Test audit engine with Bible-backed rules');
    console.log('  3. Create overrides for specific verticals/markets\n');

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run main function
main();
