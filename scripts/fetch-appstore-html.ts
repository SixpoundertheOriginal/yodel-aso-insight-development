#!/usr/bin/env tsx
/**
 * App Store HTML Fetcher
 *
 * Automatically fetches real App Store HTML pages for testing the experimental
 * subtitle extractor.
 *
 * Usage:
 *   npx tsx scripts/fetch-appstore-html.ts
 *
 * Output:
 *   - Creates /tmp/appstore-tests/ directory
 *   - Fetches ~20 high-quality App Store pages
 *   - Saves as .html files with clean filenames
 *   - Provides detailed CLI logging
 *
 * Safety:
 *   - Standalone utility (no impact on production)
 *   - Read-only operations (only writes to /tmp)
 *   - Robust error handling
 *   - Never crashes on network failures
 */

import * as fs from 'fs';
import * as path from 'path';

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
  outputDir: '/tmp/appstore-tests',
  minHtmlSize: 50 * 1024, // 50 KB minimum to detect empty responses
  maxRetries: 2,
  retryDelay: 2000, // 2 seconds between retries
  requestDelay: 1500, // 1.5 seconds between requests (rate limiting)
  timeout: 15000, // 15 second timeout per request
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  acceptLanguage: 'en-US,en;q=0.9',
};

/**
 * Default high-quality test URLs
 * Selected across diverse categories for comprehensive testing
 */
const DEFAULT_URLS = [
  // Education & Language Learning
  {
    name: 'pimsleur',
    url: 'https://apps.apple.com/us/app/pimsleur-learn-languages-fast/id391349485',
    category: 'Education',
  },
  {
    name: 'duolingo',
    url: 'https://apps.apple.com/us/app/duolingo-language-lessons/id570060128',
    category: 'Education',
  },

  // Social Media & Communication
  {
    name: 'instagram',
    url: 'https://apps.apple.com/us/app/instagram/id389801252',
    category: 'Social',
  },
  {
    name: 'tiktok',
    url: 'https://apps.apple.com/us/app/tiktok/id835599320',
    category: 'Social',
  },
  {
    name: 'slack',
    url: 'https://apps.apple.com/us/app/slack/id618783545',
    category: 'Business',
  },
  {
    name: 'zoom',
    url: 'https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307',
    category: 'Business',
  },

  // Entertainment & Streaming
  {
    name: 'spotify',
    url: 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580',
    category: 'Music',
  },
  {
    name: 'netflix',
    url: 'https://apps.apple.com/us/app/netflix/id363590051',
    category: 'Entertainment',
  },
  {
    name: 'youtube',
    url: 'https://apps.apple.com/us/app/youtube-watch-listen-stream/id544007664',
    category: 'Entertainment',
  },
  {
    name: 'disney-plus',
    url: 'https://apps.apple.com/us/app/disney/id1446075923',
    category: 'Entertainment',
  },

  // Health & Wellness
  {
    name: 'calm',
    url: 'https://apps.apple.com/us/app/calm-sleep-meditation/id571800810',
    category: 'Health',
  },
  {
    name: 'headspace',
    url: 'https://apps.apple.com/us/app/headspace-mindful-meditation/id493145008',
    category: 'Health',
  },
  {
    name: 'strava',
    url: 'https://apps.apple.com/us/app/strava-run-ride-or-swim/id426826309',
    category: 'Health',
  },

  // Productivity & Utilities
  {
    name: 'notion',
    url: 'https://apps.apple.com/us/app/notion-notes-docs-tasks/id1232780281',
    category: 'Productivity',
  },

  // Travel & Transportation
  {
    name: 'uber',
    url: 'https://apps.apple.com/us/app/uber-request-a-ride/id368677368',
    category: 'Travel',
  },
  {
    name: 'uber-eats',
    url: 'https://apps.apple.com/us/app/uber-eats-food-delivery/id1058959277',
    category: 'Food',
  },
  {
    name: 'airbnb',
    url: 'https://apps.apple.com/us/app/airbnb/id401626263',
    category: 'Travel',
  },
  {
    name: 'google-maps',
    url: 'https://apps.apple.com/us/app/google-maps/id585027354',
    category: 'Navigation',
  },

  // Finance & Shopping
  {
    name: 'revolut',
    url: 'https://apps.apple.com/us/app/revolut-send-spend-save/id932493382',
    category: 'Finance',
  },
  {
    name: 'amazon',
    url: 'https://apps.apple.com/us/app/amazon-shopping/id297606951',
    category: 'Shopping',
  },
];

