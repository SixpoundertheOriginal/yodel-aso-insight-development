# Phase A.5: Technical Specification
## App Store Web Metadata Adapter

**Date:** 2025-01-17
**Phase:** A.5 - Design & Documentation
**Status:** 📋 SPECIFICATION COMPLETE
**Ready for Implementation:** ⚠️ PENDING LEGAL REVIEW

---

## Executive Summary

This document provides the complete technical specification for the App Store Web Metadata Adapter (`AppStoreWebAdapter`). This adapter will fetch metadata directly from Apple App Store web pages to obtain accurate subtitle information and other metadata not available through the iTunes Search/Lookup APIs.

### Key Features

**Primary Capabilities:**
- ✅ Extract accurate subtitle from web page (e.g., "Speak fluently in 30 Days!")
- ✅ Fallback to iTunes API if web scraping fails
- ✅ Two-phase extraction (JSON-LD + DOM parsing)
- ✅ Aggressive caching (24 hour TTL for static, 1 hour for dynamic)
- ✅ Conservative rate limiting (10 requests/minute)
- ✅ Comprehensive error handling and retry logic
- ✅ Security hardening (SSRF, XSS, DoS prevention)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Metadata Orchestrator                      │
│                    (Priority-based)                          │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│ AppStoreWeb      │ │ ItunesSearch │ │ ItunesLookup │
│ Adapter          │ │ Adapter      │ │ Adapter      │
│ (Priority 1)     │ │ (Priority 2) │ │ (Priority 3) │
└──────────────────┘ └──────────────┘ └──────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│         Two-Phase Extraction              │
│  1. JSON-LD (Schema.org structured data) │
│  2. DOM Selectors (cheerio parsing)      │
└──────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│        Metadata Normalizer                │
│  - Subtitle deduplication                 │
│  - Field validation                       │
│  - Schema compliance                      │
└──────────────────────────────────────────┘
```

---

## Table of Contents

1. [Class Design](#1-class-design)
2. [Interface Definitions](#2-interface-definitions)
3. [Extraction Strategy](#3-extraction-strategy)
4. [Field Mapping](#4-field-mapping)
5. [Rate Limiting](#5-rate-limiting)
6. [Caching Strategy](#6-caching-strategy)
7. [Error Handling](#7-error-handling)
8. [Security Implementation](#8-security-implementation)
9. [Configuration](#9-configuration)
10. [Integration Points](#10-integration-points)
11. [Testing Hooks](#11-testing-hooks)
12. [Performance Targets](#12-performance-targets)

---

## 1. Class Design

### 1.1 AppStoreWebAdapter Class

**File:** `src/services/metadata-adapters/appstore-web.adapter.ts`

**Class Structure:**

```typescript
import { MetadataSourceAdapter, ScrapedMetadata, AdapterResult } from './types';
import { MetadataNormalizer } from './normalizer';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { RateLimiter } from './rate-limiter';
import { MetadataCache } from './metadata-cache';
import { SecurityValidator } from './security-validator';

/**
 * App Store Web Metadata Adapter
 *
 * Fetches metadata directly from Apple App Store web pages.
 * Primary source for accurate subtitle data not available in iTunes API.
 *
 * Features:
 * - Two-phase extraction (JSON-LD + DOM)
 * - Aggressive caching (24h static, 1h dynamic)
 * - Conservative rate limiting (10 req/min)
 * - Security hardening (SSRF, XSS, DoS prevention)
 * - Graceful fallback to iTunes API
 *
 * @implements {MetadataSourceAdapter}
 */
export class AppStoreWebAdapter implements MetadataSourceAdapter {
  // Adapter metadata
  readonly name = 'appstore-web';
  readonly priority = 1;  // Highest priority (most accurate)
  readonly cacheTTL = 24 * 60 * 60 * 1000;  // 24 hours

  // Dependencies
  private normalizer: MetadataNormalizer;
  private rateLimiter: RateLimiter;
  private cache: MetadataCache;
  private validator: SecurityValidator;

  // Configuration
  private config: AppStoreWebConfig;

  // State
  private initialized: boolean = false;

  /**
   * Constructor
   * @param config - Adapter configuration
   */
  constructor(config?: Partial<AppStoreWebConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.normalizer = new MetadataNormalizer();
    this.rateLimiter = new RateLimiter({
      maxRequests: this.config.rateLimitMax,
      windowMs: this.config.rateLimitWindow,
    });
    this.cache = new MetadataCache({
      ttl: this.config.cacheTTL,
      maxSize: this.config.cacheMaxSize,
    });
    this.validator = new SecurityValidator();
  }

