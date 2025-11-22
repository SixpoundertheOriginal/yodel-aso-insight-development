/**
 * SSR-Lite Subtitle Hydration Module
 *
 * Purpose: Fallback hydration for App Store pages where the pre-rendered HTML
 * doesn't include the subtitle element. Uses Playwright WebKit to execute
 * minimal JavaScript to hydrate only the header area.
 *
 * This is a lightweight, isolated module that:
 * - Only runs when ENABLE_SSR_LITE_SUBTITLE_HYDRATION flag is enabled
 * - Only hydrates when initial DOM extraction fails
 * - Uses minimal browser resources (headless WebKit)
 * - Has strict timeouts to prevent hanging
 * - Gracefully degrades on failure
 *
 * Integration: Called by appstore-web.adapter.ts as a fallback
 */

// Playwright is dynamically imported to avoid bundling for browser

/**
 * Hydration result with telemetry
 */
export interface SubtitleHydrationResult {
  subtitle: string | null;
  subtitleSource: 'hydrated' | 'hydration-failed';
  hydrationAttempted: boolean;
  hydrationSucceeded: boolean;
  hydrationLatencyMs: number;
  error?: string;
}

/**
 * Hydration options
 */
export interface SubtitleHydrationOptions {
  timeout?: number; // Maximum time to wait for hydration (default: 10s)
  waitForSelector?: string; // Wait for specific selector before extracting
  userAgent?: string; // Custom user agent
}

/**
 * Default hydration timeout (10 seconds)
 */
const DEFAULT_HYDRATION_TIMEOUT_MS = 10000;

/**
 * Subtitle selector (same as DOM extraction)
 */
const SUBTITLE_SELECTOR = 'h2.product-header__subtitle';

/**
 * Hydrate subtitle from App Store page using Playwright WebKit
 *
 * This function:
 * 1. Launches a headless WebKit browser
 * 2. Navigates to the App Store URL
 * 3. Waits for JavaScript to hydrate the subtitle element
 * 4. Extracts the subtitle text
 * 5. Cleans up browser resources
 *
 * @param url - Full App Store URL (e.g., https://apps.apple.com/us/app/instagram/id389801252)
 * @param options - Hydration options (timeout, selectors, etc.)
 * @returns Hydration result with subtitle and telemetry
 */
export async function hydrateSubtitle(
  url: string,
  options: SubtitleHydrationOptions = {}
): Promise<SubtitleHydrationResult> {
  const startTime = Date.now();
  const timeout = options.timeout || DEFAULT_HYDRATION_TIMEOUT_MS;
  const waitForSelector = options.waitForSelector || SUBTITLE_SELECTOR;

  if (import.meta.env.DEV) {
    console.log('[SSR-LITE-HYDRATION] 🚀 Starting subtitle hydration');
    console.log('[SSR-LITE-HYDRATION] URL:', url);
    console.log('[SSR-LITE-HYDRATION] Timeout:', timeout, 'ms');
    console.log('[SSR-LITE-HYDRATION] Waiting for selector:', waitForSelector);
  }

  let browser = null;
  let subtitle: string | null = null;

  try {
    // Dynamic import of Playwright (only works in Node.js)
    const { chromium } = await import('playwright');

    // Launch headless WebKit browser
    if (import.meta.env.DEV) {
      console.log('[SSR-LITE-HYDRATION] 🌐 Launching headless WebKit browser...');
    }

    browser = await chromium.launch({
      headless: true,
      timeout: timeout,
    });

    const context = await browser.newContext({
      userAgent: options.userAgent ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
    });

    const page = await context.newPage();

    // Set navigation timeout
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    if (import.meta.env.DEV) {
      console.log('[SSR-LITE-HYDRATION] 📄 Navigating to App Store page...');
    }

    // Navigate to App Store URL
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Don't wait for all resources, just DOM
      timeout: timeout,
    });

    if (import.meta.env.DEV) {
      console.log('[SSR-LITE-HYDRATION] ✅ Page loaded, waiting for subtitle element...');
    }

    // Wait for subtitle element to appear (with timeout)
    try {
      await page.waitForSelector(waitForSelector, {
        timeout: timeout / 2, // Use half the total timeout for selector wait
        state: 'visible',
      });

      if (import.meta.env.DEV) {
        console.log('[SSR-LITE-HYDRATION] ✅ Subtitle element found, extracting text...');
      }

      // Extract subtitle text
      const subtitleElement = await page.$(waitForSelector);
      if (subtitleElement) {
        const text = await subtitleElement.textContent();
        subtitle = text ? text.trim() : null;

        if (import.meta.env.DEV) {
          console.log('[SSR-LITE-HYDRATION] 📝 Extracted subtitle:', subtitle);
        }
      }
    } catch (selectorError) {
      if (import.meta.env.DEV) {
        console.warn('[SSR-LITE-HYDRATION] ⚠️ Subtitle selector not found within timeout');
        console.warn('[SSR-LITE-HYDRATION] Selector error:', selectorError);
      }
      // Continue to cleanup - subtitle will be null
    }

    // Cleanup
    await context.close();
    await browser.close();

    const latency = Date.now() - startTime;

    if (subtitle) {
      if (import.meta.env.DEV) {
        console.log('[SSR-LITE-HYDRATION] ✅ Hydration succeeded');
        console.log('[SSR-LITE-HYDRATION] Latency:', latency, 'ms');
      }

      return {
        subtitle,
        subtitleSource: 'hydrated',
        hydrationAttempted: true,
        hydrationSucceeded: true,
        hydrationLatencyMs: latency,
      };
    } else {
      if (import.meta.env.DEV) {
        console.warn('[SSR-LITE-HYDRATION] ❌ Hydration failed - subtitle not found');
        console.warn('[SSR-LITE-HYDRATION] Latency:', latency, 'ms');
      }

      return {
        subtitle: null,
        subtitleSource: 'hydration-failed',
        hydrationAttempted: true,
        hydrationSucceeded: false,
        hydrationLatencyMs: latency,
        error: 'Subtitle element not found after hydration',
      };
    }

  } catch (error) {
    const latency = Date.now() - startTime;

    if (import.meta.env.DEV) {
      console.error('[SSR-LITE-HYDRATION] ❌ Hydration error:', error);
      console.error('[SSR-LITE-HYDRATION] Latency:', latency, 'ms');
    }

    // Cleanup on error
    try {
      if (browser) {
        await browser.close();
      }
    } catch (cleanupError) {
      if (import.meta.env.DEV) {
        console.error('[SSR-LITE-HYDRATION] ⚠️ Browser cleanup error:', cleanupError);
      }
    }

    return {
      subtitle: null,
      subtitleSource: 'hydration-failed',
      hydrationAttempted: true,
      hydrationSucceeded: false,
      hydrationLatencyMs: latency,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if Playwright is available
 *
 * Gracefully handles cases where Playwright is not installed
 */
export function isPlaywrightAvailable(): boolean {
  try {
    require.resolve('playwright');
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate hydration result
 *
 * Checks if the hydration produced a valid subtitle
 */
export function isValidHydrationResult(result: SubtitleHydrationResult): boolean {
  return (
    result.hydrationSucceeded &&
    result.subtitle !== null &&
    result.subtitle.length > 0 &&
    result.subtitle.length <= 300 // Reasonable max length for subtitle
  );
}
