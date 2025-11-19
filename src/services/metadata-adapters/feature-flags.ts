/**
 * Feature Flags for Metadata Ingestion
 *
 * Controls which adapters are active and their behavior.
 * Can be toggled at runtime via environment variables.
 *
 * Phase A: Core feature flags for adapter control
 */

/**
 * Get environment variable as boolean
 */
function getEnvBool(key: string, defaultValue: boolean): boolean {
  if (typeof process === 'undefined') return defaultValue;

  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val.toLowerCase() === 'true' || val === '1';
}

/**
 * Get environment variable as integer
 */
function getEnvInt(key: string, defaultValue: number): number {
  if (typeof process === 'undefined') return defaultValue;

  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Metadata Adapter Feature Flags
 */
export const METADATA_FEATURE_FLAGS = {
  // ========================================
  // Adapter Enablement
  // ========================================

  /** Enable iTunes Search API adapter (primary source) */
  USE_ITUNES_SEARCH_ADAPTER: getEnvBool('USE_ITUNES_SEARCH_ADAPTER', true),

  /** Enable iTunes Lookup API adapter (fallback for single apps) */
  USE_ITUNES_LOOKUP_ADAPTER: getEnvBool('USE_ITUNES_LOOKUP_ADAPTER', true),

  /** Enable App Store HTML scraping adapter (enrichment only, disabled by default) */
  USE_APPSTORE_HTML_ADAPTER: getEnvBool('USE_APPSTORE_HTML_ADAPTER', false),

  /** Enable RSS Feed adapter (deprecated, disabled by default) */
  USE_RSS_FEED_ADAPTER: getEnvBool('USE_RSS_FEED_ADAPTER', false),

  // ========================================
  // Behavior Flags
  // ========================================

  /** Enable metadata caching */
  ENABLE_METADATA_CACHING: getEnvBool('ENABLE_METADATA_CACHING', true),

  /** Enable HTML enrichment (scraping for additional metadata) */
  ENABLE_HTML_ENRICHMENT: getEnvBool('ENABLE_HTML_ENRICHMENT', false),

  /** Enable screenshot analysis */
  ENABLE_SCREENSHOT_ANALYSIS: getEnvBool('ENABLE_SCREENSHOT_ANALYSIS', true),

  /** Enable automatic normalization (subtitle fix, field validation) */
  ENABLE_AUTO_NORMALIZATION: getEnvBool('ENABLE_AUTO_NORMALIZATION', true),

  /** Enable telemetry tracking */
  ENABLE_TELEMETRY: getEnvBool('ENABLE_TELEMETRY', true),

  /** Enable schema drift detection */
  ENABLE_SCHEMA_DRIFT_DETECTION: getEnvBool('ENABLE_SCHEMA_DRIFT_DETECTION', true),

  // ========================================
  // Rate Limiting
  // ========================================

  /** Max requests per minute for iTunes API (Search + Lookup) */
  MAX_REQUESTS_PER_MINUTE_ITUNES: getEnvInt('MAX_REQUESTS_PER_MINUTE_ITUNES', 100),

  /** Max requests per minute for HTML scraping */
  MAX_REQUESTS_PER_MINUTE_HTML: getEnvInt('MAX_REQUESTS_PER_MINUTE_HTML', 10),

  /** Delay between HTML scraping requests (milliseconds) */
  HTML_SCRAPING_DELAY_MS: getEnvInt('HTML_SCRAPING_DELAY_MS', 5000),

  // ========================================
  // Cache Configuration
  // ========================================

  /** Cache TTL in seconds (24 hours default) */
  METADATA_CACHE_TTL: getEnvInt('METADATA_CACHE_TTL', 86400),

  /** Enable cache compression */
  ENABLE_CACHE_COMPRESSION: getEnvBool('ENABLE_CACHE_COMPRESSION', false),

  // ========================================
  // Retry Behavior
  // ========================================

  /** Max retry attempts per adapter */
  MAX_RETRY_ATTEMPTS: getEnvInt('MAX_RETRY_ATTEMPTS', 2),

  /** Initial retry backoff in milliseconds */
  RETRY_BACKOFF_MS: getEnvInt('RETRY_BACKOFF_MS', 1000),

  /** Max retry backoff in milliseconds */
  MAX_RETRY_BACKOFF_MS: getEnvInt('MAX_RETRY_BACKOFF_MS', 5000),

  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: getEnvInt('REQUEST_TIMEOUT_MS', 10000),

  // ========================================
  // Monitoring & Alerting
  // ========================================

  /** Alert on success rate below this threshold (0-1) */
  ALERT_SUCCESS_RATE_THRESHOLD: getEnvInt('ALERT_SUCCESS_RATE_THRESHOLD', 90) / 100,

  /** Alert on average latency above this threshold (milliseconds) */
  ALERT_LATENCY_THRESHOLD_MS: getEnvInt('ALERT_LATENCY_THRESHOLD_MS', 3000),

  /** Alert on field completeness below this threshold (0-1) */
  ALERT_COMPLETENESS_THRESHOLD: getEnvInt('ALERT_COMPLETENESS_THRESHOLD', 80) / 100,

  // ========================================
  // Development/Testing
  // ========================================

  /** Enable debug logging */
  DEBUG_METADATA_ADAPTERS: getEnvBool('DEBUG_METADATA_ADAPTERS', false),

  /** Use test/mock adapters instead of real APIs */
  USE_MOCK_ADAPTERS: getEnvBool('USE_MOCK_ADAPTERS', false),

  /** Simulate API failures for testing (0-100 percentage) */
  SIMULATE_FAILURE_RATE: getEnvInt('SIMULATE_FAILURE_RATE', 0),
} as const;

/**
 * Validate feature flags configuration
 */
export function validateFeatureFlags(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // At least one adapter must be enabled
  const anyAdapterEnabled =
    METADATA_FEATURE_FLAGS.USE_ITUNES_SEARCH_ADAPTER ||
    METADATA_FEATURE_FLAGS.USE_ITUNES_LOOKUP_ADAPTER ||
    METADATA_FEATURE_FLAGS.USE_APPSTORE_HTML_ADAPTER ||
    METADATA_FEATURE_FLAGS.USE_RSS_FEED_ADAPTER;

  if (!anyAdapterEnabled) {
    errors.push('At least one metadata adapter must be enabled');
  }

  // Warn if primary adapter (iTunes Search) is disabled
  if (!METADATA_FEATURE_FLAGS.USE_ITUNES_SEARCH_ADAPTER) {
    warnings.push('Primary adapter (iTunes Search) is disabled - fallback sources only');
  }

  // Warn if HTML scraping is enabled (legal risk)
  if (METADATA_FEATURE_FLAGS.USE_APPSTORE_HTML_ADAPTER) {
    warnings.push('HTML scraping adapter is enabled - ensure compliance with Apple ToS');
  }

  // Warn if rate limits are too aggressive
  if (METADATA_FEATURE_FLAGS.MAX_REQUESTS_PER_MINUTE_ITUNES > 200) {
    warnings.push('iTunes API rate limit > 200/min may trigger throttling');
  }

  // Validate retry backoff
  if (METADATA_FEATURE_FLAGS.RETRY_BACKOFF_MS > METADATA_FEATURE_FLAGS.MAX_RETRY_BACKOFF_MS) {
    errors.push('RETRY_BACKOFF_MS must be <= MAX_RETRY_BACKOFF_MS');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log feature flags status
 */
export function logFeatureFlags(): void {
  console.log('[FEATURE-FLAGS] Metadata Adapter Configuration:');
  console.log('  Adapters:');
  console.log(`    iTunes Search: ${METADATA_FEATURE_FLAGS.USE_ITUNES_SEARCH_ADAPTER ? '✅' : '❌'}`);
  console.log(`    iTunes Lookup: ${METADATA_FEATURE_FLAGS.USE_ITUNES_LOOKUP_ADAPTER ? '✅' : '❌'}`);
  console.log(`    HTML Scraping: ${METADATA_FEATURE_FLAGS.USE_APPSTORE_HTML_ADAPTER ? '⚠️ ' : '❌'}`);
  console.log(`    RSS Feed: ${METADATA_FEATURE_FLAGS.USE_RSS_FEED_ADAPTER ? '⚠️ ' : '❌'}`);

  console.log('  Behavior:');
  console.log(`    Auto Normalization: ${METADATA_FEATURE_FLAGS.ENABLE_AUTO_NORMALIZATION ? '✅' : '❌'}`);
  console.log(`    Telemetry: ${METADATA_FEATURE_FLAGS.ENABLE_TELEMETRY ? '✅' : '❌'}`);
  console.log(`    Caching: ${METADATA_FEATURE_FLAGS.ENABLE_METADATA_CACHING ? '✅' : '❌'}`);

  console.log('  Rate Limits:');
  console.log(`    iTunes API: ${METADATA_FEATURE_FLAGS.MAX_REQUESTS_PER_MINUTE_ITUNES}/min`);
  console.log(`    HTML Scraping: ${METADATA_FEATURE_FLAGS.MAX_REQUESTS_PER_MINUTE_HTML}/min`);

  const validation = validateFeatureFlags();
  if (validation.warnings.length > 0) {
    console.warn('[FEATURE-FLAGS] Warnings:', validation.warnings);
  }
  if (!validation.valid) {
    console.error('[FEATURE-FLAGS] Errors:', validation.errors);
  }
}
