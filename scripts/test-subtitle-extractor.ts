#!/usr/bin/env tsx
/**
 * Subtitle Extractor - Manual Testing CLI
 *
 * Batch-tests the experimental JSON-based subtitle extractor on real App Store HTML files.
 *
 * Usage:
 *   npx tsx scripts/test-subtitle-extractor.ts
 *
 * Prerequisites:
 *   - Place App Store HTML files in /tmp/appstore-tests/
 *   - File naming convention: <app-name>.html (e.g., instagram.html)
 *
 * Output:
 *   - Colorized terminal output for readability
 *   - CSV-friendly format for spreadsheet import
 *   - Detailed diagnostic logs for each app
 *
 * Safety:
 *   - Completely isolated from production metadata pipeline
 *   - Only imports experimental module
 *   - Never modifies any files
 *   - Graceful error handling
 */

import * as fs from 'fs';
import * as path from 'path';
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
  white: '\x1b[37m',

  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Test configuration
const TEST_DIR = '/tmp/appstore-tests';
const HTML_PATTERN = /\.html$/i;

/**
 * Test result for a single app
 */
interface TestResult {
  filename: string;
  appName: string;
  subtitle: string | undefined;
  success: boolean;
  blocksFound: number;
  blocksParsed: number;
  errorMessage?: string;
  logs: string[];
  htmlSize: number;
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═'.repeat(80));
  console.log('  SUBTITLE EXTRACTOR - MANUAL TESTING CLI');
  console.log('═'.repeat(80));
  console.log(`${colors.reset}\n`);

  // Check if test directory exists
  if (!fs.existsSync(TEST_DIR)) {
    console.error(`${colors.red}✗ Error: Test directory not found: ${TEST_DIR}${colors.reset}`);
    console.error(`${colors.yellow}→ Create it with: mkdir -p ${TEST_DIR}${colors.reset}\n`);
    process.exit(1);
  }

  // Find all HTML files
  const files = fs.readdirSync(TEST_DIR)
    .filter(file => HTML_PATTERN.test(file))
    .sort();

  if (files.length === 0) {
    console.error(`${colors.yellow}⚠ No HTML files found in ${TEST_DIR}${colors.reset}`);
    console.error(`${colors.dim}→ Add files with: curl -L "<app-url>" > ${TEST_DIR}/app.html${colors.reset}\n`);
    process.exit(0);
  }

  console.log(`${colors.green}✓ Found ${files.length} HTML file(s) to test${colors.reset}\n`);

  // Run tests
  const results: TestResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(TEST_DIR, filename);

    console.log(`${colors.bright}[${i + 1}/${files.length}]${colors.reset} Testing: ${colors.cyan}${filename}${colors.reset}`);

    const result = await testFile(filePath, filename);
    results.push(result);

    // Print result summary
    if (result.success && result.subtitle) {
      console.log(`  ${colors.green}✓ Subtitle found:${colors.reset} "${result.subtitle}"`);
      console.log(`  ${colors.dim}  Blocks: ${result.blocksFound} found, ${result.blocksParsed} parsed${colors.reset}`);
    } else if (result.success && !result.subtitle) {
      console.log(`  ${colors.yellow}⚠ No subtitle found${colors.reset}`);
      console.log(`  ${colors.dim}  Blocks: ${result.blocksFound} found, ${result.blocksParsed} parsed${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Error: ${result.errorMessage}${colors.reset}`);
    }

    console.log(''); // Blank line between results
  }

  // Print summary report
  printSummary(results);

  // Print CSV output
  printCSV(results);

  // Print detailed logs (optional)
  if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
    printDetailedLogs(results);
  } else {
    console.log(`${colors.dim}→ Run with --verbose to see detailed logs for each app${colors.reset}\n`);
  }
}

/**
 * Test a single HTML file
 */