  /**
   * Initialize adapter (load robots.txt, warm up cache, etc.)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load and parse robots.txt
    await this.loadRobotsTxt();

    // Initialize cache
    await this.cache.initialize();

    // Log initialization
    console.log('[APPSTORE WEB] Adapter initialized');
    this.initialized = true;
  }

  /**
   * Fetch metadata for an app
   *
   * @param appId - Apple App Store ID (numeric string)
   * @param country - ISO 3166-1 alpha-2 country code
   * @returns AdapterResult with metadata or error
   */
  async fetchMetadata(
    appId: string,
    country: string = 'us'
  ): Promise<AdapterResult> {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Security validation
      await this.validateInputs(appId, country);

      // Check cache first
      const cached = await this.getCachedMetadata(appId, country);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: this.name,
          cached: true,
        };
      }

      // Rate limiting
      await this.rateLimiter.acquire();

      // Fetch from web
      const metadata = await this.fetchFromWeb(appId, country);

      // Normalize metadata
      const normalized = this.normalizer.normalize(metadata, this.name);

      // Cache result
      await this.cacheMetadata(appId, country, normalized);

      return {
        success: true,
        data: normalized,
        source: this.name,
        cached: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.name,
      };
    }
  }

  /**
   * Fetch metadata from Apple App Store web page
   *
   * @param appId - App ID
   * @param country - Country code
   * @returns Raw metadata (before normalization)
   */
  private async fetchFromWeb(
    appId: string,
    country: string
  ): Promise<ScrapedMetadata> {
    // Construct URL
    const url = this.constructUrl(appId, country);

    // Validate URL (SSRF prevention)
    await this.validator.validateUrl(url);

    // Check robots.txt
    if (!await this.canFetch(url)) {
      throw new Error(`URL disallowed by robots.txt: ${url}`);
    }

    // Fetch HTML
    const html = await this.fetchHtml(url);

    // Extract metadata (two-phase: JSON-LD + DOM)
    const metadata = await this.extractMetadata(html, appId, country);

    return metadata;
  }

  /**
   * Extract metadata using two-phase strategy
   *
   * Phase 1: JSON-LD structured data (preferred)
   * Phase 2: DOM selectors (fallback)
   *
   * @param html - Raw HTML
   * @param appId - App ID
   * @param country - Country code
   * @returns Extracted metadata
   */
  private async extractMetadata(
    html: string,
    appId: string,
    country: string
  ): Promise<ScrapedMetadata> {
    const $ = cheerio.load(html);

    // Phase 1: Try JSON-LD extraction
    const jsonLdData = this.extractFromJsonLd($);

    // Phase 2: DOM selector extraction (fills in gaps)
    const domData = this.extractFromDom($);

    // Merge data (JSON-LD preferred, DOM as fallback)
    const mergedData: ScrapedMetadata = {
      // Core fields
      appId: appId,
      name: jsonLdData.name || domData.name || 'Unknown App',
      url: `https://apps.apple.com/${country}/app/id${appId}`,
      locale: `${country.toLowerCase()}-${country.toUpperCase()}`,

      // Title/Subtitle (PRIORITY: DOM subtitle > JSON-LD subtitle > title split)
      title: domData.title || jsonLdData.name || domData.name || 'Unknown App',
      subtitle: domData.subtitle || jsonLdData.subtitle || '',

      // Metadata
      description: jsonLdData.description || domData.description || '',
      applicationCategory: jsonLdData.applicationCategory || domData.category || '',
      developer: jsonLdData.author?.name || domData.developer || '',

      // Metrics
      rating: jsonLdData.aggregateRating?.ratingValue || domData.rating || 0,
      reviews: jsonLdData.aggregateRating?.reviewCount || domData.reviews || 0,
      price: jsonLdData.offers?.price || domData.price || 'Free',

      // Creative assets
      icon: jsonLdData.image || domData.icon || '',
      screenshots: domData.screenshots || [],
    };

    return mergedData;
  }

  /**
   * Extract metadata from JSON-LD structured data
   *
   * JSON-LD is embedded in <script type="application/ld+json">
   * Follows Schema.org SoftwareApplication format
   *
   * @param $ - Cheerio instance
   * @returns Extracted data (partial)
   */
  private extractFromJsonLd($: cheerio.CheerioAPI): Partial<any> {
    try {
      const scriptTag = $('script[type="application/ld+json"]').first();
      if (!scriptTag || !scriptTag.html()) {
        console.log('[APPSTORE WEB] No JSON-LD found');
        return {};
      }

      const jsonLd = JSON.parse(scriptTag.html()!);

      // Schema.org SoftwareApplication structure
      return {
        name: jsonLd.name,
        description: jsonLd.description,
        applicationCategory: jsonLd.applicationCategory,
        author: jsonLd.author,  // { "@type": "Organization", "name": "Developer Name" }
        aggregateRating: jsonLd.aggregateRating,  // { ratingValue, reviewCount }
        offers: jsonLd.offers,  // { price, priceCurrency }
        image: jsonLd.image,
        operatingSystem: jsonLd.operatingSystem,
      };
    } catch (error) {
      console.error('[APPSTORE WEB] JSON-LD parse error:', error);
      return {};
    }
  }

  /**
   * Extract metadata from DOM using CSS selectors
   *
   * Uses multiple selector strategies with fallbacks.
   * Sanitizes all extracted text to prevent XSS.
   *
   * @param $ - Cheerio instance
   * @returns Extracted data (partial)
   */
  private extractFromDom($: cheerio.CheerioAPI): Partial<any> {
    return {
      // CRITICAL: Subtitle (primary goal of web adapter)
      subtitle: this.extractSubtitle($),

      // Title (may differ from name)
      title: this.extractTitle($),

      // Name (app name)
      name: this.extractName($),

      // Description
      description: this.extractDescription($),

      // Category
      category: this.extractCategory($),

      // Developer
      developer: this.extractDeveloper($),

      // Rating
      rating: this.extractRating($),

      // Reviews
      reviews: this.extractReviews($),

      // Price
      price: this.extractPrice($),

      // Icon
      icon: this.extractIcon($),

      // Screenshots
      screenshots: this.extractScreenshots($),
    };
  }

  /**
   * Extract subtitle from DOM
   *
   * Subtitle is the MAIN reason for web scraping.
   * Uses multiple selector strategies with fallbacks.
   *
   * Example: "Speak fluently in 30 Days!" (Pimsleur app)
   *
   * @param $ - Cheerio instance
   * @returns Subtitle text (sanitized)
   */
  private extractSubtitle($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__subtitle',           // Primary (observed)
      'h2.product-header__subtitle',
      '[data-test="subtitle"]',
      '.app-header__subtitle',
      'p.subtitle',
      'h2.subtitle',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const subtitle = element.text().trim();
        // Sanitize to prevent XSS
        return this.validator.sanitizeText(subtitle);
      }
    }

    console.log('[APPSTORE WEB] Subtitle not found (using selectors)');
    return '';
  }

  /**
   * Extract title from DOM
   *
   * @param $ - Cheerio instance
   * @returns Title text (sanitized)
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    const selectors = [
      'h1.product-header__title',
      '.product-header__title',
      '[data-test="app-header__title"]',
      'h1.app-header__title',
      'h1',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const title = element.text().trim();
        return this.validator.sanitizeText(title);
      }
    }

    return '';
  }

  /**
   * Extract app name from DOM
   * (May be same as title, but sometimes different)
   *
   * @param $ - Cheerio instance
   * @returns Name text (sanitized)
   */
  private extractName($: cheerio.CheerioAPI): string {
    // Try title first (most reliable)
    return this.extractTitle($);
  }

  /**
   * Extract description from DOM
   *
   * @param $ - Cheerio instance
   * @returns Description text (sanitized)
   */
  private extractDescription($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__description',
      '[data-test="app-description"]',
      '.section__description',
      'p.description',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const description = element.text().trim();
        return this.validator.sanitizeText(description);
      }
    }

    return '';
  }

  /**
   * Extract category from DOM
   *
   * @param $ - Cheerio instance
   * @returns Category text (sanitized)
   */
  private extractCategory($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__list a[href*="/genre/"]',
      '[data-test="category-link"]',
      '.app-header__category',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const category = element.text().trim();
        return this.validator.sanitizeText(category);
      }
    }

    return '';
  }

  /**
   * Extract developer name from DOM
   *
   * @param $ - Cheerio instance
   * @returns Developer name (sanitized)
   */
  private extractDeveloper($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__identity a',
      '[data-test="developer-name"]',
      '.app-header__developer',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const developer = element.text().trim();
        return this.validator.sanitizeText(developer);
      }
    }

    return '';
  }

  /**
   * Extract rating from DOM
   *
   * @param $ - Cheerio instance
   * @returns Rating value (0-5)
   */
  private extractRating($: cheerio.CheerioAPI): number {
    const selectors = [
      '.product-header__ratings .we-customer-ratings__averages__display',
      '[data-test="star-rating"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const ratingText = element.text().trim();
        const rating = parseFloat(ratingText);
        if (!isNaN(rating)) {
          return Math.max(0, Math.min(5, rating));
        }
      }
    }

    return 0;
  }

  /**
   * Extract review count from DOM
   *
   * @param $ - Cheerio instance
   * @returns Review count (integer)
   */
  private extractReviews($: cheerio.CheerioAPI): number {
    const selectors = [
      '.product-header__ratings .we-customer-ratings__count',
      '[data-test="review-count"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const reviewText = element.text().trim();
        // Extract number from text like "1.2K Ratings"
        const match = reviewText.match(/(\d+(?:\.\d+)?)\s*([KkMm])?/);
        if (match) {
          const number = parseFloat(match[1]);
          const multiplier = match[2]?.toLowerCase();
          if (multiplier === 'k') {
            return Math.floor(number * 1000);
          } else if (multiplier === 'm') {
            return Math.floor(number * 1000000);
          }
          return Math.floor(number);
        }
      }
    }

    return 0;
  }

  /**
   * Extract price from DOM
   *
   * @param $ - Cheerio instance
   * @returns Price string (e.g., "Free", "$4.99")
   */
  private extractPrice($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__price',
      '[data-test="app-price"]',
      '.app-header__price',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element && element.text()) {
        const price = element.text().trim();
        return this.validator.sanitizeText(price);
      }
    }

    return 'Free';
  }

  /**
   * Extract icon URL from DOM
   *
   * @param $ - Cheerio instance
   * @returns Icon URL (validated)
   */
  private extractIcon($: cheerio.CheerioAPI): string {
    const selectors = [
      '.product-header__icon source',
      '.product-header__icon img',
      '[data-test="app-icon"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      const url = element.attr('srcset') || element.attr('src');
      if (url) {
        try {
          return this.validator.sanitizeUrl(url);
        } catch {
          continue;
        }
      }
    }

    return '';
  }

  /**
   * Extract screenshots from DOM
   *
   * @param $ - Cheerio instance
   * @returns Array of screenshot URLs (validated)
   */
  private extractScreenshots($: cheerio.CheerioAPI): string[] {
    const screenshots: string[] = [];

    const selectors = [
      '.product-media__item picture source',
      '.product-media__item img',
      '[data-test="screenshot"]',
    ];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        const url = $el.attr('srcset') || $el.attr('src');
        if (url) {
          try {
            const validatedUrl = this.validator.sanitizeUrl(url);
            if (validatedUrl && !screenshots.includes(validatedUrl)) {
              screenshots.push(validatedUrl);
            }
          } catch {
            // Skip invalid URLs
          }
        }
      });

      // If found screenshots, return
      if (screenshots.length > 0) {
        return screenshots;
      }
    }

    return screenshots;
  }

  // ... Additional methods (see sections below)
}
```

---

## 2. Interface Definitions

### 2.1 Core Interfaces

**File:** `src/services/metadata-adapters/types.ts`

```typescript
/**
 * Metadata source adapter interface
 *
 * All adapters must implement this interface.
 */