/**
 * Fetch result for a single URL
 */
interface FetchResult {
  name: string;
  url: string;
  category: string;
  success: boolean;
  filePath?: string;
  fileSize?: number;
  statusCode?: number;
  errorMessage?: string;
  attempts: number;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitize filename (remove special characters)
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Fetch a single App Store page with retry logic
 */
async function fetchAppStorePage(
  name: string,
  url: string,
  category: string
): Promise<FetchResult> {
  const result: FetchResult = {
    name,
    url,
    category,
    success: false,
    attempts: 0,
  };

  for (let attempt = 1; attempt <= CONFIG.maxRetries + 1; attempt++) {
    result.attempts = attempt;

    try {
      console.log(
        `${colors.dim}  [Attempt ${attempt}/${CONFIG.maxRetries + 1}]${colors.reset} Fetching ${colors.cyan}${url}${colors.reset}`
      );

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

      // Fetch HTML
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': CONFIG.acceptLanguage,
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      result.statusCode = response.status;

      // Check HTTP status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get HTML content
      const html = await response.text();
      const htmlSize = Buffer.byteLength(html, 'utf-8');

      // Validate HTML size (detect empty/error responses)
      if (htmlSize < CONFIG.minHtmlSize) {
        throw new Error(
          `HTML too small (${formatFileSize(htmlSize)}), expected at least ${formatFileSize(CONFIG.minHtmlSize)}`
        );
      }

      // Basic validation: check if it's actually an App Store page
      if (!html.includes('apps.apple.com') && !html.includes('App Store')) {
        throw new Error('Response does not appear to be an App Store page');
      }

      // Save to file
      const filename = `${sanitizeFilename(name)}.html`;
      const filePath = path.join(CONFIG.outputDir, filename);
      fs.writeFileSync(filePath, html, 'utf-8');

      result.success = true;
      result.filePath = filePath;
      result.fileSize = htmlSize;

      console.log(
        `  ${colors.green}✓ Success${colors.reset} - ${formatFileSize(htmlSize)} saved to ${colors.dim}${filename}${colors.reset}`
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errorMessage = errorMessage;

      if (attempt < CONFIG.maxRetries + 1) {
        console.log(
          `  ${colors.yellow}⚠ Failed: ${errorMessage}${colors.reset}`
        );
        console.log(
          `  ${colors.dim}  Retrying in ${CONFIG.retryDelay / 1000}s...${colors.reset}`
        );
        await sleep(CONFIG.retryDelay);
      } else {
        console.log(
          `  ${colors.red}✗ Failed after ${attempt} attempts: ${errorMessage}${colors.reset}`
        );
      }
    }
  }

  return result;
}

/**
 * Main fetcher
 */
async function fetchAllPages(): Promise<void> {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═'.repeat(80));
  console.log('  APP STORE HTML FETCHER');
  console.log('═'.repeat(80));
  console.log(`${colors.reset}\n`);

  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`${colors.green}✓ Created directory: ${CONFIG.outputDir}${colors.reset}\n`);
  } else {
    console.log(`${colors.dim}→ Using existing directory: ${CONFIG.outputDir}${colors.reset}\n`);
  }

