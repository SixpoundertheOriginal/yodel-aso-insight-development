/**
 * Fix Ruleset Parity Issues
 *
 * Phase 2: System Reconciliation & Runtime Alignment
 *
 * Fixes critical misalignments found in parity audit:
 * 1. Discovery thresholds missing in DB version snapshots
 * 2. KPI overrides not seeded from code rulesets
 * 3. Locale lists missing in DB version snapshots
 * 4. Label inconsistencies between code and DB
 *
 * Usage:
 *   npx tsx scripts/fix-ruleset-parity-issues.ts
 */

import { config } from 'dotenv';

// Load environment variables first
config();

import { createServerClient } from './supabase-server-client';

const supabase = createServerClient();

// ============================================================================
// Fix Functions
// ============================================================================

/**
 * Update version snapshots with discovery thresholds
 */
async function fixDiscoveryThresholds() {
  console.log('\n🔧 Fixing Discovery Thresholds in DB...');

  const { getAllVerticals } = await import('../src/engine/asoBible/verticalProfiles/index.js');
  const verticals = getAllVerticals();

  for (const vertical of verticals) {
    if (!vertical.discoveryThresholds) continue;

    console.log(`  Updating ${vertical.id}...`);

    // Get existing version snapshot (don't filter by is_active)
    const { data: versionData, error: versionError } = await supabase
      .from('aso_ruleset_versions')
      .select('*')
      .eq('vertical', vertical.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (versionError) {
      console.log(`    ❌ Error querying versions: ${versionError.message}`);
      continue;
    }

    if (!versionData || versionData.length === 0) {
      console.log(`    ⚠️  No version entry found`);
      continue;
    }

    const version = versionData[0];
    const snapshot = version.ruleset_snapshot || {};

    // Update snapshot with discovery thresholds
    const updatedSnapshot = {
      ...snapshot,
      discoveryThresholds: vertical.discoveryThresholds,
    };

    // Update version entry
    const { error } = await supabase
      .from('aso_ruleset_versions')
      .update({ ruleset_snapshot: updatedSnapshot })
      .eq('id', version.id);

    if (error) {
      console.log(`    ❌ Error: ${error.message}`);
    } else {
      console.log(`    ✅ Updated`);
    }
  }
}

/**
 * Update version snapshots with locale lists
 */
async function fixLocaleLists() {
  console.log('\n🌍 Fixing Locale Lists in DB...');

  const { getAllMarkets } = await import('../src/engine/asoBible/marketProfiles/index.js');
  const markets = getAllMarkets();

  for (const market of markets) {
    if (!market.locales) continue;

    console.log(`  Updating ${market.id}...`);

    // Get existing version snapshot (don't filter by is_active)
    const { data: versionData, error: versionError } = await supabase
      .from('aso_ruleset_versions')
      .select('*')
      .eq('market', market.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (versionError) {
      console.log(`    ❌ Error querying versions: ${versionError.message}`);
      continue;
    }

    if (!versionData || versionData.length === 0) {
      console.log(`    ⚠️  No version entry found`);
      continue;
    }

    const version = versionData[0];
    const snapshot = version.ruleset_snapshot || {};

    // Update snapshot with locales
    const updatedSnapshot = {
      ...snapshot,
      locales: market.locales,
    };

    // Update version entry
    const { error } = await supabase
      .from('aso_ruleset_versions')
      .update({ ruleset_snapshot: updatedSnapshot })
      .eq('id', version.id);

    if (error) {
      console.log(`    ❌ Error: ${error.message}`);
    } else {
      console.log(`    ✅ Updated`);
    }
  }
}

/**
 * Seed missing KPI overrides
 */
async function fixKpiOverrides() {
  console.log('\n📊 Seeding Missing KPI Overrides...');

  const verticals = [
    'language_learning',
    'rewards',
    'finance',
    'dating',
    'productivity',
    'health',
    'entertainment',
  ];

  let totalSeeded = 0;

  for (const verticalId of verticals) {
    console.log(`  Processing ${verticalId}...`);

    // Load code-based ruleset
    let codeRuleset: any = null;
    try {
      const rulesetPath = `../src/engine/asoBible/verticalProfiles/${verticalId}/ruleset.js`;
      const rulesetModule = await import(rulesetPath);
      codeRuleset = rulesetModule.default || rulesetModule[`${verticalId}RuleSet`];
    } catch (error) {
      console.log(`    ⚠️  No ruleset file found`);
      continue;
    }

    if (!codeRuleset?.kpiOverrides) {
      console.log(`    ℹ️  No KPI overrides in code`);
      continue;
    }

    // Convert to DB format
    const overrides = Object.entries(codeRuleset.kpiOverrides).map(
      ([kpiName, data]: [string, any]) => ({
        scope: 'vertical',
        vertical: verticalId,
        market: null,
        organization_id: null,
        kpi_id: kpiName,
        weight_multiplier: data.weight || 1.0,
        is_active: true,
        version: 1,
      })
    );

    if (overrides.length === 0) {
      console.log(`    ℹ️  No KPI overrides to seed`);
      continue;
    }

    // Insert (upsert to handle duplicates)
    const { error } = await supabase
      .from('aso_kpi_weight_overrides')
      .upsert(overrides, {
        onConflict: 'scope,vertical,market,organization_id,kpi_id',
      });

    if (error) {
      console.log(`    ❌ Error: ${error.message}`);
    } else {
      console.log(`    ✅ Seeded ${overrides.length} KPI overrides`);
      totalSeeded += overrides.length;
    }
  }

  console.log(`  Total KPI overrides seeded: ${totalSeeded}`);
}

/**
 * Fix label mismatches (optional - makes code source of truth)
 */
async function fixLabelMismatches(applyFix: boolean = false) {
  if (!applyFix) {
    console.log('\n📝 Label Mismatches (skipping fix - set applyFix=true to apply)');
    return;
  }

  console.log('\n📝 Fixing Label Mismatches...');

  const { getAllVerticals } = await import('../src/engine/asoBible/verticalProfiles/index.js');
  const { getAllMarkets } = await import('../src/engine/asoBible/marketProfiles/index.js');

  // Fix vertical labels
  for (const vertical of getAllVerticals()) {
    const { error } = await supabase
      .from('aso_ruleset_vertical')
      .update({ label: vertical.label })
      .eq('vertical', vertical.id);

    if (error) {
      console.log(`  ❌ Error updating ${vertical.id}: ${error.message}`);
    } else {
      console.log(`  ✅ Updated vertical label: ${vertical.id}`);
    }
  }

  // Fix market labels
  for (const market of getAllMarkets()) {
    const { error } = await supabase
      .from('aso_ruleset_market')
      .update({ label: market.label })
      .eq('market', market.id);

    if (error) {
      console.log(`  ❌ Error updating ${market.id}: ${error.message}`);
    } else {
      console.log(`  ✅ Updated market label: ${market.id}`);
    }
  }
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  console.log('🔧 Ruleset Parity Issue Fixer');
  console.log('====================================\n');
  console.log('Fixing misalignments between code and DB...\n');

  try {
    // Fix critical issues first
    await fixDiscoveryThresholds();
    await fixLocaleLists();
    await fixKpiOverrides();

    // Optional: Fix label mismatches (cosmetic)
    // Uncomment the following line to make code labels the source of truth
    // await fixLabelMismatches(true);

    console.log('\n====================================');
    console.log('✅ FIXES COMPLETE');
    console.log('====================================\n');
    console.log('Run audit script again to verify fixes:\n');
    console.log('  npx tsx scripts/audit-ruleset-parity.ts\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the fixer
main();
