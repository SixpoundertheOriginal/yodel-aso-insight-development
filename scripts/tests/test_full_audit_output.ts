/**
 * ASO Bible Test: Full Audit Output
 *
 * Tests complete audit output structure and determinism.
 *
 * Flow:
 * 1. Run full audit multiple times
 * 2. Verify output structure is consistent
 * 3. Verify scores are deterministic (within tolerance)
 * 4. Verify all components present (elements, rules, KPIs, recommendations)
 * 5. Test with various app types
 */

import { MetadataAuditEngine } from '../../src/engine/metadata/metadataAuditEngine';
import { KpiEngine } from '../../src/engine/metadata/kpi/kpiEngine';
import type { ScrapedMetadata } from '../../src/types/aso';
import type { UnifiedMetadataAuditResult } from '../../src/components/AppAudit/UnifiedMetadataAuditModule/types';
import { validateCompetitorAudit } from '../../src/services/competitor-audit.validator';
import type { AuditCompetitorResult } from '../../src/services/competitor-audit.service';
import { compareWithCompetitors } from '../../src/services/competitor-comparison.service';
import { supabase } from '../../src/integrations/supabase/client';

const TEST_APPS: ScrapedMetadata[] = [
  {
    appId: 'test_audit_edu',
    name: 'Duolingo',
    title: 'Duolingo - Language Lessons',
    subtitle: 'Learn Spanish, French & More',
    description: 'Learn languages for free with fun, bite-sized lessons. Practice speaking, reading, listening, and writing to build your vocabulary and grammar skills.',
    applicationCategory: 'Education',
    platform: 'ios'
  },
  {
    appId: 'test_audit_health',
    name: 'MyFitnessPal',
    title: 'MyFitnessPal: Calorie Counter',
    subtitle: 'Diet & Fitness Tracker',
    description: 'Track calories, break down ingredients, and log activities with MyFitnessPal. With one of the largest food databases and fastest barcode scanners, tracking your nutrition has never been easier.',
    applicationCategory: 'Health & Fitness',
    platform: 'ios'
  },
  {
    appId: 'test_audit_productivity',
    name: 'Notion',
    title: 'Notion - Notes, Tasks, Wikis',
    subtitle: 'All-in-One Workspace',
    description: 'Notion is your all-in-one workspace for notes, tasks, wikis, and databases. Organize your work and life, beautifully.',
    applicationCategory: 'Productivity',
    platform: 'ios'
  }
];

const supabaseAny = supabase as any;
supabaseAny.from = () => {
  const builder: any = {
    update: () => builder,
    insert: async () => ({ error: null }),
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: null, error: null }),
  };
  return builder;
};
supabaseAny.rpc = async () => ({ data: null, error: null });

