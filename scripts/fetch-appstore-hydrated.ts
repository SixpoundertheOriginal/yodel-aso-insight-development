#!/usr/bin/env tsx
/**
 * App Store Hydrated HTML Fetcher (Puppeteer)
 *
 * Fetches fully hydrated (JavaScript-rendered) HTML from App Store pages using
 * headless Chrome via Puppeteer.
 *
 * Usage:
 *   # Fetch all default URLs
 *   npx tsx scripts/fetch-appstore-hydrated.ts
 *
 *   # Fetch single URL
 *   npx tsx scripts/fetch-appstore-hydrated.ts --url "https://apps.apple.com/us/app/instagram/id389801252"
 *
 * Prerequisites:
 *   npm install puppeteer
 *   # or
 *   npm install puppeteer-core
 *
 * Output:
 *   - Creates /tmp/appstore-tests/ directory
 *   - Saves hydrated HTML as <app-name>-hydrated.html
 *   - Full JS-rendered content (not static HTML)
 *
 * Safety:
 *   - Standalone utility (no impact on production)
 *   - Only writes to /tmp/appstore-tests/
 *   - Graceful error handling
 *   - Never crashes entire batch on single failure
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
  minHtmlSize: 50 * 1024, // 50 KB minimum
  maxRetries: 2,
  retryDelay: 3000, // 3 seconds between retries
  pageTimeout: 30000, // 30 second page load timeout
  hydrationDelay: 2000, // 2 seconds after networkidle for JS hydration
  headless: true,
  defaultViewport: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  },
};

/**
 * Default high-quality test URLs (same as fetch-appstore-html.ts)
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
  errorMessage?: string;
  attempts: number;
  loadTime?: number;
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
 * Check if Puppeteer is installed
 */
