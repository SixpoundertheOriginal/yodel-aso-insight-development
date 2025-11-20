#!/usr/bin/env tsx
/**
 * DOM Subtitle Extraction - Staging End-to-End Test
 *
 * Tests DOM-based subtitle extraction with feature flag enabled.
 *
 * **Purpose:**
 * - Validate DOM extraction works correctly in staging
 * - Capture telemetry (subtitle, subtitle_source, selector)
 * - Compare DOM extraction vs fallback behavior
 * - Generate comprehensive JSON report
 *
 * **Usage:**
 *   npx tsx scripts/test-dom-extraction-staging.ts
 *
 * **Output:**
 *   /tmp/dom-extraction-staging-report.json
 *
 * **Safety:**
 *   - Staging only (ENABLE_DOM_SUBTITLE_EXTRACTION must be true)
 *   - No production modifications
 *   - Read-only operations
 *   - Generates report for review
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { AppStoreWebAdapter } from '../src/services/metadata-adapters/appstore-web.adapter';
import { ENABLE_DOM_SUBTITLE_EXTRACTION } from '../src/config/metadataFeatureFlags';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Test apps with known App Store IDs
 */
const TEST_APPS = [
  { name: 'Instagram', appId: '389801252', hasSubtitle: true },
  { name: 'Spotify', appId: '324684580', hasSubtitle: true },
  { name: 'YouTube', appId: '544007664', hasSubtitle: true },
  { name: 'Netflix', appId: '363590051', hasSubtitle: true },
  { name: 'Uber', appId: '368677368', hasSubtitle: true },
  { name: 'Revolut', appId: '932493382', hasSubtitle: true },
  { name: 'Duolingo', appId: '570060128', hasSubtitle: true },
  { name: 'Calm', appId: '571800810', hasSubtitle: true },
  { name: 'Headspace', appId: '493145008', hasSubtitle: true },
  { name: 'Airbnb', appId: '401626263', hasSubtitle: true },
  { name: 'Amazon', appId: '297606951', hasSubtitle: true },
  { name: 'Slack', appId: '618783545', hasSubtitle: true },
  { name: 'TikTok', appId: '835599320', hasSubtitle: true },
  { name: 'Notion', appId: '1232780281', hasSubtitle: true },
  { name: 'Disney+', appId: '1446075923', hasSubtitle: true },
  { name: 'Strava', appId: '426826309', hasSubtitle: true },
  { name: 'Google Maps', appId: '585027354', hasSubtitle: true },
  { name: 'Uber Eats', appId: '1058959277', hasSubtitle: true },
  { name: 'Zoom', appId: '546505307', hasSubtitle: true },
  { name: 'Pimsleur', appId: '391349485', hasSubtitle: false }, // Known to have no subtitle
];

/**
 * Test result for a single app
 */
interface TestResult {
  appName: string;
  appId: string;
  expectedSubtitle: boolean;

  // DOM extraction results
  domSubtitle: string | null;
  subtitleSource: 'dom' | 'fallback' | 'none';
  domSelector: string | null;
  domSuccess: boolean;

  // Fallback simulation results
  fallbackSubtitle: string | null;
  fallbackSelector: string | null;
  fallbackSuccess: boolean;

  // Comparison
  match: boolean;
  improved: boolean;
  degraded: boolean;

  // Metadata
  htmlSize: number;
  latency: number;
  error: string | null;
}

/**
 * Summary statistics
 */
interface TestSummary {
  totalApps: number;
  domSuccessCount: number;
  domSuccessRate: number;
  fallbackSuccessCount: number;
  fallbackSuccessRate: number;

  sourceBreakdown: {
    dom: number;
    fallback: number;
    none: number;
  };

  comparisonBreakdown: {
    match: number;
    improved: number;
    degraded: number;
    domOnly: number;
    fallbackOnly: number;
    neither: number;
  };

  averageLatency: number;
  errors: number;
}

/**
 * Full report structure
 */
interface StagingReport {
  metadata: {
    timestamp: string;
    featureFlagEnabled: boolean;
    testApps: number;
    outputPath: string;
  };
  summary: TestSummary;
  results: TestResult[];
  recommendations: string[];
}

/**
 * Extract subtitle using fallback selectors (simulates old behavior)
 */
function extractSubtitleFallback($: cheerio.CheerioAPI): {
  subtitle: string | null;
  selector: string | null;
} {
  const fallbackSelectors = [
    '.product-header__subtitle',
    'h2.product-header__subtitle',
    '[data-test-subtitle]',
    '[data-test="subtitle"]',
    '.app-header__subtitle',
    'p.subtitle',
    'h2.subtitle',
    'header h1 + h2',
  ];

  for (const selector of fallbackSelectors) {
    const element = $(selector).first();
    if (element && element.length > 0) {
      const subtitle = element.text().trim();
      if (subtitle.length > 0) {
        return { subtitle, selector };
      }
    }
  }

  return { subtitle: null, selector: null };
}