export interface MetadataSourceAdapter {
  /** Adapter name (e.g., "appstore-web") */
  readonly name: string;

  /** Priority (1 = highest, 3 = lowest) */
  readonly priority: number;

  /** Cache TTL in milliseconds */
  readonly cacheTTL: number;

  /**
   * Initialize adapter (optional)
   * Called once before first use
   */
  initialize?(): Promise<void>;

  /**
   * Fetch metadata for an app
   *
   * @param appId - App Store ID
   * @param country - Country code (ISO 3166-1 alpha-2)
   * @returns AdapterResult with metadata or error
   */
  fetchMetadata(appId: string, country?: string): Promise<AdapterResult>;
}

/**
 * Adapter result
 */
export interface AdapterResult {
  /** Success flag */
  success: boolean;

  /** Metadata (if success) */
  data?: ScrapedMetadata;

  /** Error message (if failure) */
  error?: string;

  /** Source adapter name */
  source: string;

  /** Was result from cache? */
  cached?: boolean;

  /** Response time in milliseconds */
  responseTime?: number;
}

/**
 * Scraped metadata schema (v1.1)
 *
 * This is the unified schema for all metadata sources.
 */
export interface ScrapedMetadata {
  // Core fields (required)
  appId: string;
  name: string;
  url: string;
  locale: string;

  // Title/Subtitle
  title: string;
  subtitle?: string;

  // Optional metadata
  description?: string;
  applicationCategory?: string;
  developer?: string;

  // Metrics
  rating?: number;
  reviews?: number;
  price?: string;

  // Creative assets
  icon?: string;
  screenshots?: string[];

  // Source tracking (added by normalizer)
  _source?: string;
  _normalized?: boolean;
  _schemaVersion?: string;
  _timestamp?: string;
}

/**
 * Normalized metadata (after normalization)
 *
 * Same as ScrapedMetadata but with guarantees:
 * - All required fields present
 * - No subtitle duplication
 * - Sanitized (XSS prevention)
 */