export async function testFullAuditOutput(): Promise<boolean> {
  console.log('[TEST] Full Audit Output Structure & Determinism');

  try {
    const auditOutputs: UnifiedMetadataAuditResult[] = [];
    for (const testApp of TEST_APPS) {
      console.log(`\n  Testing: ${testApp.name}`);

      // Run audit twice
      const result1 = await MetadataAuditEngine.evaluate(testApp);
      const result2 = await MetadataAuditEngine.evaluate(testApp);

      // Verify structure
      if (!result1.overallScore || !result1.elements || !result1.keywordCoverage) {
        console.log(`    ✗ Missing required fields in audit result`);
        return false;
      }

      // Verify determinism (scores should match within ±1)
      if (Math.abs(result1.overallScore - result2.overallScore) > 1) {
        console.log(`    ✗ Non-deterministic scores: ${result1.overallScore} vs ${result2.overallScore}`);
        return false;
      }

      // Verify all elements present
      const elements = ['title', 'subtitle', 'description'];
      for (const element of elements) {
        if (!result1.elements[element as keyof typeof result1.elements]) {
          console.log(`    ✗ Missing element: ${element}`);
          return false;
        }
      }

      // Verify rules executed
      const titleRules = result1.elements.title.ruleResults;
      if (!titleRules || titleRules.length === 0) {
        console.log(`    ✗ No title rules executed`);
        return false;
      }

      // Verify recommendations generated
      if (!result1.topRecommendations || result1.topRecommendations.length === 0) {
        console.log(`    ✗ No recommendations generated`);
        return false;
      }

      if (!result1.intentCoverage?.diagnostics) {
        console.log('    ✗ Intent diagnostics missing from audit result');
        return false;
      }

      if (!result1.intentCoverage?.ancestry) {
        console.log('    ✗ Intent ancestry metadata missing from audit result');
        return false;
      }

      const hasRuleAncestry = result1.elements.title.ruleResults.every(
        rule => !!rule.ancestry?.scope
      );
      if (!hasRuleAncestry) {
        console.log('    ✗ Rule ancestry metadata missing');
        return false;
      }

      if (!result1.comboCoverage?.stats || result1.comboCoverage.stats.coveragePct === undefined) {
        console.log('    ✗ Combo coverage stats missing from audit result');
        return false;
      }

      if (!result1.ruleSetDiagnostics) {
        console.log('    ✗ Rule set diagnostics missing from audit result');
        return false;
      }

      if (!result1.ruleSetDiagnostics.discoveryThresholdSource) {
        console.log('    ✗ Rule set diagnostics missing threshold source metadata');
        return false;
      }

      console.log(`    ✓ Intent diagnostics patterns: ${result1.intentCoverage.diagnostics.patternCount}`);
      console.log(`    ✓ Intent ancestry scope: ${result1.intentCoverage.ancestry.scope}`);
      console.log(`    ✓ Combo coverage: ${result1.comboCoverage.stats.coveragePct}% (${result1.comboCoverage.stats.existing}/${result1.comboCoverage.stats.total})`);
      console.log(`    ✓ Leak warnings: ${result1.ruleSetDiagnostics.leakWarnings?.length || 0}`);
      const intentAlignment = result1.kpiResult?.kpis?.intent_alignment_score;
      if (!intentAlignment?.provenance || intentAlignment.provenance.length === 0) {
        console.log('    ✗ KPI provenance missing for intent_alignment');
        return false;
      }

      if (result1.intentCoverage?.diagnostics?.fallbackMode) {
        const intentQuality = result1.kpiResult?.kpis?.intent_quality_score;
        if (!intentQuality || intentQuality.normalized < 50) {
          console.log('    ✗ Intent fallback damping not enforced on intent_quality_score');
          return false;
        }
      }

      console.log(`    ✓ Overall: ${result1.overallScore.toFixed(1)}, Title: ${result1.elements.title.score.toFixed(1)}, Subtitle: ${result1.elements.subtitle.score.toFixed(1)}`);
      console.log(`    ✓ Rules: ${titleRules.length}, Keywords: ${result1.keywordCoverage.totalUniqueKeywords}, Recommendations: ${result1.topRecommendations.length}`);

      auditOutputs.push(result1);
    }

    const invalidAudit = {
      auditId: 'invalid',
      competitorId: 'invalid',
      metadata: {} as any,
      auditData: {} as any,
      audit: { comboCoverage: {}, intentCoverage: {}, kpiResult: null } as any,
      overallScore: 0,
      cached: true,
    } as AuditCompetitorResult;
    const validatorResult = validateCompetitorAudit(invalidAudit);
    if (validatorResult) {
      console.log('  ✗ Validator failed to reject incomplete audit');
      return false;
    }
    console.log('  ✓ Competitor audit validator filters incomplete audits');

    if (auditOutputs.length >= 2) {
      const targetAudit = auditOutputs[0];
      targetAudit.intentCoverage = targetAudit.intentCoverage || ({} as any);
      targetAudit.intentCoverage.diagnostics = targetAudit.intentCoverage.diagnostics || {
        fallbackMode: false,
        ttlSeconds: 0,
        patternCount: 0,
      };
      targetAudit.intentCoverage.diagnostics.fallbackMode = true;

      const competitorAudits: AuditCompetitorResult[] = auditOutputs.slice(1).map((audit, index) => ({
        auditId: `cmp-${index}`,
        competitorId: `cmp-${index}`,
        metadata: { name: `Competitor ${index}`, description: '', subtitle: '' } as any,
        auditData: audit,
        audit,
        overallScore: audit.overallScore,
        cached: true,
        snapshotCreatedAt: new Date().toISOString(),
      }));

      const comparison = await compareWithCompetitors({
        targetAppId: 'target-app',
        targetAudit,
        competitorAudits,
        organizationId: 'org-test',
        comparisonType: '1-to-many',
        targetMetadata: {
          title: 'Target App',
          subtitle: 'Target Subtitle',
          description: 'Target description',
        },
      });

      if (
        comparison.intentGap.gaps.informational !== 0 ||
        comparison.intentGap.gaps.commercial !== 0 ||
        comparison.intentGap.gaps.transactional !== 0 ||
        comparison.intentGap.gaps.navigational !== 0
      ) {
        console.log('  ✗ Fallback neutralization failed to zero intent gaps');
        return false;
      }

      if (!comparison.discoveryFootprint.telemetry) {
        console.log('  ✗ Discovery footprint telemetry missing');
        return false;
      }

      if (!comparison.telemetry.fallbackAppIds.includes('target-app')) {
        console.log('  ✗ Telemetry missing fallback annotations');
        return false;
      }

      console.log('  ✓ Fallback-aware comparison neutralized intent deltas');
    }

    console.log(`\n  ✓ All audit outputs valid and deterministic`);

    const kpiOverrideTest = KpiEngine.evaluate({
      title: 'Test Title',
      subtitle: 'Test Subtitle',
      locale: 'en-US',
      platform: 'ios',
      tokensTitle: ['test'],
      tokensSubtitle: ['test'],
      comboCoverage: {
        totalCombos: 0,
        titleCombos: [],
        subtitleNewCombos: [],
        allCombinedCombos: [],
        stats: {
          total: 0,
          existing: 0,
          missing: 0,
          coveragePct: 0,
        },
      },
      activeRuleSet: {
        kpiOverrides: {
          intent_alignment_score: { weight: 1.5 },
        },
        inheritanceChain: {
          base: { id: 'base', kpiOverrides: {} },
          vertical: { id: 'test_vertical', kpiOverrides: { intent_alignment_score: { weight: 1.5 } } },
        },
      },
    });

    const overrideKpi = kpiOverrideTest.kpis.intent_alignment_score;
    if (!overrideKpi || overrideKpi.overrideMultiplier !== 1.5) {
      console.log('  ✗ KpiEngine failed to apply override multiplier correctly');
      return false;
    }

    return true;

  } catch (error) {
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFullAuditOutput().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
