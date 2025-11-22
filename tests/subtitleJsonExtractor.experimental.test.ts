/**
 * Unit Tests for Subtitle JSON Extractor (EXPERIMENTAL)
 *
 * Tests the experimental JSON-based subtitle extraction module.
 *
 * Test Coverage:
 * - Valid JSON extraction from different script block types
 * - Multiple subtitle field name variations
 * - Error handling (invalid JSON, missing fields, empty values)
 * - Safety limits (oversized scripts, deep nesting)
 * - Logging and diagnostics
 *
 * @module subtitleJsonExtractor.experimental.test
 */

import { describe, it, expect } from 'vitest';
import {
  extractSubtitleFromJsonExperimental,
  type SubtitleExtractionResult,
} from '../src/lib/metadata/subtitleJsonExtractor.experimental';

describe('extractSubtitleFromJsonExperimental', () => {
  describe('Valid Extraction', () => {
    it('should extract subtitle from application/json script block', () => {
      const html = `
        <html>
          <head>
            <script type="application/json">
              {
                "name": "Example App",
                "subtitle": "The best app ever"
              }
            </script>
          </head>
        </html>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('The best app ever');
      expect(result.logs).toContainEqual(expect.stringContaining('application/json'));
      expect(result.logs).toContainEqual(expect.stringContaining('Subtitle found'));
    });

    it('should extract subtitle from application/ld+json script block', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "Example App",
                "subtitle": "Amazing productivity tool"
              }
            </script>
          </head>
        </html>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('Amazing productivity tool');
      expect(result.logs).toContainEqual(expect.stringContaining('JSON-LD'));
    });

    it('should extract subtitle from data-ember-store script block', () => {
      const html = `
        <html>
          <script data-ember-store>
            {
              "app": {
                "id": "123456",
                "subtitle": "Ember-based app subtitle"
              }
            }
          </script>
        </html>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('Ember-based app subtitle');
      expect(result.logs).toContainEqual(expect.stringContaining('Ember data store'));
    });

    it('should extract subtitle from data-storefront script block', () => {
      const html = `
        <html>
          <script data-storefront>
            {
              "storefront": {
                "subtitle": "Storefront app description"
              }
            }
          </script>
        </html>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('Storefront app description');
      expect(result.logs).toContainEqual(expect.stringContaining('storefront data'));
    });

    it('should handle alternative field name "subTitle"', () => {
      const html = `
        <script type="application/json">
          {
            "subTitle": "camelCase variant"
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('camelCase variant');
    });

    it('should handle alternative field name "tagline"', () => {
      const html = `
        <script type="application/json">
          {
            "tagline": "App tagline text"
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('App tagline text');
    });

    it('should extract from nested JSON objects', () => {
      const html = `
        <script type="application/json">
          {
            "data": {
              "app": {
                "metadata": {
                  "subtitle": "Deeply nested subtitle"
                }
              }
            }
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('Deeply nested subtitle');
    });

    it('should trim whitespace from extracted subtitle', () => {
      const html = `
        <script type="application/json">
          {
            "subtitle": "   Subtitle with spaces   "
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('Subtitle with spaces');
    });

    it('should use first valid subtitle found when multiple blocks exist', () => {
      const html = `
        <script type="application/json">
          {
            "subtitle": "First subtitle"
          }
        </script>
        <script type="application/json">
          {
            "subtitle": "Second subtitle"
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('First subtitle');
    });
  });

  describe('Error Handling', () => {
    it('should return undefined when no script blocks found', () => {
      const html = `
        <html>
          <body>
            <p>Just regular HTML, no script blocks</p>
          </body>
        </html>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('No script blocks found'));
    });

    it('should return undefined when JSON is invalid', () => {
      const html = `
        <script type="application/json">
          { invalid json: missing quotes }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('JSON parse failed'));
    });

    it('should return undefined when subtitle field is missing', () => {
      const html = `
        <script type="application/json">
          {
            "name": "Example App",
            "version": "1.0.0"
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('No subtitle found'));
    });

    it('should skip empty subtitle values', () => {
      const html = `
        <script type="application/json">
          {
            "subtitle": ""
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('empty'));
    });

    it('should skip subtitle values that are too long', () => {
      const longSubtitle = 'A'.repeat(600); // Over 500 char limit
      const html = `
        <script type="application/json">
          {
            "subtitle": "${longSubtitle}"
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('too long'));
    });

    it('should handle invalid input types gracefully', () => {
      const result = extractSubtitleFromJsonExperimental(null as any);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('Invalid input'));
    });

    it('should handle empty string input', () => {
      const result = extractSubtitleFromJsonExperimental('');

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('Empty HTML string'));
    });

    it('should skip JSON arrays', () => {
      const html = `
        <script type="application/json">
          [
            { "subtitle": "Array element" }
          ]
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('array'));
    });

    it('should handle non-string subtitle values', () => {
      const html = `
        <script type="application/json">
          {
            "subtitle": 12345
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
    });
  });

  describe('Logging and Diagnostics', () => {
    it('should include HTML length in logs', () => {
      const html = '<html><body>Test</body></html>';
      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.logs).toContainEqual(expect.stringContaining('HTML length:'));
    });

    it('should include summary statistics in logs', () => {
      const html = `
        <script type="application/json">
          { "subtitle": "Test" }
        </script>
      `;
      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.logs).toContainEqual(expect.stringContaining('Summary:'));
      expect(result.logs).toContainEqual(expect.stringContaining('Script blocks found:'));
      expect(result.logs).toContainEqual(expect.stringContaining('Script blocks parsed:'));
    });

    it('should log JSON parsing success', () => {
      const html = `
        <script type="application/json">
          { "subtitle": "Test" }
        </script>
      `;
      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.logs).toContainEqual(expect.stringContaining('JSON parsed successfully'));
    });

    it('should log which field name was matched', () => {
      const html = `
        <script type="application/json">
          { "tagline": "Test tagline" }
        </script>
      `;
      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.logs).toContainEqual(expect.stringContaining('field "tagline"'));
    });

    it('should always return logs array', () => {
      const result = extractSubtitleFromJsonExperimental('');

      expect(Array.isArray(result.logs)).toBe(true);
      expect(result.logs.length).toBeGreaterThan(0);
    });
  });

  describe('Safety Limits', () => {
    it('should skip oversized script blocks', () => {
      // Create a large JSON string (over 2MB)
      const largeData = 'A'.repeat(3 * 1024 * 1024);
      const html = `
        <script type="application/json">
          { "data": "${largeData}", "subtitle": "Test" }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('too large'));
    });

    it('should handle deeply nested objects safely', () => {
      // Create nested object 10 levels deep (more than MAX_DEPTH of 5)
      const html = `
        <script type="application/json">
          {
            "a": {
              "b": {
                "c": {
                  "d": {
                    "e": {
                      "f": {
                        "g": {
                          "h": {
                            "i": {
                              "j": {
                                "subtitle": "Very deep"
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      // Should stop at MAX_DEPTH and not find deeply nested subtitle
      expect(result.subtitle).toBeUndefined();
    });
  });

  describe('Multiple Script Blocks', () => {
    it('should try multiple script block types in order', () => {
      const html = `
        <script type="text/javascript">
          console.log('regular script');
        </script>
        <script type="application/json">
          { "subtitle": "JSON block subtitle" }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('JSON block subtitle');
    });

    it('should stop searching after finding first valid subtitle', () => {
      const html = `
        <script type="application/json">
          { "subtitle": "First" }
        </script>
        <script type="application/ld+json">
          { "subtitle": "Second (should not be used)" }
        </script>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('First');
      expect(result.logs).toContainEqual(expect.stringContaining('already found'));
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle realistic App Store HTML structure', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Example App on the App Store</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Example App",
              "applicationCategory": "UtilityApplication",
              "operatingSystem": "iOS",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "subtitle": "Get things done faster"
            }
          </script>
        </head>
        <body>
          <div class="app-header">
            <h1>Example App</h1>
          </div>
        </body>
        </html>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBe('Get things done faster');
      expect(result.logs).toContainEqual(expect.stringContaining('✅ Final subtitle'));
    });

    it('should handle HTML with no JSON blocks', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Example</title>
          <style>body { margin: 0; }</style>
        </head>
        <body>
          <h1>Example App</h1>
          <p class="subtitle">This is just HTML text, not JSON</p>
        </body>
        </html>
      `;

      const result = extractSubtitleFromJsonExperimental(html);

      expect(result.subtitle).toBeUndefined();
      expect(result.logs).toContainEqual(expect.stringContaining('No subtitle found'));
    });
  });
});
