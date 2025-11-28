/**
 * Brand Detection & Text Parsing for Enhanced Visual Display
 *
 * Detects brand portion of app titles/subtitles and parses text into
 * meaningful segments (brand, keywords, connectors) for badge rendering.
 */

// Stop words that don't contribute to ASO value
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with',
]);

// Common separators used in app titles
const SEPARATORS = ['-', '–', '—', '|', ':', '•'];

export type TextSegmentType = 'brand' | 'keyword' | 'connector' | 'separator';

export interface TextSegment {
  text: string;
  type: TextSegmentType;
  startIndex: number;
  endIndex: number;
}

/**
 * Detect brand portion of title/subtitle using pattern analysis
 *
 * Strategy:
 * 1. Look for separator-based brand (e.g., "Inspire - Self Care")
 * 2. Validate candidate is 1-3 words and capitalized
 * 3. Fall back to first word if no separator found
 */
export function detectBrand(text: string, brandOverride?: string | null): string | null {
  // If user provided override, use it
  if (brandOverride) {
    return brandOverride;
  }

  if (!text || text.trim().length === 0) {
    return null;
  }

  // Method 1: Separator-based detection
  for (const separator of SEPARATORS) {
    const parts = text.split(separator);
    if (parts.length >= 2) {
      const candidate = parts[0].trim();

      // Validate: should be 1-3 words and start with capital
      const words = candidate.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && /^[A-Z]/.test(candidate)) {
        return candidate;
      }
    }
  }

  // Method 2: First word if capitalized and unique-looking
  const firstWord = text.split(/\s+/)[0];
  if (firstWord && /^[A-Z][a-z]*$/.test(firstWord) && firstWord.length >= 3) {
    return firstWord;
  }

  return null;
}

/**
 * Check if a word is a stop word (connector)
 */
function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase());
}

/**
 * Check if a character is a separator
 */
function isSeparator(char: string): boolean {
  return SEPARATORS.includes(char);
}

/**
 * Extract meaningful keywords from text (excludes stop words)
 */
export function extractMeaningfulKeywords(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');

  const words = normalized.split(/\s+/).filter(Boolean);

  return words.filter((word) => !isStopWord(word) && word.length >= 2);
}

/**
 * Parse text into segments for badge rendering
 *
 * Returns array of segments with types:
 * - brand: Detected brand name
 * - keyword: Meaningful ASO keywords
 * - connector: Stop words (&, and, for, etc.)
 * - separator: Visual separators (-, |, :, etc.)
 */
export function parseTextIntoSegments(
  text: string,
  brandOverride?: string | null,
  disableAutoDetect?: boolean
): TextSegment[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const segments: TextSegment[] = [];

  // If disableAutoDetect is true, only use brandOverride (don't auto-detect)
  const detectedBrand = disableAutoDetect
    ? (brandOverride || null)
    : detectBrand(text, brandOverride);

  let currentIndex = 0;

  // If brand detected, mark it first
  if (detectedBrand) {
    const brandIndex = text.indexOf(detectedBrand);
    if (brandIndex === 0) {
      segments.push({
        text: detectedBrand,
        type: 'brand',
        startIndex: 0,
        endIndex: detectedBrand.length,
      });
      currentIndex = detectedBrand.length;
    }
  }

  // Parse remaining text
  const remainingText = text.slice(currentIndex).trim();

  // Handle leading separator if present
  if (remainingText.length > 0 && isSeparator(remainingText[0])) {
    segments.push({
      text: remainingText[0],
      type: 'separator',
      startIndex: currentIndex,
      endIndex: currentIndex + 1,
    });
    currentIndex += remainingText[0].length;
  }

  // Parse rest into keywords and connectors
  const restText = text.slice(currentIndex).trim();
  const words = restText.split(/\s+/);

  words.forEach((word, index) => {
    if (!word) return;

    // Check if word contains separator
    const hasSeparator = SEPARATORS.some(sep => word.includes(sep));

    if (hasSeparator) {
      // Split word by separator and process parts
      const separatorMatch = word.match(new RegExp(`([^${SEPARATORS.join('')}]+)([${SEPARATORS.join('')}])(.*)`, 'g'));

      if (separatorMatch) {
        // Handle complex case with separator in word
        const parts = word.split(new RegExp(`([${SEPARATORS.join('')}])`));
        parts.forEach(part => {
          if (!part) return;

          if (isSeparator(part)) {
            segments.push({
              text: part,
              type: 'separator',
              startIndex: currentIndex,
              endIndex: currentIndex + part.length,
            });
          } else {
            const isConnector = isStopWord(part);
            segments.push({
              text: part,
              type: isConnector ? 'connector' : 'keyword',
              startIndex: currentIndex,
              endIndex: currentIndex + part.length,
            });
          }
          currentIndex += part.length;
        });
      }
    } else {
      // Simple word
      const cleanWord = word.replace(/[^\w\s-]/g, '');
      const isConnector = isStopWord(cleanWord);

      segments.push({
        text: cleanWord || word,
        type: isConnector ? 'connector' : 'keyword',
        startIndex: currentIndex,
        endIndex: currentIndex + word.length,
      });

      currentIndex += word.length + 1; // +1 for space
    }
  });

  return segments;
}

/**
 * Group consecutive keywords into phrases
 *
 * Example: ["Self", "Care"] -> ["Self Care"]
 * Keeps connectors separate
 */
export function groupKeywordsIntoPhrases(segments: TextSegment[]): TextSegment[] {
  const grouped: TextSegment[] = [];
  let currentPhrase: TextSegment | null = null;

  segments.forEach(segment => {
    if (segment.type === 'keyword') {
      if (currentPhrase) {
        // Extend current phrase
        currentPhrase.text += ' ' + segment.text;
        currentPhrase.endIndex = segment.endIndex;
      } else {
        // Start new phrase
        currentPhrase = { ...segment };
      }
    } else {
      // Non-keyword: flush current phrase and add separator/connector
      if (currentPhrase) {
        grouped.push(currentPhrase);
        currentPhrase = null;
      }
      grouped.push(segment);
    }
  });

  // Flush remaining phrase
  if (currentPhrase) {
    grouped.push(currentPhrase);
  }

  return grouped;
}