function testFile(filePath: string, filename: string): TestResult {
  try {
    // Read HTML file
    const html = fs.readFileSync(filePath, 'utf-8');
    const htmlSize = Buffer.byteLength(html, 'utf-8');

    // Extract app name from filename
    const appName = path.basename(filename, '.html').replace(/-/g, ' ');

    // Run experimental extractor
    const extraction = extractSubtitleFromJsonExperimental(html);

    // Parse logs to count blocks
    const blocksFound = countLogMatches(extraction.logs, /Found \d+ script block/);
    const blocksParsed = countLogMatches(extraction.logs, /JSON parsed successfully/);

    return {
      filename,
      appName,
      subtitle: extraction.subtitle,
      success: true,
      blocksFound,
      blocksParsed,
      logs: extraction.logs,
      htmlSize,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      filename,
      appName: path.basename(filename, '.html'),
      subtitle: undefined,
      success: false,
      blocksFound: 0,
      blocksParsed: 0,
      errorMessage,
      logs: [],
      htmlSize: 0,
    };
  }
}

/**
 * Count log matches for a pattern
 */
function countLogMatches(logs: string[], pattern: RegExp): number {
  return logs.filter(log => pattern.test(log)).length;
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
  const successful = results.filter(r => r.success).length;
  const withSubtitle = results.filter(r => r.success && r.subtitle).length;
  const withoutSubtitle = results.filter(r => r.success && !r.subtitle).length;
  const errors = results.filter(r => !r.success).length;

  const successRate = total > 0 ? ((withSubtitle / total) * 100).toFixed(1) : '0.0';

  console.log(`  Total files tested:       ${colors.bright}${total}${colors.reset}`);
  console.log(`  Successful extractions:   ${colors.green}${successful}${colors.reset}`);
  console.log(`  Subtitles found:          ${colors.green}${withSubtitle}${colors.reset} (${colors.bright}${successRate}%${colors.reset})`);
  console.log(`  No subtitle found:        ${colors.yellow}${withoutSubtitle}${colors.reset}`);
  console.log(`  Errors:                   ${colors.red}${errors}${colors.reset}`);
  console.log('');

  // Block parsing statistics
  const totalBlocks = results.reduce((sum, r) => sum + r.blocksFound, 0);
  const totalParsed = results.reduce((sum, r) => sum + r.blocksParsed, 0);

  console.log(`  Total JSON blocks found:  ${colors.bright}${totalBlocks}${colors.reset}`);
  console.log(`  Total blocks parsed:      ${colors.bright}${totalParsed}${colors.reset}`);
  console.log('');
}

/**
 * Print CSV-formatted output for spreadsheet import
 */
function printCSV(results: TestResult[]): void {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('─'.repeat(80));
  console.log('  CSV OUTPUT (Copy to Spreadsheet)');
  console.log('─'.repeat(80));
  console.log(`${colors.reset}\n`);

  // Header row
  console.log('Filename,App Name,Subtitle Found,Subtitle Text,Blocks Found,Blocks Parsed,HTML Size (KB),Status');

  // Data rows
  results.forEach(result => {
    const subtitleFound = result.subtitle ? 'YES' : 'NO';
    const subtitleText = result.subtitle ? `"${result.subtitle.replace(/"/g, '""')}"` : '';
    const htmlSizeKB = (result.htmlSize / 1024).toFixed(1);
    const status = result.success ? 'SUCCESS' : `ERROR: ${result.errorMessage}`;

    console.log(
      `${result.filename},` +
      `${result.appName},` +
      `${subtitleFound},` +
      `${subtitleText},` +
      `${result.blocksFound},` +
      `${result.blocksParsed},` +
      `${htmlSizeKB},` +
      `${status}`
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

    if (result.success) {
      result.logs.forEach(log => {
        // Colorize logs based on content
        if (log.includes('✅')) {
          console.log(`  ${colors.green}${log}${colors.reset}`);
        } else if (log.includes('⚠️') || log.includes('❌')) {
          console.log(`  ${colors.yellow}${log}${colors.reset}`);
        } else if (log.includes('🔍')) {
          console.log(`  ${colors.cyan}${log}${colors.reset}`);
        } else if (log.includes('📊')) {
          console.log(`  ${colors.magenta}${log}${colors.reset}`);
        } else {
          console.log(`  ${colors.dim}${log}${colors.reset}`);
        }
      });
    } else {
      console.log(`  ${colors.red}Error: ${result.errorMessage}${colors.reset}`);
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
