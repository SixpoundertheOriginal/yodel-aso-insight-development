/**
 * ASO Bible Ruleset Seeding Script
 *
 * Phase 14: Seed initial rulesets into the database
 *
 * This script populates the ASO Bible database with initial rulesets from
 * existing code-based vertical and market profiles.
 *
 * Usage:
 *   npx tsx scripts/seed-aso-bible-rulesets.ts
 *
 * Features:
 * - Idempotent (can be run multiple times safely)
 * - Creates base ruleset rows for all verticals and markets
 * - Populates override tables with code-based defaults
 * - Creates version entries for audit trail
 * - Uses RLS-compatible patterns
 */

import { config } from 'dotenv';
import { createServerClient } from './supabase-server-client';

// Load environment variables
config();

// Import vertical profiles
import languageLearningRuleSet from '../src/engine/asoBible/verticalProfiles/language_learning/ruleset';
import rewardsRuleSet from '../src/engine/asoBible/verticalProfiles/rewards/ruleset';
import financeRuleSet from '../src/engine/asoBible/verticalProfiles/finance/ruleset';
import datingRuleSet from '../src/engine/asoBible/verticalProfiles/dating/ruleset';
import productivityRuleSet from '../src/engine/asoBible/verticalProfiles/productivity/ruleset';
import healthRuleSet from '../src/engine/asoBible/verticalProfiles/health/ruleset';
import entertainmentRuleSet from '../src/engine/asoBible/verticalProfiles/entertainment/ruleset';
import { getVerticalById } from '../src/engine/asoBible/verticalProfiles';
import { getMarketById } from '../src/engine/asoBible/marketProfiles';

// Import market profiles
import usMarketRuleSet from '../src/engine/asoBible/marketProfiles/us/ruleset';
import ukMarketRuleSet from '../src/engine/asoBible/marketProfiles/uk/ruleset';
import caMarketRuleSet from '../src/engine/asoBible/marketProfiles/ca/ruleset';
import auMarketRuleSet from '../src/engine/asoBible/marketProfiles/au/ruleset';
import deMarketRuleSet from '../src/engine/asoBible/marketProfiles/de/ruleset';

import type { AsoBibleRuleSet } from '../src/engine/asoBible/ruleset.types';

// ============================================================================
// Configuration
// ============================================================================

const supabase = createServerClient();

const seededVerticals: string[] = [];
const seededMarkets: string[] = [];

// ============================================================================
// Vertical and Market Profiles
// ============================================================================

const BASE_RULESET: AsoBibleRuleSet = {
  id: 'base',
  label: 'Base RuleSet',
  description: 'Global defaults for all apps',
  source: 'base',
  version: '1.0.0',
  kpiOverrides: {},
  formulaOverrides: {},
  intentOverrides: {},
  hookOverrides: {},
  recommendationOverrides: {},
};

const VERTICAL_RULESETS: Array<{ id: string; ruleset: AsoBibleRuleSet }> = [
  { id: 'base', ruleset: BASE_RULESET },
  { id: 'language_learning', ruleset: languageLearningRuleSet },
  { id: 'rewards', ruleset: rewardsRuleSet },
  { id: 'finance', ruleset: financeRuleSet },
  { id: 'dating', ruleset: datingRuleSet },
  { id: 'productivity', ruleset: productivityRuleSet },
  { id: 'health', ruleset: healthRuleSet },
  { id: 'entertainment', ruleset: entertainmentRuleSet },
];

