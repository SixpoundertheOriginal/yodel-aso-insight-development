/**
 * Keyword Intelligence Service
 *
 * Provides intelligent analytics and metrics for keyword tracking
 * Calculates visibility scores, traffic estimates, trends, and more
 */

import { supabase } from '@/config/supabase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface KeywordMetrics {
  keyword: string;
  platform: 'ios' | 'android';
  region: string;

  // Core metrics
  currentPosition: number | null;
  isRanking: boolean;
  estimatedSearchVolume: number;
  popularityScore: number; // 0-100
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high';

  // Effectiveness metrics
  visibilityScore: number; // (51 - position) * searchVolume / 50
  estimatedTraffic: number; // Based on position + search volume

  // Trend data
  trend: 'up' | 'down' | 'stable' | 'new' | 'lost';
  positionChange: number;
  historicalData: HistoricalSnapshot[];
}

export interface HistoricalSnapshot {
  date: string;
  position: number | null;
  visibilityScore: number;
  estimatedTraffic: number;
}

export interface KeywordStats {
  total: number;
  top10: number;
  top30: number;
  top50: number;
  avgPosition: number;
  totalEstimatedTraffic: number;
}

// ============================================================================
// KEYWORD INTELLIGENCE SERVICE
// ============================================================================

export class KeywordIntelligenceService {
  /**
   * Industry CTR benchmarks by position
   * Based on research from various ASO platforms
   */
  private readonly CTR_BY_POSITION: { [key: number]: number } = {
    1: 0.30,   // #1 gets ~30% CTR
    2: 0.20,   // #2 gets ~20% CTR
    3: 0.12,
    4: 0.08,
    5: 0.06,
    6: 0.05,
    7: 0.04,
    8: 0.03,
    9: 0.025,
    10: 0.02,
  };

  /**
   * Average conversion rate from view to install
   */
  private readonly CONVERSION_RATE = 0.30;

  /**
   * Calculates visibility score
   * Formula: (51 - position) * searchVolume / 50
   * Higher score = better visibility
   */
  calculateVisibilityScore(position: number | null, searchVolume: number): number {
    if (!position || position > 50) return 0;

    const score = ((51 - position) * searchVolume) / 50;
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Estimates traffic from keyword ranking
   * Uses industry CTR benchmarks by position
   */
  estimateTrafficFromKeyword(position: number | null, searchVolume: number): number {
    if (!position || position > 50) return 0;

    // Get CTR for position
    let ctr = this.CTR_BY_POSITION[position];

    if (!ctr) {
      // Estimate for positions 11-50 with diminishing returns
      ctr = Math.max(0.001, 0.02 / Math.pow(position - 9, 1.2));
    }

    // Estimated downloads = search volume * CTR * conversion rate
    const estimatedTraffic = searchVolume * ctr * this.CONVERSION_RATE;

    return Math.round(estimatedTraffic);
  }

  /**
   * Calculates trend based on position changes
   */
  calculateTrend(
    currentPosition: number | null,
    previousPosition: number | null
  ): 'up' | 'down' | 'stable' | 'new' | 'lost' {
    // New ranking
    if (!previousPosition && currentPosition) return 'new';

    // Lost ranking
    if (previousPosition && !currentPosition) return 'lost';

    // No data or both null
    if (!previousPosition && !currentPosition) return 'stable';

    // Calculate change (lower position number = better rank)
    const change = previousPosition! - currentPosition!;

    // Significant improvement (moved up >3 positions)
    if (change > 3) return 'up';

    // Significant decline (moved down >3 positions)
    if (change < -3) return 'down';

    // Stable (small changes)
    return 'stable';
  }

  /**
   * Calculate position change value
   */
  calculatePositionChange(
    currentPosition: number | null,
    previousPosition: number | null
  ): number {
    if (!currentPosition || !previousPosition) return 0;

    // Positive change = improvement (moved up in rankings)
    // Negative change = decline (moved down in rankings)
    return previousPosition - currentPosition;
  }

  /**
   * Calculate popularity score (0-100) from search volume
   * Uses logarithmic scale for better distribution
   */
  calculatePopularityScore(estimatedSearchVolume: number): number {
    if (estimatedSearchVolume === 0) return 0;

    const logVolume = Math.log10(estimatedSearchVolume);
    const score = Math.min(100, (logVolume / 6) * 100); // 6 = log10(1M)

    return Math.round(score);
  }
}

// Export singleton instance
export const keywordIntelligenceService = new KeywordIntelligenceService();
