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
import type { ScrapedMetadata } from '../../src/types/aso';

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

export async function testFullAuditOutput(): Promise<boolean> {
  console.log('[TEST] Full Audit Output Structure & Determinism');

  try {
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

      console.log(`    ✓ Overall: ${result1.overallScore.toFixed(1)}, Title: ${result1.elements.title.score.toFixed(1)}, Subtitle: ${result1.elements.subtitle.score.toFixed(1)}`);
      console.log(`    ✓ Rules: ${titleRules.length}, Keywords: ${result1.keywordCoverage.totalUniqueKeywords}, Recommendations: ${result1.topRecommendations.length}`);
    }

    console.log(`\n  ✓ All audit outputs valid and deterministic`);
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
