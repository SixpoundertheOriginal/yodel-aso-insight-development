/**
 * DOM Snapshot Utility
 *
 * Builds minimal DOM snapshot for metadata extraction.
 * Uses lightweight string parsing instead of full DOM parser to avoid linkedom dependency.
 */

/**
 * Extract subtitle from HTML using regex patterns
 *
 * Tries multiple patterns in order of specificity:
 * 1. <h2 class="we-truncate ...">subtitle</h2> (Primary Apple pattern)
 * 2. <h2 class="subtitle ...">subtitle</h2> (Legacy pattern)
 * 3. <h2 class="product-header__subtitle ...">subtitle</h2> (Product header pattern)
 * 4. <h2 class="app-header__subtitle ...">subtitle</h2> (App header pattern)
 * 5. Any <h2> tag after <h1> (Generic fallback)
 *
 * Returns both the subtitle value and which pattern matched (for debugging/confidence)
 */
export function extractSubtitle(html: string): string | null {
  const patterns = [
    // Primary pattern: <h2 class="we-truncate we-truncate--single-line ...">subtitle</h2>
    /<h2[^>]*class="[^"]*we-truncate[^"]*"[^>]*>(.*?)<\/h2>/is,

    // Legacy pattern: <h2 class="subtitle">subtitle</h2>
    /<h2[^>]*class="[^"]*subtitle[^"]*"[^>]*>(.*?)<\/h2>/is,

    // Product header pattern
    /<h2[^>]*class="[^"]*product-header__subtitle[^"]*"[^>]*>(.*?)<\/h2>/is,

    // App header pattern
    /<h2[^>]*class="[^"]*app-header__subtitle[^"]*"[^>]*>(.*?)<\/h2>/is,

    // Generic <h2> after <h1> (extract first <h2> only)
    // This pattern looks for <h1>...</h1> followed eventually by <h2>...</h2>
    /<h1[^>]*>.*?<\/h1>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/is,

    // Ultra-generic: just find the first <h2> tag
    /<h2[^>]*>(.*?)<\/h2>/is,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const subtitle = normalizeWhitespace(stripHtmlTags(match[1].trim()));

      // Validate:
      // - Must have content
      // - Must be reasonable length (< 200 chars)
      // - Must not be a generic category name (like "Utilities", "Productivity", etc.)
      if (subtitle.length > 0 && subtitle.length < 200) {
        // Filter out common category names that aren't subtitles
        const categoryNames = [
          'utilities', 'productivity', 'games', 'entertainment',
          'lifestyle', 'health', 'fitness', 'education', 'business',
          'travel', 'food', 'drink', 'social', 'networking',
          'photo', 'video', 'music', 'news', 'reference',
          'weather', 'shopping', 'finance', 'sports', 'navigation'
        ];

        const lowerSubtitle = subtitle.toLowerCase();
        const isCategory = categoryNames.includes(lowerSubtitle);

        if (!isCategory) {
          return subtitle;
        }
      }
    }
  }

  return null;
}

/**
 * Extract subtitle with metadata (pattern matched, confidence)
 *
 * Returns detailed metadata for status tracking and debugging
 */
export function extractSubtitleWithMetadata(html: string): {
  value: string | null;
  extractionMethod: string | null;
} {
  const patternNames = [
    'we-truncate',
    'subtitle-class',
    'product-header__subtitle',
    'app-header__subtitle',
    'h2-after-h1',
    'generic-h2',
  ];

  const patterns = [
    /<h2[^>]*class="[^"]*we-truncate[^"]*"[^>]*>(.*?)<\/h2>/is,
    /<h2[^>]*class="[^"]*subtitle[^"]*"[^>]*>(.*?)<\/h2>/is,
    /<h2[^>]*class="[^"]*product-header__subtitle[^"]*"[^>]*>(.*?)<\/h2>/is,
    /<h2[^>]*class="[^"]*app-header__subtitle[^"]*"[^>]*>(.*?)<\/h2>/is,
    /<h1[^>]*>.*?<\/h1>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/is,
    /<h2[^>]*>(.*?)<\/h2>/is,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = html.match(patterns[i]);
    if (match && match[1]) {
      const subtitle = normalizeWhitespace(stripHtmlTags(match[1].trim()));

      if (subtitle.length > 0 && subtitle.length < 200) {
        const categoryNames = [
          'utilities', 'productivity', 'games', 'entertainment',
          'lifestyle', 'health', 'fitness', 'education', 'business',
          'travel', 'food', 'drink', 'social', 'networking',
          'photo', 'video', 'music', 'news', 'reference',
          'weather', 'shopping', 'finance', 'sports', 'navigation'
        ];

        const lowerSubtitle = subtitle.toLowerCase();
        const isCategory = categoryNames.includes(lowerSubtitle);

        if (!isCategory) {
          return {
            value: subtitle,
            extractionMethod: patternNames[i],
          };
        }
      }
    }
  }

  return {
    value: null,
    extractionMethod: null,
  };
}

