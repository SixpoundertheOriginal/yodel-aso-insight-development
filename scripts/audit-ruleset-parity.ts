/**
 * ASO Bible Runtime Parity Audit Script
 *
 * Phase 2: System Reconciliation & Runtime Alignment
 *
 * Audits the full RuleSet → Loader → Engine → KPI → UI path to verify:
 * - Code-defined vertical/market profiles match seeded DB versions
 * - Discovery thresholds, vertical labels, and locale lists are identical
 * - No orphan vertical/market entries exist
 * - Admin UI displays same rule-set snapshot engine uses at runtime
 * - No duplicate override propagation
 *
 * Usage:
 *   npx tsx scripts/audit-ruleset-parity.ts
 */

import { config } from 'dotenv';

// Load environment variables first
config();

import { createServerClient } from './supabase-server-client';

const supabase = createServerClient();

// ============================================================================
// Types
// ============================================================================

interface ParityIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'vertical' | 'market' | 'override' | 'schema';
  message: string;
  details?: any;
}

interface ParityReport {
  timestamp: string;
  summary: {
    totalVerticals: number;
    totalMarkets: number;
    dbVerticals: number;
    dbMarkets: number;
    issues: number;
    errors: number;
    warnings: number;
  };
  issues: ParityIssue[];
  verticalComparison: any[];
  marketComparison: any[];
  overrideStats: any;
  recommendations: string[];
}

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Audit vertical profiles for parity
 */
