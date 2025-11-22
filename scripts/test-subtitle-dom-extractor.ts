#!/usr/bin/env tsx
/**
 * DOM Subtitle Extractor - Testing Tool
 *
 * Tests DOM-based subtitle extraction from hydrated App Store HTML files.
 *
 * **Key Finding:**
 * Real-world testing has proven that subtitles are NOT in JSON blocks.
 * Subtitles are ONLY present in the hydrated DOM as:
 *   <h2 class="subtitle">Actual subtitle text</h2>
 *
 * This script validates the DOM extraction approach by:
 * 1. Loading hydrated HTML files (*-hydrated.html)
 * 2. Extracting subtitle via Cheerio DOM parsing
 * 3. Comparing with JSON extraction (expected: JSON always fails)
 * 4. Producing success rate reports
 *
 * Usage:
 *   npx tsx scripts/test-subtitle-dom-extractor.ts
 *   npx tsx scripts/test-subtitle-dom-extractor.ts --verbose
 *
 * Prerequisites:
 *   - Fetch hydrated HTML first:
 *     npx tsx scripts/fetch-appstore-hydrated.ts
 *
 * Output:
 *   - Terminal summary (colorized)
 *   - CSV output (spreadsheet-ready)
 *   - Verbose diagnostic logs (optional)
 *   - Side-by-side DOM vs JSON comparison
 *
 * Safety:
 *   - Completely isolated (no production impact)
 *   - Read-only operations
 *   - No modifications to existing extractors
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { extractSubtitleFromJsonExperimental } from '../src/lib/metadata/subtitleJsonExtractor.experimental';

// ANSI color codes for terminal output
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

// Configuration
const CONFIG = {
  testDir: '/tmp/appstore-tests',
  hydratedPattern: /-hydrated\.html$/i,
};

/**
 * Comparison status
 */
type ComparisonStatus = 'MATCH' | 'DOM_ONLY' | 'JSON_ONLY' | 'NONE';

/**
 * Test result for a single file
 */
interface TestResult {
  filename: string;
  appName: string;
  domSubtitle: string | null;
  jsonSubtitle: string | null;
  status: ComparisonStatus;
  htmlSize: number;
  domSuccess: boolean;
  jsonSuccess: boolean;
  jsonLogs?: string[];
  domSelector?: string;
  error?: string;
}

/**
 * Extract subtitle from DOM using Cheerio
 */
function extractSubtitleFromDom(html: string): {
  subtitle: string | null;
  selector: string | null;
} {
  try {
    const $ = cheerio.load(html);

    // Primary selector: h2.subtitle
    const primarySelector = 'h2.subtitle';
    let subtitle = $(primarySelector).first().text().trim();

    if (subtitle) {
      return {
        subtitle,
        selector: primarySelector,
      };
    }

    // Fallback selectors (in case Apple changes class names)
    const fallbackSelectors = [
      'h2.product-header__subtitle',
      'h2[class*="subtitle"]',
      '.product-header h2',
      'header h2.subtitle',
    ];

    for (const selector of fallbackSelectors) {
      subtitle = $(selector).first().text().trim();
      if (subtitle) {
        return {
          subtitle,
          selector,
        };
      }
    }

    return {
      subtitle: null,
      selector: null,
    };
  } catch (error) {
    console.error('DOM parsing error:', error);
    return {
      subtitle: null,
      selector: null,
    };
  }
}

/**
 * Determine comparison status
 */
function determineStatus(
  domSubtitle: string | null,
  jsonSubtitle: string | null
): ComparisonStatus {
  const hasDom = domSubtitle !== null && domSubtitle !== undefined;
  const hasJson = jsonSubtitle !== null && jsonSubtitle !== undefined;

  if (hasDom && hasJson && domSubtitle === jsonSubtitle) {
    return 'MATCH';
  } else if (hasDom && !hasJson) {
    return 'DOM_ONLY';
  } else if (!hasDom && hasJson) {
    return 'JSON_ONLY';
  } else {
    return 'NONE';
  }
}

