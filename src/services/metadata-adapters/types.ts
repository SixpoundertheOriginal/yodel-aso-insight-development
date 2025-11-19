/**
 * Metadata Adapter Types
 *
 * Core type definitions for the metadata ingestion adapter system.
 * Phase A: Metadata Source Stabilization
 */

import { ScrapedMetadata } from '@/types/aso';

/**
 * Metadata Source Adapter Interface
 *
 * All metadata sources must implement this interface to ensure
 * consistent behavior and enable swappable data sources.
 */
export interface MetadataSourceAdapter {
  /** Unique identifier for this adapter */
  readonly name: string;

  /** Priority (lower = higher priority). 10 = primary, 20 = secondary, etc. */
  readonly priority: number;

  /** Whether this adapter is currently enabled */
  enabled: boolean;

  /** Adapter version for compatibility tracking */
  readonly version: string;

  /**
   * Fetch raw metadata from the source
   * @param appId - App Store ID or search term
   * @param options - Source-specific options
   * @returns Raw metadata from source
   * @throws Error if fetch fails
   */
  fetch(appId: string, options?: AdapterFetchOptions): Promise<RawMetadata>;

  /**
   * Validate that raw data contains minimum required fields
   * @param data - Raw metadata to validate
   * @returns true if valid, false otherwise
   */
  validate(data: RawMetadata): boolean;

  /**
   * Transform raw source data to normalized ScrapedMetadata schema
   * @param raw - Raw metadata from source
   * @returns Normalized metadata
   */
  transform(raw: RawMetadata): ScrapedMetadata;

  /**
   * Get adapter health status
   * @returns Health metrics
   */
  getHealth(): AdapterHealth;
}

export interface AdapterFetchOptions {
  country?: string;
  locale?: string;
  timeout?: number;
  retries?: number;
  limit?: number;
}

export interface RawMetadata {
  source: string;
  timestamp: Date;
  data: any;
  headers?: Record<string, string>;
  statusCode?: number;
}

export interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastSuccess: Date | null;
  lastFailure: Date | null;
  successRate: number; // 0-1
  avgLatency: number; // milliseconds
  errorCount: number;
  requestCount: number;
}

/**
 * Adapter Priority Registry
 */
export const ADAPTER_PRIORITIES = {
  ITUNES_SEARCH: 10,  // Highest priority (fastest, most reliable)
  ITUNES_LOOKUP: 20,  // Fallback for single app
  APPSTORE_HTML: 30,  // Enrichment only
  RSS_FEED: 99,       // Deprecated
} as const;

/**
 * Field Completeness Tracking
 */
export interface FieldCompleteness {
  total: number;
  present: number;
  missing: string[];
  completeness: number; // 0-1
}

/**
 * Metadata Fetch Event (for telemetry)
 */
export interface MetadataFetchEvent {
  requestId: string;
  appId: string;
  source: string;
  success: boolean;
  latency: number; // milliseconds
  timestamp: Date;
  error?: string;
  fieldCompleteness: FieldCompleteness;
}

/**
 * Schema Drift Report
 */
export interface SchemaDriftReport {
  hasDrift: boolean;
  source: string;
  missingFields: string[];
  unexpectedFields: string[];
  metadata: ScrapedMetadata;
}

/**
 * Normalized Metadata with tracking fields
 */
export interface NormalizedMetadata extends ScrapedMetadata {
  _source?: string;
  _normalized?: boolean;
  _schemaVersion?: string;
  _timestamp?: string;
}
