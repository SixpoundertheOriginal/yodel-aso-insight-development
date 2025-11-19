/**
 * Metadata Normalizer
 *
 * Ensures all metadata from different sources conforms to
 * a consistent schema with proper validation and sanitization.
 *
 * Phase A: Critical fix for subtitle duplication bug
 */

import { ScrapedMetadata } from '@/types/aso';
import { NormalizedMetadata } from './types';

export class MetadataNormalizer {
  private readonly schemaVersion = '1.1';

  /**
   * Normalize metadata from any source to ScrapedMetadata v1.1 schema
   *
   * CRITICAL FIX: Handles subtitle duplication bug from iTunes API
   * Phase B: Preserves source-specific fields for traceability
   */
  normalize(metadata: ScrapedMetadata, source: string): NormalizedMetadata {
    // DIAGNOSTIC: Log incoming name/title BEFORE normalization
    console.log(`[DIAGNOSTIC-NAME-NORMALIZER] BEFORE normalize:`, {
      'incoming.name': metadata.name,
      'incoming.title': metadata.title,
      'incoming.subtitle': metadata.subtitle,
      'incoming.appStoreName': metadata.appStoreName,
      'incoming.appStoreSubtitle': metadata.appStoreSubtitle,
      'incoming.fallbackName': metadata.fallbackName,
      'incoming.fallbackSubtitle': metadata.fallbackSubtitle,
      'incoming._htmlExtraction': metadata._htmlExtraction,
      source,
    });

    const normalized = {
      // Core fields (required)
      appId: this.normalizeAppId(metadata.appId),
      name: this.normalizeString(metadata.name) || 'Unknown App',
      url: this.normalizeUrl(metadata.url) || '',
      locale: metadata.locale || 'en-US',

      // Phase B: Source-specific fields (pass through unchanged)
      appStoreName: metadata.appStoreName,
      appStoreSubtitle: metadata.appStoreSubtitle,
      fallbackName: metadata.fallbackName,
      fallbackSubtitle: metadata.fallbackSubtitle,
      _htmlExtraction: metadata._htmlExtraction,

      // Title/Subtitle (FIX: Ensure no duplication)
      title: this.normalizeTitle(metadata.title, metadata.name),
      subtitle: this.normalizeSubtitle(metadata.subtitle, metadata.title, metadata.name),

      // Optional metadata
      description: this.normalizeString(metadata.description),
      applicationCategory: this.normalizeString(metadata.applicationCategory),
      developer: this.normalizeString(metadata.developer),

      // Metrics
      rating: this.normalizeRating(metadata.rating),
      reviews: this.normalizeReviews(metadata.reviews),
      price: this.normalizeString(metadata.price) || 'Free',

      // Creative assets (FIX: Screenshot field consistency)
      icon: this.normalizeUrl(metadata.icon),
      screenshots: this.normalizeScreenshots(metadata),

      // Source tracking
      _source: source,
      _normalized: true,
      _schemaVersion: this.schemaVersion,
      _timestamp: new Date().toISOString(),
    };

    // DIAGNOSTIC: Log final name/title AFTER normalization
    console.log(`[DIAGNOSTIC-NAME-NORMALIZER] AFTER normalize:`, {
      'normalized.name': normalized.name,
      'normalized.title': normalized.title,
      'normalized.subtitle': normalized.subtitle,
      'normalized.appStoreName': normalized.appStoreName,
      'normalized.appStoreSubtitle': normalized.appStoreSubtitle,
      'normalized.fallbackName': normalized.fallbackName,
      'normalized.fallbackSubtitle': normalized.fallbackSubtitle,
      'normalized._htmlExtraction': normalized._htmlExtraction,
    });

    return normalized;
  }