const MARKET_RULESETS: Array<{ id: string; ruleset: AsoBibleRuleSet }> = [
  { id: 'us', ruleset: usMarketRuleSet },
  { id: 'uk', ruleset: ukMarketRuleSet },
  { id: 'ca', ruleset: caMarketRuleSet },
  { id: 'au', ruleset: auMarketRuleSet },
  { id: 'de', ruleset: deMarketRuleSet },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a ruleset already exists in the database
 */
async function rulesetExists(scope: string, vertical?: string, market?: string): Promise<boolean> {
  if (scope === 'vertical') {
    const { data, error } = await supabase
      .from('aso_ruleset_vertical')
      .select('id')
      .eq('vertical', vertical || 'base')
      .eq('version', 1)
      .limit(1);

    if (error) {
      console.error(`Error checking vertical ruleset existence:`, error);
      return false;
    }

    return (data || []).length > 0;
  }

  const { data, error } = await supabase
    .from('aso_ruleset_market')
    .select('id')
    .eq('market', market || 'global')
    .eq('version', 1)
    .limit(1);

  if (error) {
    console.error(`Error checking market ruleset existence:`, error);
    return false;
  }

  return (data || []).length > 0;
}

/**
 * Create a version entry for the ruleset
 */
async function createVersionEntry(
  scope: string,
  vertical: string | undefined,
  market: string | undefined,
  organizationId: string | undefined,
  rulesetSnapshot: Record<string, any>
): Promise<boolean> {
  const payload = {
    ruleset_version: 1,
    vertical_version: scope === 'vertical' ? 1 : null,
    market_version: scope === 'market' ? 1 : null,
    client_version: null,
    kpi_schema_version: 'v1',
    formula_schema_version: 'v1',
    vertical: vertical || null,
    market: market || null,
    organization_id: organizationId || null,
    ruleset_snapshot: rulesetSnapshot,
  };

  const { error } = await supabase
    .from('aso_ruleset_versions')
    .insert(payload);

  if (error) {
    console.error(`Error creating version entry:`, error);
    return false;
  }

  return true;
}

function buildRulesetSnapshot(params: {
  scope: 'vertical' | 'market';
  vertical?: string;
  market?: string;
  ruleset: AsoBibleRuleSet;
}) {
  const { scope, vertical, market, ruleset } = params;
  const verticalProfile = vertical ? getVerticalById(vertical) : undefined;
  const marketProfile = market ? getMarketById(market) : undefined;

  return {
    scope,
    vertical,
    market,
    label: ruleset.label,
    description: ruleset.description,
    discoveryThresholds: verticalProfile?.discoveryThresholds,
    locales: marketProfile?.locales,
    overrides: {
      kpi: ruleset.kpiOverrides || {},
      formulas: ruleset.formulaOverrides || {},
      tokens: ruleset.tokenRelevanceOverrides || {},
      hooks: ruleset.hookOverrides || {},
      stopwords: ruleset.stopwordOverrides || [],
      recommendations: ruleset.recommendationOverrides || {},
    },
    version: ruleset.version || '1.0.0',
    seededAt: new Date().toISOString(),
  };
}

/**
 * Seed token relevance overrides
 */
async function seedTokenOverrides(
  ruleset: AsoBibleRuleSet,
  scope: string,
  vertical?: string,
  market?: string
): Promise<number> {
  if (!ruleset.tokenRelevanceOverrides || Object.keys(ruleset.tokenRelevanceOverrides).length === 0) {
    return 0;
  }

  const overrides = Object.entries(ruleset.tokenRelevanceOverrides).map(([token, relevance]) => ({
    scope,
    vertical: vertical || null,
    market: market || null,
    organization_id: null,
    token: token.toLowerCase().trim(),
    relevance,
    is_active: true,
    version: 1,
  }));

  const { error } = await supabase
    .from('aso_token_relevance_overrides')
    .insert(overrides);

  if (error) {
    console.error(`Error seeding token overrides:`, error);
    return 0;
  }

  return overrides.length;
}

/**
 * Seed hook pattern overrides
 */
async function seedHookOverrides(
  ruleset: AsoBibleRuleSet,
  scope: string,
  vertical?: string,
  market?: string
): Promise<number> {
  if (!ruleset.hookOverrides || Object.keys(ruleset.hookOverrides).length === 0) {
    return 0;
  }

  const overrides = Object.entries(ruleset.hookOverrides).map(([category, data]) => ({
    scope,
    vertical: vertical || null,
    market: market || null,
    organization_id: null,
    category,
    keywords: data.patterns || [],
    weight: data.weight || 1.0,
    is_active: true,
    version: 1,
  }));

  const { error} = await supabase
    .from('aso_hook_pattern_overrides')
    .insert(overrides);

  if (error) {
    console.error(`Error seeding hook overrides:`, error);
    return 0;
  }

  return overrides.length;
}

/**
 * Seed stopword overrides
 */
async function seedStopwordOverrides(
  ruleset: AsoBibleRuleSet,
  scope: string,
  vertical?: string,
  market?: string
): Promise<number> {
  if (!ruleset.stopwordOverrides || ruleset.stopwordOverrides.length === 0) {
    return 0;
  }

  const overrides = ruleset.stopwordOverrides.map((word) => ({
    scope,
    vertical: vertical || null,
    market: market || null,
    organization_id: null,
    word: word.toLowerCase().trim(),
    is_active: true,
    version: 1,
  }));

  const { error } = await supabase
    .from('aso_stopword_overrides')
    .insert(overrides);

  if (error) {
    console.error(`Error seeding stopword overrides:`, error);
    return 0;
  }

  return overrides.length;
}

async function upsertVerticalRecord(verticalId: string, ruleset: AsoBibleRuleSet) {
  const profile = getVerticalById(verticalId);
  const payload = {
    vertical: verticalId,
    label: ruleset.label || profile?.label || verticalId,
    description: ruleset.description || profile?.description || null,
    version: 1,
    is_active: true,
  };

  const { error } = await supabase
    .from('aso_ruleset_vertical')
    .upsert(payload, { onConflict: 'vertical,version' });

  if (error) {
    console.error(`Error upserting vertical metadata for ${verticalId}:`, error);
  }
}

async function upsertMarketRecord(marketId: string, ruleset: AsoBibleRuleSet) {
  const profile = getMarketById(marketId);
  const payload = {
    market: marketId,
    label: ruleset.label || profile?.label || marketId.toUpperCase(),
    description: ruleset.description || profile?.description || null,
    locale: profile?.locales?.[0] || marketId,
    version: 1,
    is_active: true,
  };

  const { error } = await supabase
    .from('aso_ruleset_market')
    .upsert(payload, { onConflict: 'market,version' });

  if (error) {
    console.error(`Error upserting market metadata for ${marketId}:`, error);
  }
}

/**
 * Seed KPI weight overrides
 */
async function seedKpiOverrides(
  ruleset: AsoBibleRuleSet,
  scope: string,
  vertical?: string,
  market?: string
): Promise<number> {
  if (!ruleset.kpiOverrides || Object.keys(ruleset.kpiOverrides).length === 0) {
    return 0;
  }

  const overrides = Object.entries(ruleset.kpiOverrides).map(([kpiName, data]: [string, any]) => ({
    scope,
    vertical: vertical || null,
    market: market || null,
    organization_id: null,
    kpi_id: kpiName,
    weight_multiplier: data.weight || 1.0,
    is_active: true,
    version: 1,
  }));

  const { error } = await supabase
    .from('aso_kpi_weight_overrides')
    .insert(overrides);

  if (error) {
    console.error(`Error seeding KPI overrides:`, error);
    return 0;
  }

  return overrides.length;
}

/**
 * Seed formula overrides
 */
async function seedFormulaOverrides(
  ruleset: AsoBibleRuleSet,
  scope: string,
  vertical?: string,
  market?: string
): Promise<number> {
  if (!ruleset.formulaOverrides || Object.keys(ruleset.formulaOverrides).length === 0) {
    return 0;
  }

  const overrides = Object.entries(ruleset.formulaOverrides).map(([component, multiplier]: [string, number]) => ({
    scope,
    vertical: vertical || null,
    market: market || null,
    organization_id: null,
    component,
    multiplier,
    component_weight: multiplier,
    is_active: true,
    version: 1,
  }));

  const { error } = await supabase
    .from('aso_formula_overrides')
    .insert(overrides);

  if (error) {
    console.error(`Error seeding formula overrides:`, error);
    return 0;
  }

  return overrides.length;
}

/**
 * Seed recommendation template overrides
 */
async function seedRecommendationOverrides(
  ruleset: AsoBibleRuleSet,
  scope: string,
  vertical?: string,
  market?: string
): Promise<number> {
  if (!ruleset.recommendationOverrides || Object.keys(ruleset.recommendationOverrides).length === 0) {
    return 0;
  }

  const overrides = Object.entries(ruleset.recommendationOverrides).map(([type, template]: [string, any]) => ({
    scope,
    vertical: vertical || null,
    market: market || null,
    organization_id: null,
    recommendation_type: type,
    message_template: typeof template === 'string' ? template : template.template || '',
    is_active: true,
    version: 1,
  }));

  const { error } = await supabase
    .from('aso_recommendation_template_overrides')
    .insert(overrides);

  if (error) {
    console.error(`Error seeding recommendation overrides:`, error);
    return 0;
  }

  return overrides.length;
}

/**
 * Seed a single ruleset
 */
async function seedRuleset(
  id: string,
  ruleset: AsoBibleRuleSet,
  scope: 'vertical' | 'market',
  vertical?: string,
  market?: string
): Promise<void> {
  console.log(`\n📦 Seeding ${scope}: ${id}`);

  // Check if ruleset already exists
  const exists = await rulesetExists(scope, vertical, market);
  if (exists) {
    console.log(`  ⏭️  Ruleset already exists, skipping`);
    return;
  }

  if (scope === 'vertical' && vertical) {
    await upsertVerticalRecord(vertical, ruleset);
  } else if (scope === 'market' && market) {
    await upsertMarketRecord(market, ruleset);
  }

  // Create version entry
  const versionCreated = await createVersionEntry(
    scope,
    vertical,
    market,
    undefined,
    buildRulesetSnapshot({
      scope,
      vertical,
      market,
      ruleset,
    })
  );

  if (!versionCreated) {
    console.log(`  ❌ Failed to create version entry`);
    return;
  }

  // Seed overrides
  const tokenCount = await seedTokenOverrides(ruleset, scope, vertical, market);
  const hookCount = await seedHookOverrides(ruleset, scope, vertical, market);
  const stopwordCount = await seedStopwordOverrides(ruleset, scope, vertical, market);
  const kpiCount = await seedKpiOverrides(ruleset, scope, vertical, market);
  const formulaCount = await seedFormulaOverrides(ruleset, scope, vertical, market);
  const recommendationCount = await seedRecommendationOverrides(ruleset, scope, vertical, market);

  console.log(`  ✅ Created ruleset with:`);
  console.log(`     - ${tokenCount} token overrides`);
  console.log(`     - ${hookCount} hook patterns`);
  console.log(`     - ${stopwordCount} stopwords`);
  console.log(`     - ${kpiCount} KPI weights`);
  console.log(`     - ${formulaCount} formula overrides`);
  console.log(`     - ${recommendationCount} recommendation templates`);
}

// ============================================================================
// Main Seeding Function
// ============================================================================

async function main() {
  console.log('🌱 ASO Bible Ruleset Seeding Script');
  console.log('====================================\n');

  let totalSeeded = 0;
  let totalSkipped = 0;

  // Seed vertical profiles
  console.log('📚 Seeding Vertical Profiles...');
  for (const { id, ruleset } of VERTICAL_RULESETS) {
    try {
      const exists = await rulesetExists('vertical', id);
      if (exists) {
        totalSkipped++;
      } else {
        await seedRuleset(id, ruleset, 'vertical', id);
        totalSeeded++;

        seededVerticals.push(id);
      }
    } catch (error) {
      console.error(`❌ Error seeding vertical ${id}:`, error);
    }
  }

  // Seed market profiles
  console.log('\n🌍 Seeding Market Profiles...');
  for (const { id, ruleset } of MARKET_RULESETS) {
    try {
      const exists = await rulesetExists('market', undefined, id);
      if (exists) {
        totalSkipped++;
      } else {
        await seedRuleset(id, ruleset, 'market', undefined, id);
        totalSeeded++;

        seededMarkets.push(id);
      }
    } catch (error) {
      console.error(`❌ Error seeding market ${id}:`, error);
    }
  }

  // Summary
  console.log('\n====================================');
  console.log('🎉 Seeding Complete!');
  console.log(`   ✅ Seeded: ${totalSeeded} rulesets`);
  console.log(`   ⏭️  Skipped: ${totalSkipped} rulesets (already exist)`);
  if (seededVerticals.length > 0) {
    console.log(`   • Verticals seeded: ${seededVerticals.join(', ')}`);
  }
  if (seededMarkets.length > 0) {
    console.log(`   • Markets seeded: ${seededMarkets.join(', ')}`);
  }
  console.log('====================================\n');

  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
