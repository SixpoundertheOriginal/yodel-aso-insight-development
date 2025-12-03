/**
 * Text Diff Utilities
 *
 * Simple word-level diff for highlighting changes in metadata fields
 */

import type { TextDiffSegment, DiffType } from '@/types/metadataOptimization';

/**
 * Calculate word-level diff between two texts
 * Returns segments marked as 'keep', 'add', or 'remove'
 */
export function calculateWordDiff(baseline: string, draft: string): TextDiffSegment[] {
  const baselineWords = baseline.trim().split(/\s+/).filter(Boolean);
  const draftWords = draft.trim().split(/\s+/).filter(Boolean);

  const baselineSet = new Set(baselineWords.map(w => w.toLowerCase()));
  const draftSet = new Set(draftWords.map(w => w.toLowerCase()));

  const segments: TextDiffSegment[] = [];

  // First, add all words from draft (with proper type)
  draftWords.forEach((word, index) => {
    const wordLower = word.toLowerCase();

    if (baselineSet.has(wordLower)) {
      // Word exists in baseline - mark as keep
      segments.push({ type: 'keep', text: word });
    } else {
      // Word is new in draft - mark as add
      segments.push({ type: 'add', text: word });
    }
  });

  return segments;
}

/**
 * Get removed words (words in baseline but not in draft)
 */
export function getRemovedWords(baseline: string, draft: string): string[] {
  const baselineWords = baseline.trim().split(/\s+/).filter(Boolean);
  const draftWords = draft.trim().split(/\s+/).filter(Boolean);

  const draftSet = new Set(draftWords.map(w => w.toLowerCase()));

  return baselineWords.filter(word => !draftSet.has(word.toLowerCase()));
}

/**
 * Get CSS classes for diff segment
 */
export function getDiffSegmentClasses(type: DiffType): string {
  switch (type) {
    case 'keep':
      return 'text-zinc-200';
    case 'add':
      return 'text-emerald-400 bg-emerald-500/10 px-1 rounded font-medium';
    case 'remove':
      return 'text-red-400 bg-red-500/10 px-1 rounded line-through font-medium';
    case 'change':
      return 'text-amber-400 bg-amber-500/10 px-1 rounded font-medium';
  }
}

/**
 * Format diff segments into readable text with visual markers
 */
export function formatDiffText(segments: TextDiffSegment[]): string {
  return segments
    .map(segment => {
      switch (segment.type) {
        case 'add':
          return `[+${segment.text}]`;
        case 'remove':
          return `[-${segment.text}]`;
        case 'change':
          return `[~${segment.text}]`;
        default:
          return segment.text;
      }
    })
    .join(' ');
}

/**
 * Count changes in diff
 */
export function countDiffChanges(segments: TextDiffSegment[]): {
  added: number;
  removed: number;
  kept: number;
  total: number;
} {
  const added = segments.filter(s => s.type === 'add').length;
  const removed = segments.filter(s => s.type === 'remove').length;
  const kept = segments.filter(s => s.type === 'keep').length;

  return {
    added,
    removed,
    kept,
    total: segments.length,
  };
}

/**
 * Check if there are any changes
 */
export function hasChanges(segments: TextDiffSegment[]): boolean {
  return segments.some(s => s.type === 'add' || s.type === 'remove' || s.type === 'change');
}

/**
 * Get change summary
 */
export function getChangeSummary(segments: TextDiffSegment[]): string {
  const { added, removed, kept } = countDiffChanges(segments);

  if (added === 0 && removed === 0) {
    return 'No changes';
  }

  const parts: string[] = [];
  if (added > 0) parts.push(`+${added} added`);
  if (removed > 0) parts.push(`-${removed} removed`);
  if (kept > 0) parts.push(`${kept} kept`);

  return parts.join(', ');
}
