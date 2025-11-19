/**
 * Unit Tests for ItunesSearchAdapter
 *
 * Critical tests for title/subtitle parsing logic (Phase A subtitle fix)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ItunesSearchAdapter } from './itunes-search.adapter';
import type { RawMetadata } from './types';
import { RateLimiter } from './rate-limiter';

describe('ItunesSearchAdapter', () => {
  let adapter: ItunesSearchAdapter;
  let mockRateLimiter: RateLimiter;

  beforeEach(() => {
    // Create mock rate limiter that doesn't actually rate limit in tests
    mockRateLimiter = {
      acquire: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ tokens: 100, maxTokens: 100 }),
    } as any;

    adapter = new ItunesSearchAdapter(mockRateLimiter);
  });

  describe('parseTitle - Critical Subtitle Parsing Logic', () => {
    it('should parse "Title - Subtitle" format with hyphen-minus', () => {
      const result = (adapter as any).parseTitle('Instagram - Share & Connect');

      expect(result.title).toBe('Instagram');
      expect(result.subtitle).toBe('Share & Connect');
    });

    it('should parse "Title – Subtitle" with en dash', () => {
      const result = (adapter as any).parseTitle('TikTok – Make Your Day');

      expect(result.title).toBe('TikTok');
      expect(result.subtitle).toBe('Make Your Day');
    });

    it('should parse "Title — Subtitle" with em dash', () => {
      const result = (adapter as any).parseTitle('WhatsApp — Messenger');

      expect(result.title).toBe('WhatsApp');
      expect(result.subtitle).toBe('Messenger');
    });

    it('should handle title without subtitle', () => {
      const result = (adapter as any).parseTitle('WhatsApp Messenger');

      expect(result.title).toBe('WhatsApp Messenger');
      expect(result.subtitle).toBe('');
    });

    it('should handle multiple separators (take first as boundary)', () => {
      const result = (adapter as any).parseTitle('App - Part 1 - Part 2');

      expect(result.title).toBe('App');
      expect(result.subtitle).toBe('Part 1 - Part 2');
    });

    it('should trim whitespace from both parts', () => {
      const result = (adapter as any).parseTitle('  Instagram  -  Share & Connect  ');

      expect(result.title).toBe('Instagram');
      expect(result.subtitle).toBe('Share & Connect');
    });

    it('should handle empty string', () => {
      const result = (adapter as any).parseTitle('');

      expect(result.title).toBe('Unknown App');
      expect(result.subtitle).toBe('');
    });

    it('should handle null input', () => {
      const result = (adapter as any).parseTitle(null);

      expect(result.title).toBe('Unknown App');
      expect(result.subtitle).toBe('');
    });

    it('should handle undefined input', () => {
      const result = (adapter as any).parseTitle(undefined);

      expect(result.title).toBe('Unknown App');
      expect(result.subtitle).toBe('');
    });

    it('should handle multi-word title', () => {
      const result = (adapter as any).parseTitle('Google Maps - Transit & Food');

      expect(result.title).toBe('Google Maps');
      expect(result.subtitle).toBe('Transit & Food');
    });

    it('should handle special characters in title and subtitle', () => {
      const result = (adapter as any).parseTitle('App & More - Tools & Utilities');

      expect(result.title).toBe('App & More');
      expect(result.subtitle).toBe('Tools & Utilities');
    });

    it('should handle numeric values in title', () => {
      const result = (adapter as any).parseTitle('App 123 - Version 2.0');

      expect(result.title).toBe('App 123');
      expect(result.subtitle).toBe('Version 2.0');
    });

    it('should handle Unicode characters', () => {
      const result = (adapter as any).parseTitle('微信 - WeChat');

      expect(result.title).toBe('微信');
      expect(result.subtitle).toBe('WeChat');
    });

    it('should handle separator at end (edge case - no subtitle)', () => {
      const result = (adapter as any).parseTitle('Instagram - ');

      // When separator is at end with no subtitle, treat entire string as title
      // This is an edge case - real apps wouldn't have trailing separators
      expect(result.title).toBe('Instagram -');
      expect(result.subtitle).toBe('');
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(200);
      const result = (adapter as any).parseTitle(longTitle);

      expect(result.title).toBe(longTitle);
      expect(result.subtitle).toBe('');
    });

    it('should handle title with only separator', () => {
      const result = (adapter as any).parseTitle(' - ');

      expect(result.title).toBe('-');
      expect(result.subtitle).toBe('');
    });

    it('should prioritize first separator found', () => {
      // If multiple separator types exist, use the first one found
      const result = (adapter as any).parseTitle('App - Part1 – Part2');

      expect(result.title).toBe('App');
      expect(result.subtitle).toBe('Part1 – Part2');
    });
  });

  describe('validate', () => {
    it('should validate correct raw metadata', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 389801252,
            trackName: 'Instagram',
            artistName: 'Meta',
            averageUserRating: 4.5,
            userRatingCount: 1000000,
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.validate(raw);

      expect(result).toBe(true);
    });

    it('should reject non-array data', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: { invalid: 'data' } as any,
        headers: {},
        statusCode: 200
      };

      const result = adapter.validate(raw);

      expect(result).toBe(false);
    });

    it('should reject empty array', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [],
        headers: {},
        statusCode: 200
      };

      const result = adapter.validate(raw);

      expect(result).toBe(false);
    });

    it('should reject data missing trackId', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackName: 'Instagram',
            artistName: 'Meta'
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.validate(raw);

      expect(result).toBe(false);
    });

    it('should reject data missing trackName', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 389801252,
            artistName: 'Meta'
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.validate(raw);

      expect(result).toBe(false);
    });

    it('should validate data with extra fields', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 389801252,
            trackName: 'Instagram',
            artistName: 'Meta',
            description: 'Share photos',
            screenshotUrls: ['url1', 'url2'],
            averageUserRating: 4.5
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.validate(raw);

      expect(result).toBe(true);
    });
  });

  describe('transform', () => {
    it('should transform iTunes API response to ScrapedMetadata', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 389801252,
            trackName: 'Instagram - Share & Connect',
            trackViewUrl: 'https://apps.apple.com/us/app/instagram/id389801252',
            description: 'Create and share photos',
            primaryGenreName: 'Social Networking',
            artistName: 'Meta Platforms, Inc.',
            averageUserRating: 4.5,
            userRatingCount: 15000000,
            formattedPrice: 'Free',
            artworkUrl512: 'https://is1-ssl.mzstatic.com/image/thumb/icon512.png',
            screenshotUrls: [
              'https://is1-ssl.mzstatic.com/image/thumb/screen1.png',
              'https://is2-ssl.mzstatic.com/image/thumb/screen2.png'
            ]
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.transform(raw);

      expect(result.appId).toBe('389801252');
      expect(result.name).toBe('Instagram - Share & Connect');
      expect(result.title).toBe('Instagram');
      expect(result.subtitle).toBe('Share & Connect');
      expect(result.url).toBe('https://apps.apple.com/us/app/instagram/id389801252');
      expect(result.locale).toBe('en-US');
      expect(result.description).toBe('Create and share photos');
      expect(result.applicationCategory).toBe('Social Networking');
      expect(result.developer).toBe('Meta Platforms, Inc.');
      expect(result.rating).toBe(4.5);
      expect(result.reviews).toBe(15000000);
      expect(result.price).toBe('Free');
      expect(result.icon).toBe('https://is1-ssl.mzstatic.com/image/thumb/icon512.png');
      expect(result.screenshots).toEqual([
        'https://is1-ssl.mzstatic.com/image/thumb/screen1.png',
        'https://is2-ssl.mzstatic.com/image/thumb/screen2.png'
      ]);
    });

    it('should handle app without subtitle', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 310633997,
            trackName: 'WhatsApp Messenger',
            trackViewUrl: 'https://apps.apple.com/us/app/whatsapp/id310633997',
            description: 'Simple. Reliable. Secure.',
            primaryGenreName: 'Social Networking',
            artistName: 'WhatsApp Inc.',
            averageUserRating: 4.7,
            userRatingCount: 30000000,
            formattedPrice: 'Free',
            artworkUrl512: 'https://is1-ssl.mzstatic.com/image/thumb/icon512.png',
            screenshotUrls: []
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.transform(raw);

      expect(result.title).toBe('WhatsApp Messenger');
      expect(result.subtitle).toBe('');
    });

    it('should handle missing optional fields gracefully', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 123456789,
            trackName: 'Test App'
            // All optional fields missing
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.transform(raw);

      expect(result.appId).toBe('123456789');
      expect(result.name).toBe('Test App');
      expect(result.title).toBe('Test App');
      expect(result.subtitle).toBe('');
      expect(result.url).toBe('');
      expect(result.description).toBe('');
      expect(result.applicationCategory).toBe('Unknown');
      expect(result.developer).toBe('Unknown Developer');
      expect(result.rating).toBe(0);
      expect(result.reviews).toBe(0);
      expect(result.price).toBe('Free');
      expect(result.icon).toBe(undefined);
      expect(result.screenshots).toEqual([]);
    });

    it('should use artworkUrl100 as fallback for icon', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 123456789,
            trackName: 'Test App',
            artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/icon100.png'
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.transform(raw);

      expect(result.icon).toBe('https://is1-ssl.mzstatic.com/image/thumb/icon100.png');
    });

    it('should prefer artworkUrl512 over artworkUrl100', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 123456789,
            trackName: 'Test App',
            artworkUrl512: 'https://is1-ssl.mzstatic.com/image/thumb/icon512.png',
            artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/icon100.png'
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.transform(raw);

      expect(result.icon).toBe('https://is1-ssl.mzstatic.com/image/thumb/icon512.png');
    });

    it('should throw error if validation fails', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [], // Empty - validation will fail
        headers: {},
        statusCode: 200
      };

      expect(() => adapter.transform(raw)).toThrow('itunes-search: Invalid raw metadata');
    });

    it('should handle en dash separator in trackName', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 835599320,
            trackName: 'TikTok – Make Your Day',
            artistName: 'ByteDance',
            averageUserRating: 4.6,
            userRatingCount: 20000000,
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.transform(raw);

      expect(result.title).toBe('TikTok');
      expect(result.subtitle).toBe('Make Your Day');
    });

    it('should handle em dash separator in trackName', () => {
      const raw: RawMetadata = {
        source: 'itunes-search',
        timestamp: new Date(),
        data: [
          {
            trackId: 310633997,
            trackName: 'WhatsApp — Messenger',
            artistName: 'WhatsApp Inc.',
            averageUserRating: 4.7,
            userRatingCount: 30000000,
          }
        ],
        headers: {},
        statusCode: 200
      };

      const result = adapter.transform(raw);

      expect(result.title).toBe('WhatsApp');
      expect(result.subtitle).toBe('Messenger');
    });
  });

  describe('buildUrl', () => {
    it('should build correct search URL with default params', () => {
      const url = (adapter as any).buildUrl('Instagram', 'us', 25);

      expect(url).toContain('https://itunes.apple.com/search');
      expect(url).toContain('term=Instagram');
      expect(url).toContain('country=us');
      expect(url).toContain('entity=software');
      expect(url).toContain('limit=25');
    });

    it('should handle different country codes', () => {
      const url = (adapter as any).buildUrl('Instagram', 'GB', 25);

      expect(url).toContain('country=gb');
    });

    it('should handle different limit values', () => {
      const url = (adapter as any).buildUrl('Instagram', 'us', 50);

      expect(url).toContain('limit=50');
    });

    it('should URL encode search terms with spaces', () => {
      const url = (adapter as any).buildUrl('Google Maps', 'us', 25);

      expect(url).toContain('term=Google+Maps');
    });

    it('should URL encode special characters', () => {
      const url = (adapter as any).buildUrl('App & More', 'us', 25);

      expect(url).toContain('term=App+%26+More');
    });

    it('should lowercase country code', () => {
      const url = (adapter as any).buildUrl('Instagram', 'US', 25);

      expect(url).toContain('country=us');
    });
  });

  describe('getHealth', () => {
    it('should return health metrics', () => {
      const health = adapter.getHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('lastSuccess');
      expect(health).toHaveProperty('lastFailure');
      expect(health).toHaveProperty('successRate');
      expect(health).toHaveProperty('avgLatency');
      expect(health).toHaveProperty('errorCount');
      expect(health).toHaveProperty('requestCount');
    });

    it('should have healthy status initially', () => {
      const health = adapter.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.successRate).toBe(1.0);
      expect(health.avgLatency).toBe(0);
      expect(health.errorCount).toBe(0);
      expect(health.requestCount).toBe(0);
    });
  });

  describe('Adapter Properties', () => {
    it('should have correct adapter name', () => {
      expect(adapter.name).toBe('itunes-search');
    });

    it('should have version', () => {
      expect(adapter.version).toBe('1.0.0');
    });

    it('should have priority', () => {
      expect(adapter.priority).toBeDefined();
      expect(typeof adapter.priority).toBe('number');
    });

    it('should be enabled by default', () => {
      expect(adapter.enabled).toBe(true);
    });
  });
});