export interface NormalizedMetadata extends ScrapedMetadata {
  _source: string;
  _normalized: true;
  _schemaVersion: string;
  _timestamp: string;
}
```

---

### 2.2 Configuration Interface

**File:** `src/services/metadata-adapters/appstore-web.adapter.ts`

```typescript
/**
 * App Store Web Adapter Configuration
 */
export interface AppStoreWebConfig {
  /** Rate limit: max requests per window */
  rateLimitMax: number;

  /** Rate limit: time window in milliseconds */
  rateLimitWindow: number;

  /** Cache TTL in milliseconds */
  cacheTTL: number;

  /** Cache max size (number of entries) */
  cacheMaxSize: number;

  /** Request timeout in milliseconds */
  requestTimeout: number;

  /** User-Agent string */
  userAgent: string;

  /** Enable robots.txt checking */
  respectRobotsTxt: boolean;

  /** Retry attempts on failure */
  maxRetries: number;

  /** Retry delay in milliseconds */
  retryDelay: number;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: AppStoreWebConfig = {
  rateLimitMax: 10,
  rateLimitWindow: 60 * 1000,  // 1 minute
  cacheTTL: 24 * 60 * 60 * 1000,  // 24 hours
  cacheMaxSize: 10000,  // 10k apps
  requestTimeout: 5000,  // 5 seconds
  userAgent: 'YodelASOInsight/1.0 (+https://yodelaso.com/bot) contact@yodelaso.com',
  respectRobotsTxt: true,
  maxRetries: 3,
  retryDelay: 1000,  // 1 second
};
```

---

## 3. Extraction Strategy

### 3.1 Two-Phase Extraction

**Phase 1: JSON-LD Structured Data**

```typescript
/**
 * JSON-LD extraction (preferred)
 *
 * Advantages:
 * - Structured, machine-readable
 * - Follows Schema.org standard
 * - Less fragile than DOM selectors
 *
 * Disadvantages:
 * - May not include subtitle
 * - May be incomplete
 */
private extractFromJsonLd($: cheerio.CheerioAPI): Partial<JsonLdData> {
  const scriptTag = $('script[type="application/ld+json"]').first();
  if (!scriptTag?.html()) return {};

  const jsonLd = JSON.parse(scriptTag.html()!);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: jsonLd.name,
    description: jsonLd.description,
    applicationCategory: jsonLd.applicationCategory,
    author: {
      '@type': 'Organization',
      name: jsonLd.author?.name,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: jsonLd.aggregateRating?.ratingValue,
      reviewCount: jsonLd.aggregateRating?.reviewCount,
    },
    offers: {
      '@type': 'Offer',
      price: jsonLd.offers?.price,
      priceCurrency: jsonLd.offers?.priceCurrency,
    },
    image: jsonLd.image,
    operatingSystem: jsonLd.operatingSystem,
  };
}
```

**Phase 2: DOM Selector Extraction**

```typescript
/**
 * DOM extraction (fallback and supplement)
 *
 * Advantages:
 * - Can extract subtitle (not in JSON-LD)
 * - Can extract screenshots
 * - More complete data
 *
 * Disadvantages:
 * - Fragile (DOM changes break selectors)
 * - Requires selector fallbacks
 * - Requires sanitization (XSS risk)
 */
private extractFromDom($: cheerio.CheerioAPI): Partial<DomData> {
  return {
    subtitle: this.extractWithFallback($, [
      '.product-header__subtitle',
      'h2.product-header__subtitle',
      '[data-test="subtitle"]',
    ]),

    title: this.extractWithFallback($, [
      'h1.product-header__title',
      '.product-header__title',
      'h1',
    ]),

    description: this.extractWithFallback($, [
      '.product-header__description',
      '[data-test="app-description"]',
    ]),

    // ... other fields
  };
}

/**
 * Extract text using multiple selector fallbacks
 *
 * Tries selectors in order until one succeeds.
 */
private extractWithFallback(
  $: cheerio.CheerioAPI,
  selectors: string[]
): string {
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element && element.text()) {
      const text = element.text().trim();
      return this.validator.sanitizeText(text);
    }
  }
  return '';
}
```

### 3.2 Selector Fallback Strategy

**Selector Priority Order:**

1. **Primary Selector** - Most specific, observed in current DOM
2. **Semantic Selector** - Uses semantic HTML (h1, h2, etc.)
3. **Data Attribute** - Uses data-test or data-* attributes
4. **Class Selector** - Generic class names
5. **Tag Selector** - Last resort (h1, p, etc.)

**Example: Subtitle Selector Fallbacks**

```typescript
const SUBTITLE_SELECTORS = [
  // Priority 1: Specific class (observed in Pimsleur app page)
  '.product-header__subtitle',

  // Priority 2: Semantic + class
  'h2.product-header__subtitle',

  // Priority 3: Data attribute
  '[data-test="subtitle"]',
  '[data-test="app-subtitle"]',

  // Priority 4: Generic classes
  '.app-header__subtitle',
  '.subtitle',

  // Priority 5: Semantic tags (risky - may match wrong element)
  'header h2',
  'h2',
];
```

**Validation After Extraction:**

```typescript
private extractSubtitle($: cheerio.CheerioAPI): string {
  for (const selector of SUBTITLE_SELECTORS) {
    const text = this.extractText($, selector);

    // Validate extracted text
    if (this.isValidSubtitle(text)) {
      return text;
    }
  }

  return '';
}

private isValidSubtitle(text: string): boolean {
  if (!text || text.length === 0) return false;

  // Subtitle should be 1-100 characters
  if (text.length > 100) return false;

  // Should not be a URL
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return false;
  }

  // Should not be a JSON string
  if (text.startsWith('{') || text.startsWith('[')) {
    return false;
  }

  return true;
}
```

---

## 4. Field Mapping

### 4.1 Field Priority Matrix

**When multiple sources provide same field, use priority:**

| Field | Priority 1 | Priority 2 | Priority 3 |
|-------|-----------|-----------|-----------|
| **subtitle** | DOM `.product-header__subtitle` | JSON-LD (if exists) | Title split (last resort) |
| **title** | DOM `h1.product-header__title` | JSON-LD `name` | Name field |
| **name** | DOM title | JSON-LD `name` | AppId |
| **description** | JSON-LD `description` | DOM `.product-header__description` | Empty |
| **category** | JSON-LD `applicationCategory` | DOM category link | Empty |
| **developer** | JSON-LD `author.name` | DOM developer link | Empty |
| **rating** | JSON-LD `aggregateRating.ratingValue` | DOM rating display | 0 |
| **reviews** | JSON-LD `aggregateRating.reviewCount` | DOM review count | 0 |
| **price** | JSON-LD `offers.price` | DOM price display | "Free" |
| **icon** | JSON-LD `image` | DOM icon img | Empty |
| **screenshots** | DOM `.product-media img` | (no fallback) | [] |

### 4.2 Field Merging Logic

```typescript
/**
 * Merge JSON-LD and DOM data
 *
 * Uses priority matrix to select best value for each field.
 */