/**
 * Test a single app
 */
async function testApp(
  adapter: AppStoreWebAdapter,
  appName: string,
  appId: string,
  expectedSubtitle: boolean
): Promise<TestResult> {
  const startTime = Date.now();

  const result: TestResult = {
    appName,
    appId,
    expectedSubtitle,
    domSubtitle: null,
    subtitleSource: 'none',
    domSelector: null,
    domSuccess: false,
    fallbackSubtitle: null,
    fallbackSelector: null,
    fallbackSuccess: false,
    match: false,
    improved: false,
    degraded: false,
    htmlSize: 0,
    latency: 0,
    error: null,
  };

  try {
    console.log(`\n${colors.bright}[Testing]${colors.reset} ${colors.cyan}${appName}${colors.reset} (${appId})`);

    // Check if we have hydrated HTML cached
    const hydratedPath = `/tmp/appstore-tests/${appName.toLowerCase().replace(/\+/g, '-plus').replace(/\s+/g, '-')}-hydrated.html`;

    let html: string;
    if (fs.existsSync(hydratedPath)) {
      console.log(`  ${colors.dim}Using cached hydrated HTML: ${path.basename(hydratedPath)}${colors.reset}`);
      html = fs.readFileSync(hydratedPath, 'utf-8');
    } else {
      console.log(`  ${colors.yellow}⚠ No hydrated HTML found, skipping (run fetch-appstore-hydrated.ts first)${colors.reset}`);
      result.error = 'No hydrated HTML available';
      result.latency = Date.now() - startTime;
      return result;
    }

    result.htmlSize = Buffer.byteLength(html, 'utf-8');

    // Parse HTML
    const $ = cheerio.load(html);

    // Extract subtitle using DOM method (with feature flag enabled)
    const rawMetadata = {
      source: 'appstore-web',
      timestamp: new Date(),
      data: html,
      headers: { 'content-type': 'text/html' },
      statusCode: 200,
    };

    const metadata = adapter.transform(rawMetadata);
    result.domSubtitle = metadata.subtitle || null;
    result.domSuccess = result.domSubtitle !== null && result.domSubtitle.length > 0;
    result.subtitleSource = adapter.getSubtitleSource();

    // Determine which selector was used (simulate from logs)
    if (result.domSuccess) {
      if (result.subtitleSource === 'dom') {
        result.domSelector = 'h2.subtitle';
      } else {
        // Find which fallback selector worked
        const fallback = extractSubtitleFallback($);
        result.domSelector = fallback.selector;
      }
    }

    // Extract subtitle using fallback method (simulates old behavior)
    const fallbackResult = extractSubtitleFallback($);
    result.fallbackSubtitle = fallbackResult.subtitle;
    result.fallbackSelector = fallbackResult.selector;
    result.fallbackSuccess = result.fallbackSubtitle !== null;

    // Comparison
    result.match = result.domSubtitle === result.fallbackSubtitle;
    result.improved = result.domSuccess && !result.fallbackSuccess;
    result.degraded = !result.domSuccess && result.fallbackSuccess;

    result.latency = Date.now() - startTime;

    // Log results
    console.log(`  ${colors.green}DOM:${colors.reset}      ${result.domSubtitle || colors.dim + 'NONE' + colors.reset}`);
    console.log(`  ${colors.dim}Fallback:${colors.reset} ${result.fallbackSubtitle || colors.dim + 'NONE' + colors.reset}`);
    console.log(`  ${colors.blue}Source:${colors.reset}   ${result.subtitleSource}`);
    console.log(`  ${colors.magenta}Selector:${colors.reset} ${result.domSelector || 'N/A'}`);

    if (result.improved) {
      console.log(`  ${colors.green}✓ IMPROVED${colors.reset} - DOM extracted, fallback failed`);
    } else if (result.degraded) {
      console.log(`  ${colors.red}✗ DEGRADED${colors.reset} - DOM failed, fallback succeeded`);
    } else if (result.match) {
      console.log(`  ${colors.dim}= MATCH${colors.reset} - Both methods agree`);
    }

  } catch (error: any) {
    result.error = error.message;
    result.latency = Date.now() - startTime;
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
  }

  return result;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(results: TestResult[]): TestSummary {
  const total = results.length;
  const domSuccess = results.filter(r => r.domSuccess).length;
  const fallbackSuccess = results.filter(r => r.fallbackSuccess).length;

  const sourceBreakdown = {
    dom: results.filter(r => r.subtitleSource === 'dom').length,
    fallback: results.filter(r => r.subtitleSource === 'fallback').length,
    none: results.filter(r => r.subtitleSource === 'none').length,
  };

  const comparisonBreakdown = {
    match: results.filter(r => r.match && r.domSuccess).length,
    improved: results.filter(r => r.improved).length,
    degraded: results.filter(r => r.degraded).length,
    domOnly: results.filter(r => r.domSuccess && !r.fallbackSuccess).length,
    fallbackOnly: results.filter(r => !r.domSuccess && r.fallbackSuccess).length,
    neither: results.filter(r => !r.domSuccess && !r.fallbackSuccess).length,
  };

  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / total;
  const errors = results.filter(r => r.error !== null).length;

  return {
    totalApps: total,
    domSuccessCount: domSuccess,
    domSuccessRate: (domSuccess / total) * 100,
    fallbackSuccessCount: fallbackSuccess,
    fallbackSuccessRate: (fallbackSuccess / total) * 100,
    sourceBreakdown,
    comparisonBreakdown,
    averageLatency: avgLatency,
    errors,
  };
}

/**
 * Generate recommendations based on results
 */
function generateRecommendations(summary: TestSummary): string[] {
  const recommendations: string[] = [];

  // Success rate analysis
  if (summary.domSuccessRate >= 95) {
    recommendations.push('✅ DOM extraction success rate excellent (≥95%). Safe to promote to production.');
  } else if (summary.domSuccessRate >= 90) {
    recommendations.push('✅ DOM extraction success rate good (≥90%). Monitor closely before promoting.');
  } else if (summary.domSuccessRate >= 80) {
    recommendations.push('⚠️ DOM extraction success rate moderate (80-90%). Investigate failures before promoting.');
  } else {
    recommendations.push('❌ DOM extraction success rate low (<80%). DO NOT promote to production.');
  }

  // Source breakdown analysis
  if (summary.sourceBreakdown.dom >= summary.totalApps * 0.9) {
    recommendations.push('✅ Primary DOM selector (h2.subtitle) working as expected (≥90% usage).');
  } else if (summary.sourceBreakdown.fallback > summary.sourceBreakdown.dom) {
    recommendations.push('⚠️ Fallback selectors used more than primary. Investigate DOM selector effectiveness.');
  }

  // Degradation analysis
  if (summary.comparisonBreakdown.degraded > 0) {
    recommendations.push(`❌ CRITICAL: ${summary.comparisonBreakdown.degraded} app(s) degraded (DOM failed where fallback succeeded). Review failures.`);
  } else {
    recommendations.push('✅ No degradations detected. DOM extraction at least as good as fallback.');
  }

  // Improvement analysis
  if (summary.comparisonBreakdown.improved > 0) {
    recommendations.push(`✅ ${summary.comparisonBreakdown.improved} app(s) improved (DOM succeeded where fallback failed).`);
  }

  // Error analysis
  if (summary.errors > 0) {
    recommendations.push(`⚠️ ${summary.errors} error(s) encountered. Review error logs.`);
  }

  return recommendations;
}

/**
 * Print summary to console
 */
function printSummary(summary: TestSummary): void {
  console.log(`\n${colors.bright}${colors.cyan}═`.repeat(80));
  console.log('  STAGING TEST SUMMARY');
  console.log(`═`.repeat(80) + colors.reset);

  console.log(`\n${colors.bright}Overall Results:${colors.reset}`);
  console.log(`  Total apps tested:        ${summary.totalApps}`);
  console.log(`  DOM extraction success:   ${colors.green}${summary.domSuccessCount}${colors.reset} (${summary.domSuccessRate.toFixed(1)}%)`);
  console.log(`  Fallback success:         ${summary.fallbackSuccessCount} (${summary.fallbackSuccessRate.toFixed(1)}%)`);
  console.log(`  Average latency:          ${summary.averageLatency.toFixed(0)}ms`);
  console.log(`  Errors:                   ${summary.errors > 0 ? colors.red : colors.green}${summary.errors}${colors.reset}`);

  console.log(`\n${colors.bright}Subtitle Source Breakdown:${colors.reset}`);
  console.log(`  Primary (h2.subtitle):    ${colors.green}${summary.sourceBreakdown.dom}${colors.reset} (${((summary.sourceBreakdown.dom / summary.totalApps) * 100).toFixed(1)}%)`);
  console.log(`  Fallback selectors:       ${colors.yellow}${summary.sourceBreakdown.fallback}${colors.reset} (${((summary.sourceBreakdown.fallback / summary.totalApps) * 100).toFixed(1)}%)`);
  console.log(`  None found:               ${colors.dim}${summary.sourceBreakdown.none}${colors.reset} (${((summary.sourceBreakdown.none / summary.totalApps) * 100).toFixed(1)}%)`);

  console.log(`\n${colors.bright}Comparison Analysis:${colors.reset}`);
  console.log(`  Match (both agree):       ${summary.comparisonBreakdown.match}`);
  console.log(`  Improved (DOM > fallback):${colors.green}${summary.comparisonBreakdown.improved}${colors.reset}`);
  console.log(`  Degraded (DOM < fallback):${summary.comparisonBreakdown.degraded > 0 ? colors.red : colors.green}${summary.comparisonBreakdown.degraded}${colors.reset}`);
  console.log(`  DOM only:                 ${summary.comparisonBreakdown.domOnly}`);
  console.log(`  Fallback only:            ${summary.comparisonBreakdown.fallbackOnly}`);
  console.log(`  Neither:                  ${summary.comparisonBreakdown.neither}`);
}

/**
 * Main test runner
 */
async function runStagingTests(): Promise<void> {
  console.log(`${colors.bright}${colors.cyan}
════════════════════════════════════════════════════════════════════════════════
  DOM SUBTITLE EXTRACTION - STAGING END-TO-END TEST
════════════════════════════════════════════════════════════════════════════════
${colors.reset}`);

  // Verify feature flag is enabled
  if (!ENABLE_DOM_SUBTITLE_EXTRACTION) {
    console.error(`${colors.red}✗ Error: Feature flag ENABLE_DOM_SUBTITLE_EXTRACTION is disabled${colors.reset}`);
    console.error(`${colors.yellow}  This test requires the feature flag to be enabled.${colors.reset}`);
    console.error(`${colors.dim}  Edit: src/config/metadataFeatureFlags.ts${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Feature flag ENABLE_DOM_SUBTITLE_EXTRACTION: ENABLED${colors.reset}`);
  console.log(`${colors.dim}  Testing ${TEST_APPS.length} apps with DOM-first extraction${colors.reset}\n`);

  // Check for hydrated HTML files
  const hydratedDir = '/tmp/appstore-tests';
  if (!fs.existsSync(hydratedDir)) {
    console.error(`${colors.red}✗ Error: Hydrated HTML directory not found: ${hydratedDir}${colors.reset}`);
    console.error(`${colors.yellow}  Run: npx tsx scripts/fetch-appstore-hydrated.ts${colors.reset}\n`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Hydrated HTML directory found: ${hydratedDir}${colors.reset}\n`);

  // Initialize adapter
  const adapter = new AppStoreWebAdapter();

  // Run tests
  const results: TestResult[] = [];
  for (let i = 0; i < TEST_APPS.length; i++) {
    const app = TEST_APPS[i];
    const result = await testApp(adapter, app.name, app.appId, app.hasSubtitle);
    results.push(result);
  }

  // Calculate summary
  const summary = calculateSummary(results);

  // Generate recommendations
  const recommendations = generateRecommendations(summary);

  // Print summary
  printSummary(summary);

  // Print recommendations
  console.log(`\n${colors.bright}${colors.magenta}Recommendations:${colors.reset}`);
  recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });

  // Generate report
  const report: StagingReport = {
    metadata: {
      timestamp: new Date().toISOString(),
      featureFlagEnabled: ENABLE_DOM_SUBTITLE_EXTRACTION,
      testApps: TEST_APPS.length,
      outputPath: '/tmp/dom-extraction-staging-report.json',
    },
    summary,
    results,
    recommendations,
  };

  // Write report to file
  const outputPath = '/tmp/dom-extraction-staging-report.json';
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n${colors.bright}${colors.blue}Report Generated:${colors.reset}`);
  console.log(`  ${colors.cyan}${outputPath}${colors.reset}`);
  console.log(`  ${colors.dim}Size: ${(Buffer.byteLength(JSON.stringify(report)) / 1024).toFixed(1)} KB${colors.reset}\n`);

  // Final status
  if (summary.comparisonBreakdown.degraded > 0) {
    console.log(`${colors.red}✗ TEST FAILED: Degradations detected${colors.reset}\n`);
    process.exit(1);
  } else if (summary.domSuccessRate < 90) {
    console.log(`${colors.yellow}⚠ TEST WARNING: Success rate below 90%${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}✓ TEST PASSED: DOM extraction working as expected${colors.reset}\n`);
    process.exit(0);
  }
}

/**
 * Entry point
 */
runStagingTests().catch(error => {
  console.error(`${colors.red}✗ Fatal error:${colors.reset}`, error);
  process.exit(1);
});