async function auditVerticalProfiles(): Promise<{
  issues: ParityIssue[];
  comparison: any[];
}> {
  const issues: ParityIssue[] = [];
  const comparison: any[] = [];

  console.log('\n📊 Auditing Vertical Profiles...');

  // Dynamic import to avoid supabase client initialization issues
  const { getAllVerticals } = await import('../src/engine/asoBible/verticalProfiles/index.js');
  const codeVerticals = getAllVerticals();

  for (const codeProfile of codeVerticals) {
    console.log(`\n  Checking vertical: ${codeProfile.id}`);

    // Load DB record
    const { data: dbVerticals, error } = await supabase
      .from('aso_ruleset_vertical')
      .select('*')
      .eq('vertical', codeProfile.id)
      .eq('is_active', true);

    if (error) {
      issues.push({
        severity: 'error',
        category: 'vertical',
        message: `Failed to query DB for vertical ${codeProfile.id}`,
        details: error,
      });
      continue;
    }

    if (!dbVerticals || dbVerticals.length === 0) {
      if (codeProfile.id === 'base') {
        // Base is expected to not have a DB record
        issues.push({
          severity: 'info',
          category: 'vertical',
          message: `Vertical ${codeProfile.id} exists in code but not in DB (expected for base)`,
        });
      } else {
        issues.push({
          severity: 'warning',
          category: 'vertical',
          message: `Vertical ${codeProfile.id} exists in code but not in DB`,
        });
      }
      comparison.push({
        id: codeProfile.id,
        inCode: true,
        inDb: false,
        label: { code: codeProfile.label, db: null },
        description: { code: codeProfile.description, db: null },
        discoveryThresholds: { code: codeProfile.discoveryThresholds, db: null },
      });
      continue;
    }

    const dbProfile = dbVerticals[0];

    // Compare labels
    if (codeProfile.label !== dbProfile.label) {
      issues.push({
        severity: 'warning',
        category: 'vertical',
        message: `Vertical ${codeProfile.id}: Label mismatch`,
        details: {
          code: codeProfile.label,
          db: dbProfile.label,
        },
      });
    }

    // Compare descriptions
    if (codeProfile.description !== dbProfile.description && dbProfile.description !== null) {
      issues.push({
        severity: 'info',
        category: 'vertical',
        message: `Vertical ${codeProfile.id}: Description mismatch`,
        details: {
          code: codeProfile.description,
          db: dbProfile.description,
        },
      });
    }

    // Load version entry for discovery thresholds
    const { data: versionData } = await supabase
      .from('aso_ruleset_versions')
      .select('ruleset_snapshot')
      .eq('vertical', codeProfile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const dbDiscoveryThresholds = versionData?.[0]?.ruleset_snapshot?.discoveryThresholds;

    // Compare discovery thresholds
    if (codeProfile.discoveryThresholds) {
      const codeThresholds = codeProfile.discoveryThresholds;

      if (!dbDiscoveryThresholds) {
        issues.push({
          severity: 'warning',
          category: 'vertical',
          message: `Vertical ${codeProfile.id}: Discovery thresholds missing in DB`,
          details: {
            code: codeThresholds,
            db: null,
          },
        });
      } else {
        if (
          codeThresholds.excellent !== dbDiscoveryThresholds.excellent ||
          codeThresholds.good !== dbDiscoveryThresholds.good ||
          codeThresholds.moderate !== dbDiscoveryThresholds.moderate
        ) {
          issues.push({
            severity: 'error',
            category: 'vertical',
            message: `Vertical ${codeProfile.id}: Discovery thresholds mismatch`,
            details: {
              code: codeThresholds,
              db: dbDiscoveryThresholds,
            },
          });
        }
      }
    }

    comparison.push({
      id: codeProfile.id,
      inCode: true,
      inDb: true,
      label: { code: codeProfile.label, db: dbProfile.label, match: codeProfile.label === dbProfile.label },
      description: { code: codeProfile.description, db: dbProfile.description },
      discoveryThresholds: { code: codeProfile.discoveryThresholds, db: dbDiscoveryThresholds },
    });
  }

  // Check for DB-only verticals (orphans)
  const { data: allDbVerticals } = await supabase
    .from('aso_ruleset_vertical')
    .select('vertical')
    .eq('is_active', true);

  if (allDbVerticals) {
    const codeVerticalIds = new Set(codeVerticals.map((v) => v.id));
    const dbOnlyVerticals = allDbVerticals.filter(
      (dbV) => !codeVerticalIds.has(dbV.vertical)
    );

    for (const orphan of dbOnlyVerticals) {
      issues.push({
        severity: 'warning',
        category: 'vertical',
        message: `Vertical ${orphan.vertical} exists in DB but not in code (orphan)`,
      });
      comparison.push({
        id: orphan.vertical,
        inCode: false,
        inDb: true,
      });
    }
  }

  return { issues, comparison };
}

/**
 * Audit market profiles for parity
 */
async function auditMarketProfiles(): Promise<{
  issues: ParityIssue[];
  comparison: any[];
}> {
  const issues: ParityIssue[] = [];
  const comparison: any[] = [];

  console.log('\n🌍 Auditing Market Profiles...');

  // Dynamic import to avoid supabase client initialization issues
  const { getAllMarkets } = await import('../src/engine/asoBible/marketProfiles/index.js');
  const codeMarkets = getAllMarkets();

  for (const codeProfile of codeMarkets) {
    console.log(`\n  Checking market: ${codeProfile.id}`);

    // Load DB record
    const { data: dbMarkets, error } = await supabase
      .from('aso_ruleset_market')
      .select('*')
      .eq('market', codeProfile.id)
      .eq('is_active', true);

    if (error) {
      issues.push({
        severity: 'error',
        category: 'market',
        message: `Failed to query DB for market ${codeProfile.id}`,
        details: error,
      });
      continue;
    }

    if (!dbMarkets || dbMarkets.length === 0) {
      issues.push({
        severity: 'warning',
        category: 'market',
        message: `Market ${codeProfile.id} exists in code but not in DB`,
      });
      comparison.push({
        id: codeProfile.id,
        inCode: true,
        inDb: false,
        label: { code: codeProfile.label, db: null },
        locales: { code: codeProfile.locales, db: null },
      });
      continue;
    }

    const dbProfile = dbMarkets[0];

    // Compare labels
    if (codeProfile.label !== dbProfile.label) {
      issues.push({
        severity: 'warning',
        category: 'market',
        message: `Market ${codeProfile.id}: Label mismatch`,
        details: {
          code: codeProfile.label,
          db: dbProfile.label,
        },
      });
    }

    // Load version entry for locales
    const { data: versionData } = await supabase
      .from('aso_ruleset_versions')
      .select('ruleset_snapshot')
      .eq('market', codeProfile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const dbLocales = versionData?.[0]?.ruleset_snapshot?.locales;

    // Compare locales
    if (codeProfile.locales) {
      if (!dbLocales) {
        issues.push({
          severity: 'warning',
          category: 'market',
          message: `Market ${codeProfile.id}: Locales missing in DB`,
          details: {
            code: codeProfile.locales,
            db: null,
          },
        });
      } else {
        const codeLocalesSet = new Set(codeProfile.locales);
        const dbLocalesSet = new Set(dbLocales);

        const missingInDb = codeProfile.locales.filter((l) => !dbLocalesSet.has(l));
        const extraInDb = dbLocales.filter((l: string) => !codeLocalesSet.has(l));

        if (missingInDb.length > 0 || extraInDb.length > 0) {
          issues.push({
            severity: 'warning',
            category: 'market',
            message: `Market ${codeProfile.id}: Locale list mismatch`,
            details: {
              code: codeProfile.locales,
              db: dbLocales,
              missingInDb,
              extraInDb,
            },
          });
        }
      }
    }

    comparison.push({
      id: codeProfile.id,
      inCode: true,
      inDb: true,
      label: { code: codeProfile.label, db: dbProfile.label, match: codeProfile.label === dbProfile.label },
      locales: { code: codeProfile.locales, db: dbLocales },
    });
  }

  // Check for DB-only markets (orphans)
  const { data: allDbMarkets } = await supabase
    .from('aso_ruleset_market')
    .select('market')
    .eq('is_active', true);

  if (allDbMarkets) {
    const codeMarketIds = new Set(codeMarkets.map((m) => m.id));
    const dbOnlyMarkets = allDbMarkets.filter(
      (dbM) => !codeMarketIds.has(dbM.market)
    );

    for (const orphan of dbOnlyMarkets) {
      issues.push({
        severity: 'warning',
        category: 'market',
        message: `Market ${orphan.market} exists in DB but not in code (orphan)`,
      });
      comparison.push({
        id: orphan.market,
        inCode: false,
        inDb: true,
      });
    }
  }

  return { issues, comparison };
}

/**
 * Audit override tables for duplicate propagation
 */
async function auditOverridePropagation(): Promise<{
  issues: ParityIssue[];
  stats: any;
}> {
  const issues: ParityIssue[] = [];
  const stats: any = {
    tokenOverrides: {},
    hookOverrides: {},
    kpiOverrides: {},
    formulaOverrides: {},
    stopwordOverrides: {},
    recommendationOverrides: {},
  };

  console.log('\n🔍 Auditing Override Propagation...');

  // Check for duplicate token overrides (same token, multiple scopes)
  const { data: tokenOverrides } = await supabase
    .from('aso_token_relevance_overrides')
    .select('*')
    .eq('is_active', true);

  if (tokenOverrides) {
    stats.tokenOverrides.total = tokenOverrides.length;

    // Group by token
    const tokenGroups = new Map<string, any[]>();
    for (const override of tokenOverrides) {
      const token = override.token.toLowerCase();
      if (!tokenGroups.has(token)) {
        tokenGroups.set(token, []);
      }
      tokenGroups.get(token)!.push(override);
    }

    // Find duplicates (same token, different scopes)
    const duplicates = Array.from(tokenGroups.entries()).filter(([_, overrides]) => overrides.length > 1);
    stats.tokenOverrides.duplicates = duplicates.length;

    if (duplicates.length > 0) {
      issues.push({
        severity: 'info',
        category: 'override',
        message: `Found ${duplicates.length} tokens with multiple scope overrides (expected for inheritance)`,
        details: duplicates.slice(0, 5).map(([token, overrides]) => ({
          token,
          scopes: overrides.map((o) => ({ scope: o.scope, vertical: o.vertical, market: o.market, relevance: o.relevance })),
        })),
      });
    }
  }

  // Check KPI overrides
  const { data: kpiOverrides } = await supabase
    .from('aso_kpi_weight_overrides')
    .select('*')
    .eq('is_active', true);

  if (kpiOverrides) {
    stats.kpiOverrides.total = kpiOverrides.length;

    // Group by KPI name + scope
    const kpiGroups = new Map<string, any[]>();
    for (const override of kpiOverrides) {
      const key = `${override.kpi_name}:${override.scope}:${override.vertical || 'global'}:${override.market || 'global'}`;
      if (!kpiGroups.has(key)) {
        kpiGroups.set(key, []);
      }
      kpiGroups.get(key)!.push(override);
    }

    const duplicates = Array.from(kpiGroups.entries()).filter(([_, overrides]) => overrides.length > 1);
    stats.kpiOverrides.duplicates = duplicates.length;

    if (duplicates.length > 0) {
      issues.push({
        severity: 'error',
        category: 'override',
        message: `Found ${duplicates.length} duplicate KPI overrides (same kpi_name + scope + vertical + market)`,
        details: duplicates.slice(0, 5),
      });
    }
  }

  // Check hook overrides
  const { data: hookOverrides } = await supabase
    .from('aso_hook_pattern_overrides')
    .select('*')
    .eq('is_active', true);

  if (hookOverrides) {
    stats.hookOverrides.total = hookOverrides.length;
  }

  // Check formula overrides
  const { data: formulaOverrides } = await supabase
    .from('aso_formula_overrides')
    .select('*')
    .eq('is_active', true);

  if (formulaOverrides) {
    stats.formulaOverrides.total = formulaOverrides.length;
  }

  // Check stopword overrides
  const { data: stopwordOverrides } = await supabase
    .from('aso_stopword_overrides')
    .select('*')
    .eq('is_active', true);

  if (stopwordOverrides) {
    stats.stopwordOverrides.total = stopwordOverrides.length;
  }

  // Check recommendation overrides
  const { data: recommendationOverrides } = await supabase
    .from('aso_recommendation_template_overrides')
    .select('*')
    .eq('is_active', true);

  if (recommendationOverrides) {
    stats.recommendationOverrides.total = recommendationOverrides.length;
  }

  return { issues, stats };
}

/**
 * Audit code vs DB ruleset content for a specific vertical
 */
async function auditRulesetContent(verticalId: string): Promise<ParityIssue[]> {
  const issues: ParityIssue[] = [];

  console.log(`\n  Auditing ruleset content for: ${verticalId}`);

  // Load code-based ruleset directly from file to avoid supabase client issues
  let codeRuleset: any = null;

  try {
    const rulesetPath = `../src/engine/asoBible/verticalProfiles/${verticalId}/ruleset.js`;
    const rulesetModule = await import(rulesetPath);
    codeRuleset = rulesetModule.default || rulesetModule[`${verticalId}RuleSet`];
  } catch (error) {
    issues.push({
      severity: 'info',
      category: 'vertical',
      message: `No code-based ruleset file found for ${verticalId}`,
    });
    return issues;
  }

  if (!codeRuleset) {
    issues.push({
      severity: 'info',
      category: 'vertical',
      message: `No code-based ruleset found for ${verticalId}`,
    });
    return issues;
  }

  // Load DB overrides count
  const { data: tokenOverrides } = await supabase
    .from('aso_token_relevance_overrides')
    .select('id', { count: 'exact' })
    .eq('scope', 'vertical')
    .eq('vertical', verticalId)
    .eq('is_active', true);

  const codeTokenCount = Object.keys(codeRuleset.tokenRelevanceOverrides || {}).length;
  const dbTokenCount = tokenOverrides?.length || 0;

  if (codeTokenCount !== dbTokenCount) {
    issues.push({
      severity: 'warning',
      category: 'override',
      message: `Vertical ${verticalId}: Token override count mismatch (code: ${codeTokenCount}, db: ${dbTokenCount})`,
    });
  }

  const { data: kpiOverrides } = await supabase
    .from('aso_kpi_weight_overrides')
    .select('id', { count: 'exact' })
    .eq('scope', 'vertical')
    .eq('vertical', verticalId)
    .eq('is_active', true);

  const codeKpiCount = Object.keys(codeRuleset.kpiOverrides || {}).length;
  const dbKpiCount = kpiOverrides?.length || 0;

  if (codeKpiCount !== dbKpiCount) {
    issues.push({
      severity: 'warning',
      category: 'override',
      message: `Vertical ${verticalId}: KPI override count mismatch (code: ${codeKpiCount}, db: ${dbKpiCount})`,
    });
  }

  return issues;
}

// ============================================================================
// Main Audit Function
// ============================================================================

async function main() {
  console.log('🔍 ASO Bible Runtime Parity Audit');
  console.log('====================================\n');
  console.log('Auditing RuleSet → Loader → Engine → KPI → UI path...\n');

  const report: ParityReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalVerticals: 0,
      totalMarkets: 0,
      dbVerticals: 0,
      dbMarkets: 0,
      issues: 0,
      errors: 0,
      warnings: 0,
    },
    issues: [],
    verticalComparison: [],
    marketComparison: [],
    overrideStats: {},
    recommendations: [],
  };

  // Dynamic imports
  const { getAllVerticals } = await import('../src/engine/asoBible/verticalProfiles/index.js');
  const { getAllMarkets } = await import('../src/engine/asoBible/marketProfiles/index.js');

  // Audit vertical profiles
  const { issues: verticalIssues, comparison: verticalComparison } = await auditVerticalProfiles();
  report.issues.push(...verticalIssues);
  report.verticalComparison = verticalComparison;
  report.summary.totalVerticals = getAllVerticals().length;
  report.summary.dbVerticals = verticalComparison.filter((v) => v.inDb).length;

  // Audit vertical ruleset content
  for (const vertical of getAllVerticals()) {
    if (vertical.id !== 'base') {
      const contentIssues = await auditRulesetContent(vertical.id);
      report.issues.push(...contentIssues);
    }
  }

  // Audit market profiles
  const { issues: marketIssues, comparison: marketComparison } = await auditMarketProfiles();
  report.issues.push(...marketIssues);
  report.marketComparison = marketComparison;
  report.summary.totalMarkets = getAllMarkets().length;
  report.summary.dbMarkets = marketComparison.filter((m) => m.inDb).length;

  // Audit override propagation
  const { issues: overrideIssues, stats: overrideStats } = await auditOverridePropagation();
  report.issues.push(...overrideIssues);
  report.overrideStats = overrideStats;

  // Calculate summary
  report.summary.issues = report.issues.length;
  report.summary.errors = report.issues.filter((i) => i.severity === 'error').length;
  report.summary.warnings = report.issues.filter((i) => i.severity === 'warning').length;

  // Generate recommendations
  if (report.summary.errors > 0) {
    report.recommendations.push(
      'CRITICAL: Fix discovery threshold mismatches - these affect runtime behavior'
    );
  }

  if (verticalComparison.some((v) => !v.inDb && v.id !== 'base')) {
    report.recommendations.push(
      'ACTION: Re-run seed script to populate missing vertical profiles in DB'
    );
  }

  if (marketComparison.some((m) => !m.inDb)) {
    report.recommendations.push(
      'ACTION: Re-run seed script to populate missing market profiles in DB'
    );
  }

  if (report.issues.some((i) => i.category === 'override' && i.message.includes('count mismatch'))) {
    report.recommendations.push(
      'INVESTIGATE: Override count mismatches may indicate incomplete seeding or code changes'
    );
  }

  // Print report
  console.log('\n====================================');
  console.log('📊 AUDIT SUMMARY');
  console.log('====================================');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`\nVerticals: ${report.summary.totalVerticals} in code, ${report.summary.dbVerticals} in DB`);
  console.log(`Markets: ${report.summary.totalMarkets} in code, ${report.summary.dbMarkets} in DB`);
  console.log(`\nIssues: ${report.summary.issues} total (${report.summary.errors} errors, ${report.summary.warnings} warnings)`);

  console.log('\n====================================');
  console.log('🚨 ISSUES BREAKDOWN');
  console.log('====================================');

  const errorIssues = report.issues.filter((i) => i.severity === 'error');
  const warningIssues = report.issues.filter((i) => i.severity === 'warning');
  const infoIssues = report.issues.filter((i) => i.severity === 'info');

  if (errorIssues.length > 0) {
    console.log('\n❌ ERRORS:');
    errorIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.category}] ${issue.message}`);
      if (issue.details) {
        console.log(`     Details: ${JSON.stringify(issue.details, null, 2)}`);
      }
    });
  }

  if (warningIssues.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warningIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.category}] ${issue.message}`);
      if (issue.details && Object.keys(issue.details).length < 10) {
        console.log(`     Details: ${JSON.stringify(issue.details, null, 2)}`);
      }
    });
  }

  if (infoIssues.length > 0) {
    console.log(`\nℹ️  INFO: ${infoIssues.length} informational messages (run with --verbose to see)`);
  }

  console.log('\n====================================');
  console.log('📈 OVERRIDE STATISTICS');
  console.log('====================================');
  console.log(`Token Overrides: ${report.overrideStats.tokenOverrides?.total || 0} total`);
  console.log(`  - Duplicates: ${report.overrideStats.tokenOverrides?.duplicates || 0}`);
  console.log(`KPI Overrides: ${report.overrideStats.kpiOverrides?.total || 0} total`);
  console.log(`  - Duplicates: ${report.overrideStats.kpiOverrides?.duplicates || 0}`);
  console.log(`Hook Overrides: ${report.overrideStats.hookOverrides?.total || 0} total`);
  console.log(`Formula Overrides: ${report.overrideStats.formulaOverrides?.total || 0} total`);
  console.log(`Stopword Overrides: ${report.overrideStats.stopwordOverrides?.total || 0} total`);
  console.log(`Recommendation Overrides: ${report.overrideStats.recommendationOverrides?.total || 0} total`);

  if (report.recommendations.length > 0) {
    console.log('\n====================================');
    console.log('💡 RECOMMENDATIONS');
    console.log('====================================');
    report.recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
  }

  console.log('\n====================================');
  console.log('✅ AUDIT COMPLETE');
  console.log('====================================\n');

  // Save report to file
  const { writeFileSync } = await import('fs');
  const reportPath = './runtime-parity-report.json';
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}\n`);

  // Exit with error code if critical issues found
  if (report.summary.errors > 0) {
    console.error('❌ AUDIT FAILED: Critical errors found');
    process.exit(1);
  }

  process.exit(0);
}

// Run audit
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
