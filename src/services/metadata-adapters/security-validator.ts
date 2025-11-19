/**
 * Security Validator
 *
 * Provides security validations for web scraping:
 * - SSRF prevention (URL validation, private IP blocking)
 * - XSS prevention (HTML sanitization)
 * - Input validation (App ID, country code)
 *
 * Phase A.5: App Store Web Metadata Adapter
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Validation Error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Security Validator
 */
export class SecurityValidator {
  private static readonly ALLOWED_HOSTS = [
    'apps.apple.com',
    'itunes.apple.com',
  ];

  private static readonly ALLOWED_COUNTRIES = [
    'us', 'gb', 'de', 'fr', 'jp', 'cn', 'au', 'ca', 'in', 'br',
    'mx', 'it', 'es', 'kr', 'ru', 'nl', 'se', 'be', 'ch', 'at',
    'dk', 'fi', 'no', 'pl', 'pt', 'cz', 'gr', 'hu', 'ie', 'nz',
    'sg', 'hk', 'tw', 'th', 'my', 'id', 'ph', 'vn', 'za', 'ar',
    'cl', 'co', 'pe', 'ro', 'ua', 'il', 'ae', 'sa', 'eg', 'tr',
  ];

  private static readonly PRIVATE_IP_PATTERNS = [
    /^127\./,                          // Loopback
    /^10\./,                           // Private Class A
    /^172\.(1[6-9]|2\d|3[01])\./,     // Private Class B
    /^192\.168\./,                     // Private Class C
    /^169\.254\./,                     // Link-local
    /^::1$/,                           // IPv6 loopback
    /^fc00:/,                          // IPv6 private
    /^fe80:/,                          // IPv6 link-local
  ];

  /**
   * Validate App ID
   * Must be 6-12 digit numeric string
   */
  validateAppId(appId: string): void {
    const schema = z.string().regex(/^\d{6,12}$/, 'App ID must be 6-12 digits');

    try {
      schema.parse(appId);
    } catch (error) {
      throw new ValidationError(`Invalid App ID: ${appId}`);
    }
  }

  /**
   * Validate country code
   * Must be valid ISO 3166-1 alpha-2 code
   */
  validateCountryCode(country: string): void {
    const normalized = country.toLowerCase();

    if (!SecurityValidator.ALLOWED_COUNTRIES.includes(normalized)) {
      throw new ValidationError(`Invalid country code: ${country}`);
    }
  }

  /**
   * Validate URL (SSRF prevention)
   * Checks protocol, host allowlist, and path traversal
   */
  validateUrl(url: string): void {
    let parsedUrl: URL;

    // Parse URL
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    // Check protocol (only HTTPS)
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

    // Additional check: Ensure path starts with country/app pattern
    if (!parsedUrl.pathname.match(/^\/[a-z]{2}\/app\//)) {
      throw new ValidationError('Invalid App Store URL path');
    }
  }

  /**
   * Validate hostname resolves to public IP
   * Prevents SSRF attacks via private IP ranges
   */
  async validateHostResolution(hostname: string): Promise<void> {
    // In browser/edge environment, DNS resolution not available
    // This validation would run server-side only
    if (typeof window !== 'undefined') {
      return; // Skip in browser
    }

    try {
      const dns = await import('dns/promises');
      const addresses = await dns.resolve4(hostname);

      for (const ip of addresses) {
        if (this.isPrivateIp(ip)) {
          throw new ValidationError(`Private IP detected: ${ip}`);
        }

        // Block AWS metadata IP
        if (ip === '169.254.169.254') {
          throw new ValidationError('AWS metadata IP blocked');
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // DNS resolution failure - could be network issue, allow for now
      console.warn('[SECURITY] DNS resolution warning:', error);
    }
  }

  /**
   * Check if IP is in private range
   */
  private isPrivateIp(ip: string): boolean {
    return SecurityValidator.PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
  }

  /**
   * Sanitize text (XSS prevention)
   * Removes all HTML tags and decodes entities
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Remove all HTML tags using DOMPurify
    const cleaned = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],      // No HTML tags allowed
      ALLOWED_ATTR: [],      // No attributes allowed
      KEEP_CONTENT: true,    // Keep text content
    });

    // Decode HTML entities
    const decoded = this.decodeHtmlEntities(cleaned);

    return decoded.trim();
  }

  /**
   * Sanitize URL (XSS prevention)
   * Validates and sanitizes URLs for images/screenshots
   */
  sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('Invalid URL: empty or non-string');
    }

    // Block dangerous URL schemes
    if (/^(javascript|data|vbscript):/i.test(url)) {
      throw new ValidationError('Malicious URL scheme detected');
    }

    // Only allow https: or protocol-relative URLs
    if (!url.startsWith('https://') && !url.startsWith('//')) {
      throw new ValidationError('Only HTTPS URLs allowed');
    }

    // Sanitize with DOMPurify
    const cleaned = DOMPurify.sanitize(url, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    return cleaned;
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
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  /**
   * Validate screenshot URL
   * Ensures URL is from Apple CDN
   */
  validateScreenshotUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      // Must be HTTPS
      if (parsed.protocol !== 'https:') {
        return false;
      }

      // Must be from Apple CDN
      const allowedCdnHosts = [
        'is1-ssl.mzstatic.com',
        'is2-ssl.mzstatic.com',
        'is3-ssl.mzstatic.com',
        'is4-ssl.mzstatic.com',
        'is5-ssl.mzstatic.com',
      ];

      return allowedCdnHosts.some(host => parsed.hostname === host);
    } catch {
      return false;
    }
  }

  /**
   * Validate subtitle format
   * Ensures subtitle is reasonable length and format
   */
  validateSubtitle(subtitle: string): boolean {
    if (!subtitle || typeof subtitle !== 'string') {
      return false;
    }

    // Subtitle should be 1-100 characters
    if (subtitle.length === 0 || subtitle.length > 100) {
      return false;
    }

    // Should not be a URL
    if (/^https?:\/\//.test(subtitle)) {
      return false;
    }

    // Should not be JSON
    if (subtitle.startsWith('{') || subtitle.startsWith('[')) {
      return false;
    }

    return true;
  }
}

/**
 * Singleton instance for convenience
 */
export const securityValidator = new SecurityValidator();
