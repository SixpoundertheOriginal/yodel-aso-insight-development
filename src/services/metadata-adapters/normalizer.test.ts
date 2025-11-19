/**
 * Unit Tests for MetadataNormalizer
 *
 * Critical tests for Phase A subtitle duplication fix and screenshot normalization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataNormalizer } from './normalizer';
import type { ScrapedMetadata } from '@/types/aso';

describe('MetadataNormalizer', () => {
  let normalizer: MetadataNormalizer;

  beforeEach(() => {
    normalizer = new MetadataNormalizer();
  });

  describe('normalizeSubtitle - Critical Subtitle Duplication Fix', () => {
    it('should remove exact title duplication from subtitle', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: 'Instagram',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('');
    });

    it('should remove "Title - Subtitle" pattern with hyphen-minus', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: 'Instagram - Share & Connect',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Share & Connect');
    });

    it('should remove "Title – Subtitle" pattern with en dash', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'TikTok',
        title: 'TikTok',
        subtitle: 'TikTok – Make Your Day',
        appId: '835599320',
        icon: '',
        developer: 'ByteDance',
        rating: 4.6,
        reviews: 2000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Make Your Day');
    });

    it('should remove "Title — Subtitle" pattern with em dash', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'WhatsApp',
        title: 'WhatsApp',
        subtitle: 'WhatsApp — Messenger',
        appId: '310633997',
        icon: '',
        developer: 'WhatsApp Inc.',
        rating: 4.7,
        reviews: 3000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Messenger');
    });

    it('should remove "Title: Subtitle" pattern with colon', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Spotify',
        title: 'Spotify',
        subtitle: 'Spotify: Music & Podcasts',
        appId: '324684580',
        icon: '',
        developer: 'Spotify',
        rating: 4.8,
        reviews: 5000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Music & Podcasts');
    });

    it('should preserve valid subtitle without title prefix', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: 'Share & Connect',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Share & Connect');
    });

    it('should return empty string if subtitle equals name', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram - Photo & Video',
        subtitle: 'Instagram',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('');
    });

    it('should handle case-insensitive comparison', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'instagram',
        subtitle: 'INSTAGRAM',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('');
    });

    it('should handle whitespace normalization', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '  Instagram - Share & Connect  ',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Share & Connect');
    });

    it('should handle empty subtitle', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('');
    });

    it('should handle undefined subtitle', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: undefined,
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('');
    });

    it('should handle complex multi-word title', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Google Maps',
        title: 'Google Maps',
        subtitle: 'Google Maps - Transit & Food',
        appId: '585027354',
        icon: '',
        developer: 'Google',
        rating: 4.5,
        reviews: 1500000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Transit & Food');
    });

    it('should preserve subtitle with similar but different text', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Messenger',
        title: 'Messenger',
        subtitle: 'Messaging App',
        appId: '454638411',
        icon: '',
        developer: 'Meta',
        rating: 4.3,
        reviews: 900000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Messaging App');
    });
  });

  describe('normalizeScreenshots - Phase A.2 Screenshot Fix', () => {
    it('should handle screenshots array field (preferred)', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/1.png',
          'https://is2-ssl.mzstatic.com/image/thumb/2.png'
        ]
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.screenshots).toEqual([
        'https://is1-ssl.mzstatic.com/image/thumb/1.png',
        'https://is2-ssl.mzstatic.com/image/thumb/2.png'
      ]);
    });

    it('should handle screenshot single string field (legacy)', () => {
      const input: any = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US',
        screenshot: 'https://is1-ssl.mzstatic.com/image/thumb/1.png'
      };

      const result = normalizer.normalize(input, 'test-source');

      expect(result.screenshots).toEqual([
        'https://is1-ssl.mzstatic.com/image/thumb/1.png'
      ]);
    });

    it('should filter empty strings from screenshots array', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/1.png',
          '',
          'https://is2-ssl.mzstatic.com/image/thumb/2.png',
          ''
        ]
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.screenshots).toEqual([
        'https://is1-ssl.mzstatic.com/image/thumb/1.png',
        'https://is2-ssl.mzstatic.com/image/thumb/2.png'
      ]);
    });

    it('should return empty array if no screenshots', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.screenshots).toEqual([]);
    });

    it('should handle whitespace-only screenshot URLs', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/1.png',
          '   ',
          'https://is2-ssl.mzstatic.com/image/thumb/2.png'
        ]
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.screenshots).toEqual([
        'https://is1-ssl.mzstatic.com/image/thumb/1.png',
        'https://is2-ssl.mzstatic.com/image/thumb/2.png'
      ]);
    });

    it('should prefer screenshots array over screenshot string', () => {
      const input: any = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/1.png',
          'https://is2-ssl.mzstatic.com/image/thumb/2.png'
        ],
        screenshot: 'https://is3-ssl.mzstatic.com/image/thumb/3.png'
      };

      const result = normalizer.normalize(input, 'test-source');

      // Should use screenshots array, not screenshot string
      expect(result.screenshots).toEqual([
        'https://is1-ssl.mzstatic.com/image/thumb/1.png',
        'https://is2-ssl.mzstatic.com/image/thumb/2.png'
      ]);
    });
  });

  describe('normalize - Integration Tests', () => {
    it('should normalize all fields correctly', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: 'Instagram - Share & Connect',
        appId: '389801252',
        icon: 'https://is1-ssl.mzstatic.com/image/thumb/icon.png',
        developer: 'Meta Platforms, Inc.',
        rating: 4.5,
        reviews: 1000000,
        description: 'Bringing you closer to the people and things you love.',
        url: 'https://apps.apple.com/us/app/instagram/id389801252',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/1.png',
          'https://is2-ssl.mzstatic.com/image/thumb/2.png'
        ],
        applicationCategory: 'Social Networking'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'itunes-search');

      // Check all fields
      expect(result.name).toBe('Instagram');
      expect(result.title).toBe('Instagram');
      expect(result.subtitle).toBe('Share & Connect'); // Duplication removed!
      expect(result.appId).toBe('389801252');
      expect(result.icon).toBe('https://is1-ssl.mzstatic.com/image/thumb/icon.png');
      expect(result.developer).toBe('Meta Platforms, Inc.');
      expect(result.rating).toBe(4.5);
      expect(result.reviews).toBe(1000000);
      expect(result.description).toBe('Bringing you closer to the people and things you love.');
      expect(result.url).toBe('https://apps.apple.com/us/app/instagram/id389801252');
      expect(result.locale).toBe('en-US');
      expect(result.screenshots).toEqual([
        'https://is1-ssl.mzstatic.com/image/thumb/1.png',
        'https://is2-ssl.mzstatic.com/image/thumb/2.png'
      ]);
      expect(result.applicationCategory).toBe('Social Networking');
    });

    it('should add _source field', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'itunes-search');

      expect(result._source).toBe('itunes-search');
    });

    it('should add _normalized field', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: '',
        appId: '389801252',
        icon: '',
        developer: 'Meta',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'itunes-search');

      expect(result._normalized).toBe(true);
    });

    it('should handle real Instagram data (comprehensive)', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'Instagram',
        title: 'Instagram',
        subtitle: 'Instagram - Share & Connect', // Duplication pattern
        appId: '389801252',
        icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/icon.png',
        developer: 'Meta Platforms, Inc.',
        rating: 4.5,
        reviews: 15000000,
        description: 'Create and share photos, stories, and videos with the friends you care about.',
        url: 'https://apps.apple.com/us/app/instagram/id389801252',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/screen1.png',
          'https://is2-ssl.mzstatic.com/image/thumb/screen2.png',
          'https://is3-ssl.mzstatic.com/image/thumb/screen3.png',
          'https://is4-ssl.mzstatic.com/image/thumb/screen4.png',
          'https://is5-ssl.mzstatic.com/image/thumb/screen5.png'
        ],
        applicationCategory: 'Social Networking'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'itunes-search');

      expect(result.subtitle).toBe('Share & Connect');
      expect(result.screenshots).toHaveLength(5);
      expect(result._source).toBe('itunes-search');
      expect(result._normalized).toBe(true);
    });

    it('should handle real TikTok data (en dash separator)', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'TikTok',
        title: 'TikTok',
        subtitle: 'TikTok – Make Your Day', // En dash separator
        appId: '835599320',
        icon: 'https://is1-ssl.mzstatic.com/image/thumb/icon.png',
        developer: 'ByteDance Ltd.',
        rating: 4.6,
        reviews: 20000000,
        description: 'Join the millions of viewers discovering content and creators on TikTok',
        url: 'https://apps.apple.com/us/app/tiktok/id835599320',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/screen1.png',
          'https://is2-ssl.mzstatic.com/image/thumb/screen2.png'
        ],
        applicationCategory: 'Entertainment'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'itunes-search');

      expect(result.subtitle).toBe('Make Your Day');
      expect(result.screenshots).toHaveLength(2);
    });

    it('should handle app without subtitle (WhatsApp Messenger)', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'WhatsApp Messenger',
        title: 'WhatsApp Messenger',
        subtitle: '', // No subtitle
        appId: '310633997',
        icon: 'https://is1-ssl.mzstatic.com/image/thumb/icon.png',
        developer: 'WhatsApp Inc.',
        rating: 4.7,
        reviews: 30000000,
        description: 'Simple. Reliable. Secure.',
        url: 'https://apps.apple.com/us/app/whatsapp-messenger/id310633997',
        locale: 'en-US',
        screenshots: [
          'https://is1-ssl.mzstatic.com/image/thumb/screen1.png'
        ],
        applicationCategory: 'Social Networking'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'itunes-lookup');

      expect(result.subtitle).toBe('');
      expect(result._source).toBe('itunes-lookup');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in title and subtitle', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'App & More',
        title: 'App & More',
        subtitle: 'App & More - Tools & Utilities',
        appId: '123456789',
        icon: '',
        developer: 'Developer',
        rating: 4.0,
        reviews: 100,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Tools & Utilities');
    });

    it('should handle very long subtitle', () => {
      const longSubtitle = 'A'.repeat(500);
      const input: Partial<ScrapedMetadata> = {
        name: 'App',
        title: 'App',
        subtitle: longSubtitle,
        appId: '123456789',
        icon: '',
        developer: 'Developer',
        rating: 4.0,
        reviews: 100,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe(longSubtitle);
    });

    it('should handle numeric values in strings', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'App 123',
        title: 'App 123',
        subtitle: 'App 123 - Version 2.0',
        appId: '123456789',
        icon: '',
        developer: 'Developer',
        rating: 4.0,
        reviews: 100,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('Version 2.0');
    });

    it('should handle Unicode characters', () => {
      const input: Partial<ScrapedMetadata> = {
        name: '微信',
        title: '微信',
        subtitle: '微信 - WeChat',
        appId: '414478124',
        icon: '',
        developer: 'Tencent',
        rating: 4.5,
        reviews: 1000000,
        description: '',
        url: '',
        locale: 'zh-CN'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      expect(result.subtitle).toBe('WeChat');
    });

    it('should handle multiple separator occurrences (use only first)', () => {
      const input: Partial<ScrapedMetadata> = {
        name: 'App',
        title: 'App',
        subtitle: 'App - Part 1 - Part 2 - Part 3',
        appId: '123456789',
        icon: '',
        developer: 'Developer',
        rating: 4.0,
        reviews: 100,
        description: '',
        url: '',
        locale: 'en-US'
      };

      const result = normalizer.normalize(input as ScrapedMetadata, 'test-source');

      // Should only remove first occurrence
      expect(result.subtitle).toBe('Part 1 - Part 2 - Part 3');
    });
  });
});
