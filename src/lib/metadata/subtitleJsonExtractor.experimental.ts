/**
 * Subtitle JSON Extractor (EXPERIMENTAL)
 *
 * Extracts subtitle from Apple's JSON blocks in App Store HTML (pre-hydration DOM).
 *
 * ⚠️ EXPERIMENTAL MODULE - NOT INTEGRATED INTO PRODUCTION PIPELINE
 *
 * This module is for internal testing only. It does NOT affect current metadata logic.
 *
 * Purpose:
 * - Test alternative subtitle extraction method using embedded JSON blocks
 * - Compare accuracy vs. DOM-based extraction
 * - Evaluate reliability across different app types
 *
 * Future Integration Path:
 * - If testing proves successful, integrate into appstore-web.adapter.ts
 * - Add as fallback before DOM extraction in extractFromDom() method
 * - Preserve adapter priority and orchestration flow
 * - Update telemetry to track JSON vs DOM extraction rates
 *
 * Rollback:
 * - git rm src/lib/metadata/subtitleJsonExtractor.experimental.ts
 * - git rm tests/subtitleJsonExtractor.experimental.test.ts
 *
 * @module subtitleJsonExtractor.experimental
 * @experimental
 */

/**
 * Result type for subtitle extraction
 */
export interface SubtitleExtractionResult {
  /** Extracted subtitle, or undefined if not found */
  subtitle?: string;
  /** Diagnostic logs showing extraction steps and results */
  logs: string[];
}

/**
 * Configuration for safety limits
 */
const SAFETY_LIMITS = {
  /** Maximum size of script content to parse (2MB) */
  MAX_SCRIPT_SIZE: 2 * 1024 * 1024,
  /** Maximum number of script blocks to attempt parsing */
  MAX_SCRIPT_ATTEMPTS: 20,
  /** Maximum subtitle length (Apple's typical limit) */
  MAX_SUBTITLE_LENGTH: 500,
} as const;

/**
 * Script block types to search for (in priority order)
 */
const SCRIPT_BLOCK_TYPES = [
  { selector: 'application/json', description: 'application/json type' },
  { selector: 'application/ld+json', description: 'JSON-LD structured data' },
  { selector: 'data-ember-store', description: 'Ember data store' },
  { selector: 'data-storefront', description: 'App Store storefront data' },
] as const;

/**
 * Possible subtitle field names in JSON structures
 */
const SUBTITLE_FIELD_NAMES = ['subtitle', 'subTitle', 'tagline', 'description', 'shortDescription'] as const;

/**
 * Extract subtitle from Apple's JSON blocks in App Store HTML
 *
 * Searches for subtitle in embedded JSON blocks using multiple strategies:
 * 1. Script type="application/json" blocks
 * 2. Script type="application/ld+json" blocks
 * 3. Script data-ember-store blocks
 * 4. Script data-storefront blocks
 *
 * Safety Features:
 * - Size limits to prevent DoS attacks
 * - Safe JSON parsing with error handling
 * - Type validation (reject arrays, ensure objects)
 * - Detailed logging for diagnostics
 *
 * @param html - Raw HTML from App Store page
 * @returns Extraction result with optional subtitle and diagnostic logs
 *
 * @example
 * ```typescript
 * const html = await fetch('https://apps.apple.com/us/app/...');
 * const result = extractSubtitleFromJsonExperimental(html);
 * console.log('Subtitle:', result.subtitle);
 * console.log('Logs:', result.logs.join('\n'));
 * ```
 */
export function extractSubtitleFromJsonExperimental(html: string): SubtitleExtractionResult {
  const logs: string[] = [];
  logs.push('[EXPERIMENTAL] Starting JSON-based subtitle extraction');

  // Input validation
  if (typeof html !== 'string') {
    logs.push('❌ Invalid input: html is not a string');
    return { subtitle: undefined, logs };
  }

  if (html.length === 0) {
    logs.push('❌ Empty HTML string');
    return { subtitle: undefined, logs };
  }

  logs.push(`✅ HTML length: ${html.length} characters`);

  // Search for script blocks
  let scriptBlocksFound = 0;
  let scriptBlocksParsed = 0;
  let subtitle: string | undefined = undefined;

  for (const { selector, description } of SCRIPT_BLOCK_TYPES) {
    if (subtitle) {
      logs.push(`✓ Subtitle already found, skipping remaining block types`);
      break; // Stop once we find a valid subtitle
    }

    logs.push(`\n🔍 Searching for <script> blocks with ${description}...`);

    // Find all script blocks matching this type
    const scriptBlocks = extractScriptBlocks(html, selector);
    scriptBlocksFound += scriptBlocks.length;

    if (scriptBlocks.length === 0) {
      logs.push(`  ⚠️  No script blocks found for ${description}`);
      continue;
    }

    logs.push(`  ✅ Found ${scriptBlocks.length} script block(s) for ${description}`);

    // Try parsing each script block
    for (let i = 0; i < scriptBlocks.length && i < SAFETY_LIMITS.MAX_SCRIPT_ATTEMPTS; i++) {
      const block = scriptBlocks[i];

      logs.push(`  📄 Parsing script block ${i + 1}/${scriptBlocks.length}...`);

      // Safety check: script size
      if (block.length > SAFETY_LIMITS.MAX_SCRIPT_SIZE) {
        logs.push(`    ⚠️  Script block too large (${block.length} bytes), skipping for safety`);
        continue;
      }

      // Parse JSON safely
      const parseResult = parseJsonSafely(block, logs);
      if (!parseResult.success || !parseResult.data) {
        continue; // Logs already added by parseJsonSafely
      }

      scriptBlocksParsed++;

      // Search for subtitle in parsed JSON
      const extractedSubtitle = searchForSubtitle(parseResult.data, logs);
      if (extractedSubtitle) {
        subtitle = extractedSubtitle;
        logs.push(`  ✅ Subtitle found in ${description} block ${i + 1}: "${subtitle}"`);
        break; // Stop searching once we find a valid subtitle
      }
    }
  }

  // Summary
  logs.push(`\n📊 Summary:`);
  logs.push(`  - Script blocks found: ${scriptBlocksFound}`);
  logs.push(`  - Script blocks parsed: ${scriptBlocksParsed}`);
  logs.push(`  - Subtitle extracted: ${subtitle ? 'YES' : 'NO'}`);

  if (subtitle) {
    logs.push(`\n✅ Final subtitle: "${subtitle}"`);
  } else {
    logs.push(`\n❌ No subtitle found in any JSON block`);
  }

  return { subtitle, logs };
}