/**
 * Test a single hydrated HTML file
 */
function testFile(filePath: string, filename: string): TestResult {
  try {
    // Read HTML file
    const html = fs.readFileSync(filePath, 'utf-8');
    const htmlSize = Buffer.byteLength(html, 'utf-8');

    // Extract app name from filename
    const appName = path
      .basename(filename, '.html')
      .replace(/-hydrated$/i, '')
      .replace(/-/g, ' ');

    // Extract subtitle from DOM
    const domResult = extractSubtitleFromDom(html);
    const domSubtitle = domResult.subtitle;

    // Extract subtitle from JSON (expected to fail)
    const jsonResult = extractSubtitleFromJsonExperimental(html);
    const jsonSubtitle = jsonResult.subtitle || null;

    // Determine status
    const status = determineStatus(domSubtitle, jsonSubtitle);

    return {
      filename,
      appName,
      domSubtitle,
      jsonSubtitle,
      status,
      htmlSize,
      domSuccess: domSubtitle !== null,
      jsonSuccess: jsonSubtitle !== null,
      jsonLogs: jsonResult.logs,
      domSelector: domResult.selector,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      filename,
      appName: path.basename(filename, '.html'),
      domSubtitle: null,
      jsonSubtitle: null,
      status: 'NONE',
      htmlSize: 0,
      domSuccess: false,
      jsonSuccess: false,
      error: errorMessage,
    };
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═'.repeat(80));
  console.log('  DOM SUBTITLE EXTRACTOR - TESTING TOOL');
  console.log('═'.repeat(80));
  console.log(`${colors.reset}\n`);

  // Check if test directory exists
  if (!fs.existsSync(CONFIG.testDir)) {
    console.error(`${colors.red}✗ Error: Test directory not found: ${CONFIG.testDir}${colors.reset}`);
    console.error(`${colors.yellow}→ Create it and fetch hydrated HTML first:${colors.reset}`);
    console.error(`  ${colors.cyan}npx tsx scripts/fetch-appstore-hydrated.ts${colors.reset}\n`);
    process.exit(1);
  }

  // Find all hydrated HTML files
  const files = fs
    .readdirSync(CONFIG.testDir)
    .filter(file => CONFIG.hydratedPattern.test(file))
    .sort();

  if (files.length === 0) {
    console.error(`${colors.yellow}⚠ No hydrated HTML files found in ${CONFIG.testDir}${colors.reset}`);
    console.error(`${colors.dim}→ Fetch hydrated HTML first:${colors.reset}`);
    console.error(`  ${colors.cyan}npx tsx scripts/fetch-appstore-hydrated.ts${colors.reset}\n`);
    process.exit(0);
  }

  console.log(`${colors.green}✓ Found ${files.length} hydrated HTML file(s) to test${colors.reset}\n`);

  // Display methodology
  console.log(`${colors.bright}Extraction Methods:${colors.reset}`);
  console.log(`  ${colors.green}DOM:${colors.reset}  Cheerio parsing of <h2.subtitle> (${colors.bright}CORRECT${colors.reset})`);
  console.log(`  ${colors.yellow}JSON:${colors.reset} JSON block extraction (${colors.dim}expected to fail${colors.reset})`);
  console.log('');

  // Run tests
  const results: TestResult[] = [];
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(CONFIG.testDir, filename);

    console.log(`${colors.bright}[${i + 1}/${files.length}]${colors.reset} Testing: ${colors.cyan}${filename}${colors.reset}`);

    const result = testFile(filePath, filename);
    results.push(result);

    // Print result summary
    if (result.error) {
      console.log(`  ${colors.red}✗ Error: ${result.error}${colors.reset}`);
    } else {
      // DOM result
      if (result.domSuccess) {
        console.log(`  ${colors.green}DOM:${colors.reset}  "${result.domSubtitle}" ${colors.dim}(via ${result.domSelector})${colors.reset}`);
      } else {
        console.log(`  ${colors.yellow}DOM:${colors.reset}  ${colors.dim}NONE${colors.reset}`);
      }

      // JSON result
      if (result.jsonSuccess) {
        console.log(`  ${colors.yellow}JSON:${colors.reset} "${result.jsonSubtitle}" ${colors.dim}(unexpected!)${colors.reset}`);
      } else {
        console.log(`  ${colors.dim}JSON: NONE (as expected)${colors.reset}`);
      }

      // Status
      const statusColors = {
        MATCH: colors.green,
        DOM_ONLY: colors.green,
        JSON_ONLY: colors.red,
        NONE: colors.yellow,
      };
      console.log(`  ${colors.dim}Status: ${statusColors[result.status]}${result.status}${colors.reset}`);
    }

    console.log(''); // Blank line between results
  }

  // Print summary
  printSummary(results);

  // Print CSV output
  printCSV(results);

  // Print detailed logs (optional)
  if (verbose) {
    printDetailedLogs(results);
  } else {
    console.log(`${colors.dim}→ Run with --verbose to see detailed JSON extraction logs${colors.reset}\n`);
  }
}

