/**
 * Metadata Ingestion Telemetry
 *
 * Tracks all metadata fetches for monitoring, debugging, and analytics.
 * Provides visibility into source health, field completeness, and performance.
 *
 * Phase A: Core telemetry for monitoring adapter system
 */

import { ScrapedMetadata } from '@/types/aso';
import { MetadataFetchEvent, FieldCompleteness, SchemaDriftReport } from './types';

export class MetadataTelemetry {
  private events: MetadataFetchEvent[] = [];
  private maxEventHistory = 1000; // Keep last 1000 events in memory

  private knownSchema: Set<string> = new Set([
    'appId', 'name', 'url', 'title', 'subtitle', 'description',
    'icon', 'screenshots', 'rating', 'reviews', 'developer',
    'applicationCategory', 'locale', 'price',
  ]);

  private recentFields: Map<string, number> = new Map();

  /**
   * Track a metadata fetch event
   */
  async trackFetch(event: MetadataFetchEvent): Promise<void> {
    // Add to in-memory history
    this.events.push(event);

    // Trim history if needed
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }

    // Log event
    const status = event.success ? '✅' : '❌';
    const completenessPercent = (event.fieldCompleteness.completeness * 100).toFixed(1);

    console.log(`[TELEMETRY] ${status} ${event.source}: ${event.latency}ms`, {
      appId: event.appId,
      completeness: `${completenessPercent}%`,
      missing: event.fieldCompleteness.missing.length > 0
        ? event.fieldCompleteness.missing.join(', ')
        : 'none',
    });

    // In production, could store to database for historical analysis
    // await this.storeToDB(event);
  }

  /**
   * Calculate field completeness for telemetry
   */
  calculateCompleteness(metadata: ScrapedMetadata): FieldCompleteness {
    const requiredFields = Array.from(this.knownSchema);
    const missing: string[] = [];
    let present = 0;

    for (const field of requiredFields) {
      const value = (metadata as any)[field];

      if (value !== undefined && value !== null && value !== '') {
        // For arrays, check if not empty
        if (Array.isArray(value)) {
          if (value.length > 0) {
            present++;
          } else {
            missing.push(field);
          }
        } else {
          present++;
        }
      } else {
        missing.push(field);
      }
    }

    return {
      total: requiredFields.length,
      present,
      missing,
      completeness: present / requiredFields.length,
    };
  }

  /**
   * Detect schema drift (unexpected fields or missing expected fields)
   */
  detectDrift(metadata: ScrapedMetadata, source: string): SchemaDriftReport {
    const presentFields = new Set(Object.keys(metadata));
    const missingFields = Array.from(this.knownSchema).filter(f => !presentFields.has(f));
    const unexpectedFields = Array.from(presentFields).filter(f => {
      // Ignore tracking fields (start with _)
      if (f.startsWith('_')) return false;
      return !this.knownSchema.has(f);
    });

    // Track frequency of unexpected fields
    unexpectedFields.forEach(field => {
      this.recentFields.set(field, (this.recentFields.get(field) || 0) + 1);
    });

    const hasDrift = missingFields.length > 2 || unexpectedFields.length > 3;

    if (hasDrift) {
      console.warn(`[TELEMETRY] Schema drift detected in source ${source}`, {
        missingFields,
        unexpectedFields,
      });
    }

    return {
      hasDrift,
      source,
      missingFields,
      unexpectedFields,
      metadata,
    };
  }

  /**
   * Get fields that have appeared frequently (>10 times)
   * These may need to be added to the schema.
   */
  getFrequentNewFields(): Array<{ field: string; count: number }> {
    return Array.from(this.recentFields.entries())
      .filter(([_, count]) => count >= 10)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get fetch statistics by source
   */
  getStatsBySource(): Map<string, SourceStats> {
    const stats = new Map<string, SourceStats>();

    for (const event of this.events) {
      if (!stats.has(event.source)) {
        stats.set(event.source, {
          source: event.source,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgLatency: 0,
          avgCompleteness: 0,
          lastFetch: event.timestamp,
        });
      }

      const stat = stats.get(event.source)!;
      stat.totalRequests++;

      if (event.success) {
        stat.successfulRequests++;
        stat.avgCompleteness =
          (stat.avgCompleteness * (stat.successfulRequests - 1) + event.fieldCompleteness.completeness) /
          stat.successfulRequests;
      } else {
        stat.failedRequests++;
      }

      stat.avgLatency =
        (stat.avgLatency * (stat.totalRequests - 1) + event.latency) / stat.totalRequests;

      if (event.timestamp > stat.lastFetch) {
        stat.lastFetch = event.timestamp;
      }
    }

    return stats;
  }

  /**
   * Get recent events (last N)
   */
  getRecentEvents(limit: number = 100): MetadataFetchEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.events = [];
    this.recentFields.clear();
    console.log('[TELEMETRY] Event history cleared');
  }

  /**
   * Get overall success rate
   */
  getOverallSuccessRate(): number {
    if (this.events.length === 0) return 1.0;

    const successful = this.events.filter(e => e.success).length;
    return successful / this.events.length;
  }

  /**
   * Get average latency across all sources
   */
  getAverageLatency(): number {
    if (this.events.length === 0) return 0;

    const totalLatency = this.events.reduce((sum, e) => sum + e.latency, 0);
    return totalLatency / this.events.length;
  }

  /**
   * Get health summary
   */
  getHealthSummary(): HealthSummary {
    const stats = this.getStatsBySource();
    const sourceStats: SourceStats[] = [];

    stats.forEach(stat => {
      sourceStats.push(stat);
    });

    return {
      totalRequests: this.events.length,
      successRate: this.getOverallSuccessRate(),
      avgLatency: this.getAverageLatency(),
      sourceStats,
      frequentNewFields: this.getFrequentNewFields(),
    };
  }
}

export interface SourceStats {
  source: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  avgCompleteness: number;
  lastFetch: Date;
}

export interface HealthSummary {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  sourceStats: SourceStats[];
  frequentNewFields: Array<{ field: string; count: number }>;
}

// Export singleton instance
export const metadataTelemetry = new MetadataTelemetry();