private mergeExtractedData(
  jsonLd: Partial<JsonLdData>,
  dom: Partial<DomData>
): ScrapedMetadata {
  return {
    // Core fields
    appId: this.appId,
    name: dom.title || jsonLd.name || dom.name || 'Unknown App',
    url: this.constructedUrl,
    locale: this.locale,

    // Title/Subtitle (CRITICAL)
    title: dom.title || jsonLd.name || 'Unknown App',
    subtitle: dom.subtitle || jsonLd.subtitle || this.extractSubtitleFromTitle(dom.title),

    // Metadata (JSON-LD preferred for structured data)
    description: jsonLd.description || dom.description || '',
    applicationCategory: jsonLd.applicationCategory || dom.category || '',
    developer: jsonLd.author?.name || dom.developer || '',

    // Metrics (JSON-LD preferred for accuracy)
    rating: jsonLd.aggregateRating?.ratingValue || dom.rating || 0,
    reviews: jsonLd.aggregateRating?.reviewCount || dom.reviews || 0,
    price: jsonLd.offers?.price || dom.price || 'Free',

    // Creative assets (DOM only - not in JSON-LD usually)
    icon: dom.icon || jsonLd.image || '',
    screenshots: dom.screenshots || [],
  };
}

/**
 * Last resort: extract subtitle from title
 *
 * If DOM subtitle not found, try splitting title.
 * Example: "Pimsleur | Language Learning" → title="Pimsleur", subtitle="Language Learning"
 */
private extractSubtitleFromTitle(title: string): string {
  const separators = [' | ', ' - ', ' – ', ' — ', ': '];

  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep, 2);
      if (parts.length === 2) {
        return parts[1].trim();
      }
    }
  }

  return '';
}
```

---

## 5. Rate Limiting

### 5.1 Token Bucket Implementation

**File:** `src/services/metadata-adapters/rate-limiter.ts`

```typescript
/**
 * Token Bucket Rate Limiter
 *
 * Algorithm:
 * - Bucket holds N tokens (capacity)
 * - Tokens refill at R tokens/second
 * - Each request consumes 1 token
 * - If no tokens available, wait until refill
 *
 * Example: 10 req/min
 * - Capacity: 10 tokens
 * - Refill rate: 10/60 = 0.167 tokens/second
 * - Average delay: 6 seconds between requests
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.capacity = config.maxRequests;
    this.refillRate = config.maxRequests / (config.windowMs / 1000);
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token (may wait if none available)
   *
   * Returns a promise that resolves when token is acquired.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time
    const tokensNeeded = 1 - this.tokens;
    const waitMs = (tokensNeeded / this.refillRate) * 1000;

    console.log(`[RATE LIMITER] Waiting ${Math.ceil(waitMs)}ms for token`);
    await this.sleep(waitMs);

    return this.acquire();
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const elapsedSeconds = elapsedMs / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current token count (for monitoring)
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}
```

### 5.2 Rate Limit Monitoring

```typescript
/**
 * Rate limit telemetry
 *
 * Tracks rate limit metrics for monitoring.
 */
export class RateLimitTelemetry {
  private requestCount = 0;
  private waitTimeTotal = 0;
  private lastReset = Date.now();

  recordRequest(waitTime: number = 0): void {
    this.requestCount++;
    this.waitTimeTotal += waitTime;
  }

  getMetrics(): {
    requestCount: number;
    avgWaitTime: number;
    requestRate: number;
  } {
    const elapsedMinutes = (Date.now() - this.lastReset) / 60000;

    return {
      requestCount: this.requestCount,
      avgWaitTime: this.requestCount > 0 ? this.waitTimeTotal / this.requestCount : 0,
      requestRate: this.requestCount / elapsedMinutes,
    };
  }

  reset(): void {
    this.requestCount = 0;
    this.waitTimeTotal = 0;
    this.lastReset = Date.now();
  }
}
```

---

## 6. Caching Strategy

### 6.1 Two-Tier Cache

**Tier 1: Static Metadata (24 hour TTL)**
- App name, developer, category
- Icon URL
- Description

**Tier 2: Dynamic Metadata (1 hour TTL)**
- Rating
- Review count
- Screenshots (may change)

```typescript
/**
 * Metadata cache with two-tier TTL
 */
export class MetadataCache {
  private staticCache: NodeCache;  // 24 hour TTL
  private dynamicCache: NodeCache;  // 1 hour TTL

  constructor(config: { ttl: number; maxSize: number }) {
    this.staticCache = new NodeCache({
      stdTTL: 24 * 60 * 60,  // 24 hours
      checkperiod: 60 * 60,   // Check every hour
      maxKeys: config.maxSize,
    });

    this.dynamicCache = new NodeCache({
      stdTTL: 60 * 60,  // 1 hour
      checkperiod: 5 * 60,  // Check every 5 minutes
      maxKeys: config.maxSize,
    });
  }

  /**
   * Get cached metadata
   *
   * Merges static and dynamic caches.
   * Returns null if either cache misses.
   */
  get(key: string): ScrapedMetadata | null {
    const staticData = this.staticCache.get<Partial<ScrapedMetadata>>(key);
    const dynamicData = this.dynamicCache.get<Partial<ScrapedMetadata>>(key);

    if (!staticData || !dynamicData) {
      return null;
    }

    return {
      ...staticData,
      ...dynamicData,
    } as ScrapedMetadata;
  }