async function checkPuppeteerInstalled(): Promise<boolean> {
  try {
    await import('puppeteer');
    return true;
  } catch {
    try {
      await import('puppeteer-core');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Load Puppeteer dynamically
 */
async function loadPuppeteer(): Promise<any> {
  try {
    return await import('puppeteer');
  } catch {
    try {
      return await import('puppeteer-core');
    } catch (error) {
      throw new Error(
        'Puppeteer not found. Install with: npm install puppeteer'
      );
    }
  }
}

/**
 * Fetch a single App Store page with hydrated HTML using Puppeteer
 */
async function fetchHydratedPage(
  puppeteer: any,
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

  let browser = null;

  for (let attempt = 1; attempt <= CONFIG.maxRetries + 1; attempt++) {
    result.attempts = attempt;

    try {
      console.log(
        `${colors.dim}  [Attempt ${attempt}/${CONFIG.maxRetries + 1}]${colors.reset} Launching browser...`
      );

      const startTime = Date.now();

      // Launch browser
      browser = await puppeteer.launch({
        headless: CONFIG.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
        defaultViewport: CONFIG.defaultViewport,
      });

      const page = await browser.newPage();

      // Set realistic User-Agent and headers
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
      });

      console.log(
        `${colors.dim}  Navigating to ${colors.cyan}${url}${colors.reset}`
      );

      // Navigate to page with networkidle0 (wait for all network requests to finish)
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: CONFIG.pageTimeout,
      });

      console.log(
        `${colors.dim}  Page loaded, waiting ${CONFIG.hydrationDelay / 1000}s for JS hydration...${colors.reset}`
      );

      // Additional delay for JavaScript hydration
      await sleep(CONFIG.hydrationDelay);

      // Extract fully hydrated HTML
      const html = await page.content();
      const htmlSize = Buffer.byteLength(html, 'utf-8');

      const loadTime = Date.now() - startTime;

      // Validate HTML size
      if (htmlSize < CONFIG.minHtmlSize) {
        throw new Error(
          `HTML too small (${formatFileSize(htmlSize)}), expected at least ${formatFileSize(CONFIG.minHtmlSize)}`
        );
      }

      // Basic validation: check if it's actually an App Store page
      if (!html.includes('apps.apple.com') && !html.includes('App Store')) {
        throw new Error('Response does not appear to be an App Store page');
      }

      // Close browser
      await browser.close();
      browser = null;

      // Save to file with "-hydrated" suffix
      const filename = `${sanitizeFilename(name)}-hydrated.html`;
      const filePath = path.join(CONFIG.outputDir, filename);
      fs.writeFileSync(filePath, html, 'utf-8');

      result.success = true;
      result.filePath = filePath;
      result.fileSize = htmlSize;
      result.loadTime = loadTime;

      console.log(
        `  ${colors.green}✓ Success${colors.reset} - ${formatFileSize(htmlSize)} saved to ${colors.dim}${filename}${colors.reset} (${(loadTime / 1000).toFixed(1)}s)`
      );

      return result;
    } catch (error) {
      // Close browser on error
      if (browser) {
        try {
          await browser.close();
        } catch {}
        browser = null;
      }

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
 * Parse CLI arguments
 */
function parseArgs(): { urls: typeof DEFAULT_URLS; singleUrl: boolean } {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');

  if (urlIndex !== -1 && args[urlIndex + 1]) {
    const url = args[urlIndex + 1];
    const name = url.split('/').pop()?.split('-').slice(0, 2).join('-') || 'custom-app';

    return {
      urls: [
        {
          name,
          url,
          category: 'Custom',
        },
      ],
      singleUrl: true,
    };
  }

  return {
    urls: DEFAULT_URLS,
    singleUrl: false,
  };
}

/**
 * Main fetcher
 */
async function fetchAllPages(): Promise<void> {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═'.repeat(80));
  console.log('  APP STORE HYDRATED HTML FETCHER (PUPPETEER)');
  console.log('═'.repeat(80));
  console.log(`${colors.reset}\n`);

  // Check if Puppeteer is installed
  const puppeteerInstalled = await checkPuppeteerInstalled();

  if (!puppeteerInstalled) {
    console.error(`${colors.red}✗ Error: Puppeteer not installed${colors.reset}\n`);
    console.error(`${colors.yellow}To use this script, install Puppeteer:${colors.reset}`);
    console.error(`  ${colors.cyan}npm install puppeteer${colors.reset}`);
    console.error(`  ${colors.dim}or${colors.reset}`);
    console.error(`  ${colors.cyan}npm install puppeteer-core${colors.reset}\n`);
    console.error(`${colors.dim}Puppeteer will download Chromium (~170 MB) automatically.${colors.reset}\n`);
    process.exit(1);
  }

  // Load Puppeteer
  console.log(`${colors.green}✓ Puppeteer installed${colors.reset}\n`);
  const puppeteer = await loadPuppeteer();

  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`${colors.green}✓ Created directory: ${CONFIG.outputDir}${colors.reset}\n`);
  } else {
    console.log(`${colors.dim}→ Using existing directory: ${CONFIG.outputDir}${colors.reset}\n`);
  }

  // Parse CLI arguments
  const { urls, singleUrl } = parseArgs();

  // Display configuration
  console.log(`${colors.dim}Configuration:${colors.reset}`);
  if (singleUrl) {
    console.log(`  ${colors.dim}• Mode: Single URL (from CLI argument)${colors.reset}`);
    console.log(`  ${colors.dim}• URL: ${urls[0].url}${colors.reset}`);
  } else {
    console.log(`  ${colors.dim}• Mode: Batch (default URLs)${colors.reset}`);
    console.log(`  ${colors.dim}• Total URLs: ${urls.length}${colors.reset}`);
  }
  console.log(`  ${colors.dim}• Headless: ${CONFIG.headless ? 'Yes' : 'No'}${colors.reset}`);
  console.log(`  ${colors.dim}• Page timeout: ${CONFIG.pageTimeout / 1000}s${colors.reset}`);
  console.log(`  ${colors.dim}• Hydration delay: ${CONFIG.hydrationDelay / 1000}s${colors.reset}`);
  console.log(`  ${colors.dim}• Max retries: ${CONFIG.maxRetries}${colors.reset}`);
  console.log('');

  // Fetch all pages
  const results: FetchResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < urls.length; i++) {
    const { name, url, category } = urls[i];

    console.log(
      `${colors.bright}[${i + 1}/${urls.length}]${colors.reset} ${colors.magenta}${category}${colors.reset} - ${name}`
    );

    const result = await fetchHydratedPage(puppeteer, name, url, category);
    results.push(result);

    console.log(''); // Blank line between fetches
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print summary
  printSummary(results, totalTime, singleUrl);
}

/**
 * Print summary statistics
 */
function printSummary(results: FetchResult[], totalTime: string, singleUrl: boolean): void {
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

  const avgLoadTime =
    successful > 0
      ? results
          .filter(r => r.success && r.loadTime)
          .reduce((sum, r) => sum + (r.loadTime || 0), 0) / successful
      : 0;

  console.log(`  Total URLs:           ${colors.bright}${total}${colors.reset}`);
  console.log(`  Successfully fetched: ${colors.green}${successful}${colors.reset} (${colors.bright}${successRate}%${colors.reset})`);
  console.log(`  Failed:               ${colors.red}${failed}${colors.reset}`);
  console.log(`  Total size:           ${colors.bright}${formatFileSize(totalSize)}${colors.reset}`);
  console.log(`  Average size:         ${colors.bright}${formatFileSize(avgSize)}${colors.reset}`);
  console.log(`  Average load time:    ${colors.bright}${(avgLoadTime / 1000).toFixed(1)}s${colors.reset}`);
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

  // Next steps
  if (!singleUrl) {
    console.log(`${colors.bright}Next steps:${colors.reset}`);
    console.log(`  ${colors.dim}1. Compare with static HTML:${colors.reset}`);
    console.log(`     ${colors.cyan}diff /tmp/appstore-tests/instagram.html /tmp/appstore-tests/instagram-hydrated.html${colors.reset}`);
    console.log(`  ${colors.dim}2. Run subtitle extraction tests:${colors.reset}`);
    console.log(`     ${colors.cyan}npx tsx scripts/test-subtitle-extractor.ts${colors.reset}`);
    console.log(`  ${colors.dim}3. Analyze differences in extraction success rates${colors.reset}`);
    console.log('');
  }

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