/**
 * Print summary statistics
 */
function printSummary(results: TestResult[]): void {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('─'.repeat(80));
  console.log('  SUMMARY');
  console.log('─'.repeat(80));
  console.log(`${colors.reset}\n`);

  const total = results.length;
  const domSuccess = results.filter(r => r.domSuccess).length;
  const jsonSuccess = results.filter(r => r.jsonSuccess).length;
  const domOnly = results.filter(r => r.status === 'DOM_ONLY').length;
  const jsonOnly = results.filter(r => r.status === 'JSON_ONLY').length;
  const match = results.filter(r => r.status === 'MATCH').length;
  const none = results.filter(r => r.status === 'NONE').length;
  const errors = results.filter(r => r.error).length;

  const domSuccessRate = total > 0 ? ((domSuccess / total) * 100).toFixed(1) : '0.0';
  const jsonSuccessRate = total > 0 ? ((jsonSuccess / total) * 100).toFixed(1) : '0.0';

  console.log(`  Total files tested:       ${colors.bright}${total}${colors.reset}`);
  console.log('');

  console.log(`  ${colors.bright}DOM Extraction:${colors.reset}`);
  console.log(`    Success:                ${colors.green}${domSuccess}${colors.reset} (${colors.bright}${domSuccessRate}%${colors.reset})`);
  console.log(`    Failed:                 ${colors.yellow}${total - domSuccess}${colors.reset}`);
  console.log('');

  console.log(`  ${colors.bright}JSON Extraction:${colors.reset}`);
  console.log(`    Success:                ${jsonSuccess > 0 ? colors.yellow : colors.dim}${jsonSuccess}${colors.reset} (${jsonSuccessRate}%)`);
  console.log(`    Failed:                 ${colors.dim}${total - jsonSuccess}${colors.reset} ${colors.green}(expected)${colors.reset}`);
  console.log('');

  console.log(`  ${colors.bright}Comparison Status:${colors.reset}`);
  console.log(`    DOM Only:               ${colors.green}${domOnly}${colors.reset} ${colors.bright}(correct approach)${colors.reset}`);
  console.log(`    JSON Only:              ${colors.red}${jsonOnly}${colors.reset} ${colors.dim}(unexpected)${colors.reset}`);
  console.log(`    Match:                  ${colors.green}${match}${colors.reset}`);
  console.log(`    None:                   ${colors.yellow}${none}${colors.reset}`);
  console.log(`    Errors:                 ${colors.red}${errors}${colors.reset}`);
  console.log('');

  // Key finding
  console.log(`${colors.bright}${colors.cyan}KEY FINDING:${colors.reset}`);
  if (domSuccess > 0 && jsonSuccess === 0) {
    console.log(`  ${colors.green}✓ DOM extraction works (${domSuccess}/${total} apps)${colors.reset}`);
    console.log(`  ${colors.green}✓ JSON extraction fails (as expected - subtitles not in JSON)${colors.reset}`);
    console.log(`  ${colors.bright}→ Recommendation: Use DOM-based extraction in production${colors.reset}`);
  } else if (jsonSuccess > 0) {
    console.log(`  ${colors.yellow}⚠ Unexpected: JSON extraction succeeded for ${jsonSuccess} app(s)${colors.reset}`);
    console.log(`  ${colors.dim}  This requires investigation${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠ No subtitles found via DOM or JSON${colors.reset}`);
  }
  console.log('');
}