  // Display configuration
  console.log(`${colors.dim}Configuration:${colors.reset}`);
  console.log(`  ${colors.dim}• Total URLs: ${DEFAULT_URLS.length}${colors.reset}`);
  console.log(`  ${colors.dim}• Max retries: ${CONFIG.maxRetries}${colors.reset}`);
  console.log(`  ${colors.dim}• Min HTML size: ${formatFileSize(CONFIG.minHtmlSize)}${colors.reset}`);
  console.log(`  ${colors.dim}• Request delay: ${CONFIG.requestDelay / 1000}s${colors.reset}`);
  console.log('');

  // Fetch all pages
  const results: FetchResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < DEFAULT_URLS.length; i++) {
    const { name, url, category } = DEFAULT_URLS[i];

    console.log(
      `${colors.bright}[${i + 1}/${DEFAULT_URLS.length}]${colors.reset} ${colors.magenta}${category}${colors.reset} - ${name}`
    );

    const result = await fetchAppStorePage(name, url, category);
    results.push(result);

    // Rate limiting: delay between requests (except after last one)
    if (i < DEFAULT_URLS.length - 1) {
      await sleep(CONFIG.requestDelay);
    }

    console.log(''); // Blank line between fetches
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print summary
  printSummary(results, totalTime);
}

/**
 * Print summary statistics
 */
function printSummary(results: FetchResult[], totalTime: string): void {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('═'.repeat(80));
  console.log('  SUMMARY');
  console.log('═'.repeat(80));
  console.log(`${colors.reset}\n`);

  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0';

  const totalSize = results
    .filter(r => r.success && r.fileSize)
    .reduce((sum, r) => sum + (r.fileSize || 0), 0);

  const avgSize = successful > 0 ? totalSize / successful : 0;

  console.log(`  Total URLs:           ${colors.bright}${total}${colors.reset}`);
  console.log(`  Successfully fetched: ${colors.green}${successful}${colors.reset} (${colors.bright}${successRate}%${colors.reset})`);
  console.log(`  Failed:               ${colors.red}${failed}${colors.reset}`);
  console.log(`  Total size:           ${colors.bright}${formatFileSize(totalSize)}${colors.reset}`);
  console.log(`  Average size:         ${colors.bright}${formatFileSize(avgSize)}${colors.reset}`);
  console.log(`  Total time:           ${colors.bright}${totalTime}s${colors.reset}`);
  console.log('');

  // Failed URLs (if any)
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log(`${colors.red}Failed URLs:${colors.reset}`);
    failedResults.forEach(r => {
      console.log(`  ${colors.dim}• ${r.name}${colors.reset}`);
      console.log(`    ${colors.red}${r.errorMessage}${colors.reset}`);
      console.log(`    ${colors.dim}${r.url}${colors.reset}`);
    });
    console.log('');
  }

  // Success summary by category
  const byCategory = results
    .filter(r => r.success)
    .reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = 0;
      acc[r.category]++;
      return acc;
    }, {} as Record<string, number>);

  if (Object.keys(byCategory).length > 0) {
    console.log(`${colors.cyan}Success by category:${colors.reset}`);
    Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${colors.dim}• ${category}: ${colors.green}${count}${colors.reset}`);
      });
    console.log('');
  }

  // Next steps
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  console.log(`  ${colors.dim}1. Run the test script:${colors.reset}`);
  console.log(`     ${colors.cyan}npx tsx scripts/test-subtitle-extractor.ts${colors.reset}`);
  console.log(`  ${colors.dim}2. Analyze results and build spreadsheet${colors.reset}`);
  console.log(`  ${colors.dim}3. Make integration decision based on success rate${colors.reset}`);
  console.log('');

  if (successful === total) {
    console.log(`${colors.green}✓ All URLs fetched successfully!${colors.reset}\n`);
  } else if (successful > 0) {
    console.log(`${colors.yellow}⚠ Some URLs failed, but ${successful} were successful${colors.reset}\n`);
  } else {
    console.log(`${colors.red}✗ No URLs were fetched successfully${colors.reset}\n`);
  }
}

/**
 * Entry point
 */
fetchAllPages().catch(error => {
  console.error(`${colors.red}✗ Fatal error:${colors.reset}`, error);
  process.exit(1);
});