  /**
   * Set cached metadata
   *
   * Splits into static and dynamic fields.
   */
  set(key: string, metadata: ScrapedMetadata): void {
    // Static fields (24h TTL)
    const staticData: Partial<ScrapedMetadata> = {
      appId: metadata.appId,
      name: metadata.name,
      url: metadata.url,
      locale: metadata.locale,
      title: metadata.title,
      subtitle: metadata.subtitle,
      description: metadata.description,
      applicationCategory: metadata.applicationCategory,
      developer: metadata.developer,
      icon: metadata.icon,
      price: metadata.price,
    };

    // Dynamic fields (1h TTL)
    const dynamicData: Partial<ScrapedMetadata> = {
      rating: metadata.rating,
      reviews: metadata.reviews,
      screenshots: metadata.screenshots,
    };

    this.staticCache.set(key, staticData);
    this.dynamicCache.set(key, dynamicData);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.staticCache.flushAll();
    this.dynamicCache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    staticKeys: number;
    dynamicKeys: number;
    staticHitRate: number;
    dynamicHitRate: number;
  } {
    return {
      staticKeys: this.staticCache.keys().length,
      dynamicKeys: this.dynamicCache.keys().length,
      staticHitRate: this.staticCache.getStats().hits / (this.staticCache.getStats().hits + this.staticCache.getStats().misses),
      dynamicHitRate: this.dynamicCache.getStats().hits / (this.dynamicCache.getStats().hits + this.dynamicCache.getStats().misses),
    };
  }
}
```

### 6.2 Cache Key Strategy

```typescript
/**
 * Generate cache key
 *
 * Format: "{adapter}:{appId}:{country}"
 * Example: "appstore-web:1405735469:us"
 */
private getCacheKey(appId: string, country: string): string {
  return `${this.name}:${appId}:${country.toLowerCase()}`;
}

/**
 * Get cached metadata
 */
private async getCachedMetadata(
  appId: string,
  country: string
): Promise<ScrapedMetadata | null> {
  const key = this.getCacheKey(appId, country);
  const cached = this.cache.get(key);

  if (cached) {
    console.log('[CACHE HIT]', key);
    return cached;
  }

  console.log('[CACHE MISS]', key);
  return null;
}

/**
 * Cache metadata
 */
private async cacheMetadata(
  appId: string,
  country: string,
  metadata: ScrapedMetadata
): Promise<void> {
  const key = this.getCacheKey(appId, country);
  this.cache.set(key, metadata);
  console.log('[CACHE SET]', key);
}
```

---

## 7. Error Handling

### 7.1 Error Types

```typescript
/**
 * Custom error types for web adapter
 */

export class WebAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'WebAdapterError';
  }
}

export class NetworkError extends WebAdapterError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', true);  // Retryable
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends WebAdapterError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR', true);  // Retryable
    this.name = 'TimeoutError';
  }
}

export class ParseError extends WebAdapterError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR', false);  // Not retryable
    this.name = 'ParseError';
  }
}

export class BlockedError extends WebAdapterError {
  constructor(message: string) {
    super(message, 'BLOCKED_ERROR', false);  // Not retryable
    this.name = 'BlockedError';
  }
}

export class ValidationError extends WebAdapterError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', false);  // Not retryable
    this.name = 'ValidationError';
  }
}
```

### 7.2 Retry Logic

```typescript
/**
 * Fetch with retry
 *
 * Retries on network errors and timeouts.
 * Does NOT retry on validation or parse errors.
 */