  /**
   * CRITICAL FIX: Normalize subtitle to prevent duplication
   *
   * iTunes API bug: trackCensoredName returns the same value as trackName
   * This causes subtitle to be set to the full "Title - Subtitle" string
   * instead of just the subtitle portion.
   *
   * This method:
   * 1. Checks if subtitle === title (duplication)
   * 2. Checks if subtitle === name (duplication)
   * 3. Removes title prefix from subtitle if present
   * 4. Returns empty string if no valid subtitle found
   *
   * @param subtitle - Raw subtitle from source
   * @param title - Normalized title
   * @param name - App name
   * @returns Clean subtitle without duplication
   */
  private normalizeSubtitle(
    subtitle: string | undefined,
    title: string,
    name: string
  ): string {
    console.log('[NORMALIZER] 🔍 normalizeSubtitle called:', {
      input_subtitle: subtitle,
      title,
      name,
    });

    const cleaned = this.normalizeString(subtitle) || '';

    // If no subtitle, return empty
    if (!cleaned) {
      console.log('[NORMALIZER] ⚠️ No subtitle after cleaning');
      return '';
    }

    // Case 1: Subtitle exactly matches title (complete duplication)
    if (cleaned.toLowerCase() === title.toLowerCase()) {
      console.log('[NORMALIZER] ❌ Subtitle duplication detected: subtitle === title');
      return '';
    }

    // Case 2: Subtitle exactly matches name (complete duplication)
    if (cleaned.toLowerCase() === name.toLowerCase()) {
      console.log('[NORMALIZER] ❌ Subtitle duplication detected: subtitle === name');
      return '';
    }

    // Case 3: Subtitle contains "Title - Actual Subtitle" pattern
    // Remove title prefix and separator
    const separators = [
      ' - ',   // Dash
      ' – ',   // En-dash
      ' — ',   // Em-dash
      ': ',    // Colon
      ' | ',   // Pipe
      ' · ',   // Middot
      ' • ',   // Bullet
    ];
    for (const sep of separators) {
      const prefixPattern = new RegExp(`^${this.escapeRegex(title)}${this.escapeRegex(sep)}`, 'i');
      if (prefixPattern.test(cleaned)) {
        const withoutPrefix = cleaned.replace(prefixPattern, '').trim();
        console.log('[NORMALIZER] 🔧 Removed title prefix from subtitle:', {
          original: cleaned,
          cleaned: withoutPrefix,
        });
        return withoutPrefix;
      }
    }

    // Subtitle is valid and doesn't contain title
    console.log('[NORMALIZER] ✅ Subtitle is valid:', cleaned);
    return cleaned;
  }

  /**
   * FIX: Normalize screenshots field (handle both `screenshots` and `screenshot`)
   *
   * iTunes API returns `screenshotUrls` array
   * Some HTML scrapers return `screenshot` (single string)
   * Normalize to always return array
   */
  private normalizeScreenshots(metadata: any): string[] {
    // Check for screenshots array (preferred)
    if (Array.isArray(metadata.screenshots) && metadata.screenshots.length > 0) {
      return metadata.screenshots
        .filter((url: any) => typeof url === 'string' && url.trim().length > 0)
        .map((url: string) => this.normalizeUrl(url))
        .filter((url): url is string => url !== undefined && url !== '');
    }

    // Check for screenshot single string (legacy)
    if (typeof metadata.screenshot === 'string' && metadata.screenshot.trim().length > 0) {
      const normalized = this.normalizeUrl(metadata.screenshot);
      return normalized ? [normalized] : [];
    }

    // No screenshots found
    return [];
  }

  private normalizeAppId(appId: string | number | undefined): string {
    if (!appId) {
      console.warn('[NORMALIZER] Missing appId, generating fallback');
      return `unknown-${Date.now()}`;
    }
    return String(appId).trim();
  }

  private normalizeString(str: string | undefined): string | undefined {
    if (!str || typeof str !== 'string') return undefined;

    // Decode HTML entities
    const decoded = str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    const trimmed = decoded.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeUrl(url: string | undefined): string | undefined {
    if (!url || typeof url !== 'string') return undefined;
    const trimmed = url.trim();

    // Validate URL format
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      console.warn('[NORMALIZER] Invalid URL format:', trimmed);
      return undefined;
    }
  }

  private normalizeTitle(title: string | undefined, fallbackName: string): string {
    const normalized = this.normalizeString(title);
    if (normalized && normalized.length > 0) return normalized;

    // Fallback to name
    const fallback = this.normalizeString(fallbackName);
    return fallback || 'Unknown App';
  }

  private normalizeRating(rating: number | string | undefined): number {
    if (typeof rating === 'number' && !isNaN(rating)) {
      return Math.max(0, Math.min(5, rating));
    }

    const parsed = Number(rating);
    if (!isNaN(parsed)) {
      return Math.max(0, Math.min(5, parsed));
    }

    return 0;
  }

  private normalizeReviews(reviews: number | string | undefined): number {
    if (typeof reviews === 'number' && !isNaN(reviews)) {
      return Math.max(0, Math.floor(reviews));
    }

    const parsed = Number(reviews);
    if (!isNaN(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }

    return 0;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate field completeness for telemetry
   */
  calculateCompleteness(metadata: ScrapedMetadata): {
    total: number;
    present: number;
    missing: string[];
    completeness: number;
  } {
    const requiredFields = [
      'appId', 'name', 'url', 'title', 'subtitle', 'description',
      'icon', 'rating', 'reviews', 'developer', 'applicationCategory',
    ];

    const missing: string[] = [];
    let present = 0;

    for (const field of requiredFields) {
      const value = (metadata as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        present++;
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
}

export const metadataNormalizer = new MetadataNormalizer();
