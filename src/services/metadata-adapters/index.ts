/**
 * Metadata Adapters - Central Export
 *
 * Phase A: Metadata Source Stabilization
 * Provides modular, adapter-based metadata ingestion for iOS apps.
 *
 * Key Features:
 * - ✅ Subtitle duplication bug fix (critical)
 * - ✅ Priority-based fallback logic
 * - ✅ Rate limiting for all sources
 * - ✅ Automatic normalization and validation
 * - ✅ Telemetry and health monitoring
 * - ✅ Feature flags for runtime control
 *
 * Usage:
 * ```typescript
 * import { metadataOrchestrator } from '@/services/metadata-adapters';
 *
 * const metadata = await metadataOrchestrator.fetchMetadata('389801252', {
 *   country: 'us',
 * });
 * ```
 */

// ========================================
// Core Types & Interfaces
// ========================================

export * from './types';

// ========================================
// Adapters
// ========================================

export { ItunesSearchAdapter } from './itunes-search.adapter';
export { ItunesLookupAdapter } from './itunes-lookup.adapter';
export { AppStoreWebAdapter } from './appstore-web.adapter';

// ========================================
// Core Services
// ========================================

export { MetadataNormalizer, metadataNormalizer } from './normalizer';
export { MetadataOrchestrator, metadataOrchestrator } from './orchestrator';
export { MetadataTelemetry, metadataTelemetry } from './telemetry';

// ========================================
// Rate Limiting & Security
// ========================================

export { RateLimiter, RateLimiterFactory } from './rate-limiter';
export { SecurityValidator, securityValidator, ValidationError } from './security-validator';

// ========================================
// Configuration
// ========================================

export {
  METADATA_FEATURE_FLAGS,
  validateFeatureFlags,
  logFeatureFlags,
} from './feature-flags';

// ========================================
// Convenience Re-exports
// ========================================

/**
 * Primary metadata fetching function
 * Uses orchestrator with automatic fallback
 */
export async function fetchAppMetadata(
  appIdentifier: string,
  options?: { country?: string; locale?: string }
) {
  const { metadataOrchestrator } = await import('./orchestrator');
  return metadataOrchestrator.fetchMetadata(appIdentifier, options);
}

/**
 * Health check for all metadata adapters
 */
export function getMetadataAdaptersHealth() {
  const { metadataOrchestrator } = require('./orchestrator');
  return metadataOrchestrator.getAdaptersHealth();
}

/**
 * Get telemetry summary
 */
export function getMetadataTelemetrySummary() {
  const { metadataTelemetry } = require('./telemetry');
  return metadataTelemetry.getHealthSummary();
}