/**
 * Extract app title from HTML
 */
export function extractTitle(html: string): string | null {
  // Pattern: <h1 class="product-header__title">Title</h1>
  const patterns = [
    /<h1[^>]*class="[^"]*product-header__title[^"]*"[^>]*>(.*?)<\/h1>/is,
    /<h1[^>]*class="[^"]*app-header__title[^"]*"[^>]*>(.*?)<\/h1>/is,
    /<h1[^>]*>(.*?)<\/h1>/is, // Generic h1 as last resort
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 0 && title.length < 200) {
        return normalizeWhitespace(stripHtmlTags(title));
      }
    }
  }

  return null;
}

/**
 * Extract developer name from HTML
 */
export function extractDeveloper(html: string): string | null {
  // Pattern: <a class="link" href="/developer/..." data-test-bidi>Developer Name</a>
  const patterns = [
    /<a[^>]*class="[^"]*link[^"]*"[^>]*href="[^"]*\/developer\/[^"]*"[^>]*>(.*?)<\/a>/is,
    /<a[^>]*href="[^"]*\/developer\/[^"]*"[^>]*>(.*?)<\/a>/is,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const developer = match[1].trim();
      if (developer.length > 0 && developer.length < 100) {
        return normalizeWhitespace(stripHtmlTags(developer));
      }
    }
  }

  return null;
}

/**
 * Build minimal DOM snapshot
 * Returns a compact representation of key HTML sections
 */
export function buildSnapshot(html: string): string {
  const parts: string[] = [];

  // Extract header section (contains title, subtitle, developer)
  const headerPattern = /<header[^>]*class="[^"]*product-header[^"]*"[^>]*>(.*?)<\/header>/is;
  const headerMatch = html.match(headerPattern);

  if (headerMatch && headerMatch[1]) {
    // Truncate header to reasonable size
    const header = headerMatch[1].substring(0, 5000);
    parts.push(`<header class="product-header">${header}</header>`);
  }

  // If no header found, try to extract key elements individually
  if (parts.length === 0) {
    const subtitle = extractSubtitle(html);
    const title = extractTitle(html);
    const developer = extractDeveloper(html);

    if (title) parts.push(`<h1>${title}</h1>`);
    if (subtitle) parts.push(`<h2 class="subtitle">${subtitle}</h2>`);
    if (developer) parts.push(`<div class="developer">${developer}</div>`);
  }

  // Return snapshot or empty marker
  return parts.length > 0
    ? parts.join('\n')
    : '<!-- No snapshot data -->';
}

/**
 * Strip HTML tags from string
 */
function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace in string
 * Decodes HTML entities, removes invisible Unicode characters, and normalizes whitespace
 */
function normalizeWhitespace(str: string): string {
  // First decode HTML entities
  const decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Then normalize Unicode and whitespace
  return decoded
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, ' ')
    // Replace other Unicode whitespace with regular spaces
    .replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Extract description from HTML using JSON-LD schema.org data
 *
 * App Store pages include schema.org SoftwareApplication JSON-LD blocks
 * that contain the full app description.
 */
export function extractDescription(html: string): string | null {
  try {
    // Pattern: <script type="application/ld+json">{"@type":"SoftwareApplication", ...}</script>
    const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;

    let match;
    while ((match = jsonLdPattern.exec(html)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);

        // Look for SoftwareApplication schema.org type
        if (data['@type'] === 'SoftwareApplication' && data.description) {
          const description = String(data.description).trim();

          // Validate description length (reasonable bounds)
          if (description.length > 50 && description.length < 10000) {
            return normalizeWhitespace(description);
          }
        }
      } catch (parseError) {
        // Invalid JSON in this block, continue to next
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('[dom] extractDescription failed:', error);
    return null;
  }
}

/**
 * Validate extracted subtitle
 */
export function validateSubtitle(subtitle: string | null): boolean {
  if (!subtitle) return false;
  if (subtitle.length === 0) return false;
  if (subtitle.length > 200) return false;

  // Check if it's just HTML artifacts
  if (/^[<>\/\s]+$/.test(subtitle)) return false;

  // Check if it's meaningful text
  if (subtitle.replace(/\W/g, '').length < 3) return false;

  return true;
}

/**
 * Validate extracted description
 */
export function validateDescription(description: string | null): boolean {
  if (!description) return false;
  if (description.length < 50) return false; // Too short to be a real description
  if (description.length > 10000) return false; // Unreasonably long

  // Check if it's just HTML artifacts or whitespace
  if (/^[<>\/\s]+$/.test(description)) return false;

  // Check if it has meaningful text
  if (description.replace(/\W/g, '').length < 20) return false;

  return true;
}