private async fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = this.config.maxRetries
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if retryable
      if (error instanceof WebAdapterError && !error.retryable) {
        throw error;
      }

      // Last attempt, throw
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      const delay = this.config.retryDelay * Math.pow(2, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`);
      await this.sleep(delay);
    }
  }

  throw lastError;
}
```

### 7.3 Error Recovery

```typescript
/**
 * Fetch metadata with comprehensive error handling
 */
async fetchMetadata(appId: string, country: string = 'us'): Promise<AdapterResult> {
  const startTime = Date.now();

  try {
    // Validate inputs
    await this.validateInputs(appId, country);

    // Check cache
    const cached = await this.getCachedMetadata(appId, country);
    if (cached) {
      return {
        success: true,
        data: cached,
        source: this.name,
        cached: true,
        responseTime: Date.now() - startTime,
      };
    }

    // Rate limiting
    await this.rateLimiter.acquire();

    // Fetch with retry
    const metadata = await this.fetchWithRetry(() =>
      this.fetchFromWeb(appId, country)
    );

    // Normalize
    const normalized = this.normalizer.normalize(metadata, this.name);

    // Cache
    await this.cacheMetadata(appId, country, normalized);

    return {
      success: true,
      data: normalized,
      source: this.name,
      cached: false,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    // Log error
    console.error('[APPSTORE WEB] Error:', error);

    // Return error result (allows fallback to other adapters)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: this.name,
      responseTime: Date.now() - startTime,
    };
  }
}
```

---

## 8. Security Implementation

### 8.1 Input Validation

**File:** `src/services/metadata-adapters/security-validator.ts`

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export class SecurityValidator {
  private static ALLOWED_HOSTS = ['apps.apple.com', 'itunes.apple.com'];
  private static ALLOWED_COUNTRIES = [
    'us', 'gb', 'de', 'fr', 'jp', 'cn', 'au', 'ca', 'in', 'br',
    // ... full ISO 3166-1 alpha-2 list
  ];

  /**
   * Validate App ID
   */
  validateAppId(appId: string): void {
    const schema = z.string().regex(/^\d{6,12}$/, 'Invalid App ID format');

    try {
      schema.parse(appId);
    } catch (error) {
      throw new ValidationError(`Invalid App ID: ${appId}`);
    }
  }

  /**
   * Validate country code
   */
  validateCountryCode(country: string): void {
    if (!SecurityValidator.ALLOWED_COUNTRIES.includes(country.toLowerCase())) {
      throw new ValidationError(`Invalid country code: ${country}`);
    }
  }

  /**
   * Validate URL (SSRF prevention)
   */
  async validateUrl(url: string): Promise<void> {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    // Check protocol
    if (parsedUrl.protocol !== 'https:') {
      throw new ValidationError('Only HTTPS URLs allowed');
    }

    // Check host allowlist
    if (!SecurityValidator.ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      throw new ValidationError(`Host not allowed: ${parsedUrl.hostname}`);
    }

    // Check for path traversal
    if (parsedUrl.pathname.includes('..')) {
      throw new ValidationError('Path traversal detected');
    }

    // DNS resolution check (prevent private IPs)
    await this.validateHost(parsedUrl.hostname);
  }

  /**
   * Validate hostname resolves to public IP
   */
  private async validateHost(hostname: string): Promise<void> {
    const dns = await import('dns/promises');

    try {
      const addresses = await dns.resolve4(hostname);

      for (const ip of addresses) {
        if (this.isPrivateIp(ip)) {
          throw new ValidationError(`Private IP detected: ${ip}`);
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(`DNS resolution failed: ${hostname}`);
    }
  }

  /**
   * Check if IP is private/internal
   */
  private isPrivateIp(ip: string): boolean {
    const patterns = [
      /^127\./,          // Loopback
      /^10\./,           // Private
      /^172\.(1[6-9]|2\d|3[01])\./, // Private
      /^192\.168\./,     // Private
      /^169\.254\./,     // Link-local
    ];

    return patterns.some(pattern => pattern.test(ip)) || ip === '169.254.169.254';
  }

  /**
   * Sanitize text (XSS prevention)
   */
  sanitizeText(text: string): string {
    // Remove all HTML tags
    const cleaned = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    // Decode HTML entities
    return this.decodeHtmlEntities(cleaned).trim();
  }

  /**
   * Sanitize URL
   */
  sanitizeUrl(url: string): string {
    // Block javascript: and data: URLs
    if (/^(javascript|data|vbscript):/i.test(url)) {
      throw new ValidationError('Malicious URL scheme detected');
    }

    // Only allow https:
    if (!url.startsWith('https://') && !url.startsWith('//')) {
      throw new ValidationError('Only HTTPS URLs allowed');
    }

    return DOMPurify.sanitize(url, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
```

### 8.2 HTTPS Enforcement

```typescript
/**
 * Fetch HTML with security measures
 */
private async fetchHtml(url: string): Promise<string> {
  const https = await import('https');

  const httpsAgent = new https.Agent({
    rejectUnauthorized: true,  // Validate certificates
    minVersion: 'TLSv1.2',     // Minimum TLS 1.2
    maxVersion: 'TLSv1.3',     // Prefer TLS 1.3
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), this.config.requestTimeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      agent: httpsAgent,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new BlockedError(`Blocked by Apple: ${response.status}`);
      }
      throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${this.config.requestTimeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

---

## 9. Configuration

### 9.1 Environment Variables

```typescript
/**
 * Load configuration from environment variables
 */
export function loadConfig(): AppStoreWebConfig {
  return {
    rateLimitMax: parseInt(process.env.APPSTORE_RATE_LIMIT_MAX || '10'),
    rateLimitWindow: parseInt(process.env.APPSTORE_RATE_LIMIT_WINDOW || '60000'),
    cacheTTL: parseInt(process.env.APPSTORE_CACHE_TTL || '86400000'),
    cacheMaxSize: parseInt(process.env.APPSTORE_CACHE_MAX_SIZE || '10000'),
    requestTimeout: parseInt(process.env.APPSTORE_REQUEST_TIMEOUT || '5000'),
    userAgent: process.env.APPSTORE_USER_AGENT || DEFAULT_CONFIG.userAgent,
    respectRobotsTxt: process.env.APPSTORE_RESPECT_ROBOTS !== 'false',
    maxRetries: parseInt(process.env.APPSTORE_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.APPSTORE_RETRY_DELAY || '1000'),
  };
}
```

### 9.2 Feature Flags

```typescript
/**
 * Feature flags for gradual rollout
 */
export interface FeatureFlags {
  /** Enable web adapter (master switch) */
  enableWebAdapter: boolean;

  /** Percentage of requests to use web adapter (0-100) */
  webAdapterSampleRate: number;

  /** Enable two-phase extraction (JSON-LD + DOM) */
  enableTwoPhaseExtraction: boolean;

  /** Enable aggressive caching */
  enableCaching: boolean;

  /** Enable rate limiting */
  enableRateLimiting: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableWebAdapter: false,  // Disabled by default (require opt-in)
  webAdapterSampleRate: 10,  // Start with 10% traffic
  enableTwoPhaseExtraction: true,
  enableCaching: true,
  enableRateLimiting: true,
};
```

---

## 10. Integration Points

### 10.1 Metadata Orchestrator

**File:** `src/services/metadata-orchestrator.ts`

```typescript
import { AppStoreWebAdapter } from './metadata-adapters/appstore-web.adapter';
import { ItunesSearchAdapter } from './metadata-adapters/itunes-search.adapter';
import { ItunesLookupAdapter } from './metadata-adapters/itunes-lookup.adapter';

/**
 * Metadata Orchestrator
 *
 * Coordinates multiple metadata adapters with fallback logic.
 */
export class MetadataOrchestrator {
  private adapters: MetadataSourceAdapter[];

  constructor() {
    // Initialize adapters in priority order
    this.adapters = [
      new AppStoreWebAdapter(),          // Priority 1
      new ItunesSearchAdapter(),         // Priority 2
      new ItunesLookupAdapter(),         // Priority 3
    ];
  }

  /**
   * Initialize all adapters
   */
  async initialize(): Promise<void> {
    for (const adapter of this.adapters) {
      if (adapter.initialize) {
        await adapter.initialize();
      }
    }
  }

  /**
   * Fetch metadata with fallback waterfall
   *
   * Tries adapters in priority order until one succeeds.
   */
  async fetchMetadata(appId: string, country: string = 'us'): Promise<AdapterResult> {
    for (const adapter of this.adapters) {
      console.log(`[ORCHESTRATOR] Trying adapter: ${adapter.name}`);

      const result = await adapter.fetchMetadata(appId, country);

      if (result.success) {
        console.log(`[ORCHESTRATOR] Success with adapter: ${adapter.name}`);
        return result;
      }

      console.log(`[ORCHESTRATOR] Failed with adapter: ${adapter.name}`, result.error);
    }

    // All adapters failed
    return {
      success: false,
      error: 'All metadata adapters failed',
      source: 'orchestrator',
    };
  }

  /**
   * Fetch metadata with field-level fallback
   *
   * Combines results from multiple adapters to get best data for each field.
   */
  async fetchMetadataHybrid(appId: string, country: string = 'us'): Promise<AdapterResult> {
    const results: AdapterResult[] = [];

    // Fetch from all adapters (parallel)
    await Promise.all(
      this.adapters.map(async adapter => {
        const result = await adapter.fetchMetadata(appId, country);
        if (result.success) {
          results.push(result);
        }
      })
    );

    if (results.length === 0) {
      return {
        success: false,
        error: 'All adapters failed',
        source: 'orchestrator',
      };
    }

    // Merge results (priority-based)
    const merged = this.mergeResults(results);

    return {
      success: true,
      data: merged,
      source: 'orchestrator-hybrid',
    };
  }

  /**
   * Merge results from multiple adapters
   *
   * Uses field priority matrix.
   */
  private mergeResults(results: AdapterResult[]): ScrapedMetadata {
    // Sort by adapter priority
    results.sort((a, b) => {
      const adapterA = this.adapters.find(ad => ad.name === a.source);
      const adapterB = this.adapters.find(ad => ad.name === b.source);
      return (adapterA?.priority || 999) - (adapterB?.priority || 999);
    });

    // Start with highest priority result
    const merged: ScrapedMetadata = { ...results[0].data! };

    // Fill in missing fields from lower priority adapters
    for (let i = 1; i < results.length; i++) {
      const data = results[i].data!;

      // Only use field if not present in merged
      if (!merged.subtitle && data.subtitle) merged.subtitle = data.subtitle;
      if (!merged.description && data.description) merged.description = data.description;
      if (!merged.developer && data.developer) merged.developer = data.developer;
      if (!merged.rating && data.rating) merged.rating = data.rating;
      if (!merged.reviews && data.reviews) merged.reviews = data.reviews;
      if (!merged.icon && data.icon) merged.icon = data.icon;
      if ((!merged.screenshots || merged.screenshots.length === 0) && data.screenshots) {
        merged.screenshots = data.screenshots;
      }
    }

    return merged;
  }
}
```

---

## 11. Testing Hooks

### 11.1 Test Mode

```typescript
/**
 * Enable test mode (bypasses rate limiting, uses mock data)
 */
export function enableTestMode(adapter: AppStoreWebAdapter): void {
  (adapter as any).testMode = true;
}

/**
 * Check if test mode enabled
 */
private isTestMode(): boolean {
  return (this as any).testMode === true;
}

/**
 * Fetch with test mode support
 */
private async fetchHtml(url: string): Promise<string> {
  if (this.isTestMode()) {
    return this.getMockHtml(url);
  }

  // Normal fetch
  return this.fetchHtmlReal(url);
}
```

### 11.2 Mock Data

```typescript
/**
 * Get mock HTML for testing
 */
private getMockHtml(url: string): string {
  const appId = this.extractAppIdFromUrl(url);

  // Mock data for known test app IDs
  const mockData: Record<string, string> = {
    '1405735469': `
      <!DOCTYPE html>
      <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Pimsleur | Language Learning",
          "description": "Learn a new language...",
          "aggregateRating": {
            "ratingValue": 4.8,
            "reviewCount": 12500
          }
        }
        </script>
      </head>
      <body>
        <h1 class="product-header__title">Pimsleur | Language Learning</h1>
        <h2 class="product-header__subtitle">Speak fluently in 30 Days!</h2>
      </body>
      </html>
    `,
  };

  return mockData[appId] || '<html><body>App not found</body></html>';
}
```

---

## 12. Performance Targets

### 12.1 Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Response Time (cached)** | < 50ms | p95 |
| **Response Time (uncached)** | < 500ms | p95 |
| **Cache Hit Rate** | > 90% | After warm-up |
| **Error Rate** | < 1% | Per 1000 requests |
| **Rate Limit Compliance** | 100% | Never exceed 10 req/min |
| **Memory Usage** | < 500MB | Cache + buffers |

### 12.2 Performance Monitoring

```typescript
/**
 * Performance telemetry
 */
export class PerformanceTelemetry {
  private metrics: {
    requestCount: number;
    cacheHits: number;
    cacheMisses: number;
    errors: number;
    responseTimes: number[];
  } = {
    requestCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    responseTimes: [],
  };

  recordRequest(result: AdapterResult): void {
    this.metrics.requestCount++;

    if (result.cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    if (!result.success) {
      this.metrics.errors++;
    }

    if (result.responseTime) {
      this.metrics.responseTimes.push(result.responseTime);
    }
  }

  getMetrics(): {
    requestCount: number;
    cacheHitRate: number;
    errorRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  } {
    const cacheHitRate = this.metrics.requestCount > 0
      ? this.metrics.cacheHits / this.metrics.requestCount
      : 0;

    const errorRate = this.metrics.requestCount > 0
      ? this.metrics.errors / this.metrics.requestCount
      : 0;

    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95ResponseTime = sorted[p95Index] || 0;

    return {
      requestCount: this.metrics.requestCount,
      cacheHitRate,
      errorRate,
      avgResponseTime,
      p95ResponseTime,
    };
  }
}
```

---

## Conclusion

### Implementation Checklist

**Before Implementation:**
- [x] Technical specification complete
- [x] Security requirements defined
- [x] Performance targets established
- [ ] Legal counsel review (⚠️ **USER ACTION REQUIRED**)
- [ ] Approval to proceed

**During Implementation:**
- [ ] Create AppStoreWebAdapter class
- [ ] Implement two-phase extraction (JSON-LD + DOM)
- [ ] Implement security validators (SSRF, XSS prevention)
- [ ] Implement rate limiter (token bucket)
- [ ] Implement caching (two-tier)
- [ ] Implement error handling and retry logic
- [ ] Integrate with MetadataOrchestrator
- [ ] Add feature flags
- [ ] Add performance telemetry

**After Implementation:**
- [ ] Unit tests (see PHASE_A5_TEST_PLAN.md)
- [ ] Integration tests
- [ ] Security tests (penetration testing)
- [ ] Performance tests (load testing)
- [ ] Manual QA
- [ ] Production deployment (phased rollout)

---

**Document Status:** ✅ **COMPLETE**
**Ready for Implementation:** ⚠️ **PENDING LEGAL REVIEW**
**Next Document:** PHASE_A5_TEST_PLAN.md