/**
 * Print CSV-formatted output
 */
function printCSV(results: TestResult[]): void {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('─'.repeat(80));
  console.log('  CSV OUTPUT (Copy to Spreadsheet)');
  console.log('─'.repeat(80));
  console.log(`${colors.reset}\n`);

  // Header row
  console.log('Filename,App Name,DOM Subtitle,JSON Subtitle,Status,HTML Size (KB),DOM Selector');

  // Data rows
  results.forEach(result => {
    const domSubtitle = result.domSubtitle ? `"${result.domSubtitle.replace(/"/g, '""')}"` : '';
    const jsonSubtitle = result.jsonSubtitle ? `"${result.jsonSubtitle.replace(/"/g, '""')}"` : '';
    const htmlSizeKB = (result.htmlSize / 1024).toFixed(1);
    const domSelector = result.domSelector || '';

    console.log(
      `${result.filename},` +
        `${result.appName},` +
        `${domSubtitle},` +
        `${jsonSubtitle},` +
        `${result.status},` +
        `${htmlSizeKB},` +
        `${domSelector}`
    );
  });

  console.log('');
}

/**
 * Print detailed diagnostic logs
 */
function printDetailedLogs(results: TestResult[]): void {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═'.repeat(80));
  console.log('  DETAILED DIAGNOSTIC LOGS');
  console.log('═'.repeat(80));
  console.log(`${colors.reset}\n`);

  results.forEach((result, index) => {
    console.log(`${colors.bright}[${index + 1}/${results.length}] ${result.filename}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);

    console.log(`  ${colors.bright}App:${colors.reset} ${result.appName}`);
    console.log(`  ${colors.bright}HTML Size:${colors.reset} ${formatFileSize(result.htmlSize)}`);
    console.log('');

    // DOM extraction
    console.log(`  ${colors.green}${colors.bright}DOM Extraction:${colors.reset}`);
    if (result.domSuccess) {
      console.log(`    ${colors.green}✓ Success${colors.reset}`);
      console.log(`    Selector: ${colors.cyan}${result.domSelector}${colors.reset}`);
      console.log(`    Subtitle: "${colors.bright}${result.domSubtitle}${colors.reset}"`);
    } else {
      console.log(`    ${colors.yellow}✗ No subtitle found${colors.reset}`);
    }
    console.log('');

    // JSON extraction
    console.log(`  ${colors.yellow}${colors.bright}JSON Extraction:${colors.reset}`);
    if (result.jsonSuccess) {
      console.log(`    ${colors.yellow}✓ Success (unexpected)${colors.reset}`);
      console.log(`    Subtitle: "${colors.bright}${result.jsonSubtitle}${colors.reset}"`);
    } else {
      console.log(`    ${colors.dim}✗ No subtitle found (expected)${colors.reset}`);
    }

    if (result.jsonLogs && result.jsonLogs.length > 0) {
      console.log(`    ${colors.dim}Logs:${colors.reset}`);
      result.jsonLogs.forEach(log => {
        console.log(`      ${colors.dim}${log}${colors.reset}`);
      });
    }
    console.log('');
  });
}

/**
 * Entry point
 */
runTests().catch(error => {
  console.error(`${colors.red}✗ Fatal error:${colors.reset}`, error);
  process.exit(1);
});