/**
 * Extract script block content from HTML
 *
 * @param html - Raw HTML
 * @param selector - Script block identifier (type or data attribute)
 * @returns Array of script block contents
 */
function extractScriptBlocks(html: string, selector: string): string[] {
  const blocks: string[] = [];

  try {
    // Build regex patterns for different selector types
    let pattern: RegExp;

    if (selector.includes('application/')) {
      // Match <script type="application/json"> ... </script>
      // Escape special regex characters: / and +
      const escapedType = selector.replace(/[\/+]/g, '\\$&');
      pattern = new RegExp(`<script[^>]*type=["']${escapedType}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'gi');
    } else {
      // Match <script data-ember-store> ... </script>
      pattern = new RegExp(`<script[^>]*${selector}[^>]*>([\\s\\S]*?)<\\/script>`, 'gi');
    }

    // Extract all matching blocks
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const content = match[1]?.trim();
      if (content) {
        blocks.push(content);
      }
    }
  } catch (error) {
    // Regex errors shouldn't break extraction
    console.error(`[subtitleJsonExtractor] Regex error for selector "${selector}":`, error);
  }

  return blocks;
}

/**
 * Parse JSON safely with error handling
 *
 * @param jsonString - JSON string to parse
 * @param logs - Log array to append messages
 * @returns Parse result with success flag and data
 */
function parseJsonSafely(
  jsonString: string,
  logs: string[]
): { success: boolean; data?: any } {
  try {
    const parsed = JSON.parse(jsonString);

    // Type validation: reject arrays, accept objects only
    if (Array.isArray(parsed)) {
      logs.push(`    ⚠️  JSON is an array, skipping (expected object)`);
      return { success: false };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      logs.push(`    ⚠️  JSON is not an object, skipping`);
      return { success: false };
    }

    logs.push(`    ✅ JSON parsed successfully`);
    return { success: true, data: parsed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`    ❌ JSON parse failed: ${errorMessage}`);
    return { success: false };
  }
}

/**
 * Search for subtitle field in parsed JSON object
 *
 * Searches nested objects recursively up to 5 levels deep.
 * Tries multiple field name variations.
 *
 * @param obj - Parsed JSON object
 * @param logs - Log array to append messages
 * @param depth - Current recursion depth (for safety)
 * @returns Subtitle string if found, undefined otherwise
 */
function searchForSubtitle(obj: any, logs: string[], depth: number = 0): string | undefined {
  const MAX_DEPTH = 5; // Prevent infinite recursion

  if (depth > MAX_DEPTH) {
    return undefined;
  }

  // Direct field name matches (current level)
  for (const fieldName of SUBTITLE_FIELD_NAMES) {
    if (fieldName in obj && typeof obj[fieldName] === 'string') {
      const value = obj[fieldName].trim();

      // Validate subtitle length
      if (value.length === 0) {
        logs.push(`    ⚠️  Found empty "${fieldName}" field`);
        continue;
      }

      if (value.length > SAFETY_LIMITS.MAX_SUBTITLE_LENGTH) {
        logs.push(`    ⚠️  Found "${fieldName}" but too long (${value.length} chars), skipping`);
        continue;
      }

      logs.push(`    ✅ Found subtitle in field "${fieldName}": "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
      return value;
    }
  }

  // Recursive search in nested objects
  for (const key of Object.keys(obj)) {
    const value = obj[key];

    // Skip arrays (too complex for this experimental version)
    if (Array.isArray(value)) {
      continue;
    }

    // Recursively search nested objects
    if (typeof value === 'object' && value !== null) {
      const result = searchForSubtitle(value, logs, depth + 1);
      if (result) {
        return result;
      }
    }
  }

  return undefined;
}
