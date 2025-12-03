/**
 * TextDiffHighlighter Component
 *
 * Displays text with inline highlighting of changes (additions/removals).
 * Shows word-level diffs with color coding.
 */

import React from 'react';
import type { TextDiffSegment } from '@/types/metadataOptimization';
import { getDiffSegmentClasses, getRemovedWords } from '@/utils/textDiff';

interface TextDiffHighlighterProps {
  /** Text diff segments from edge function */
  segments: TextDiffSegment[];
  /** Original baseline text (to show removed words) */
  baselineText?: string;
  /** Draft text (for comparison) */
  draftText?: string;
  /** Show removed words in strikethrough */
  showRemoved?: boolean;
}

export const TextDiffHighlighter: React.FC<TextDiffHighlighterProps> = ({
  segments,
  baselineText,
  draftText,
  showRemoved = true,
}) => {
  // Calculate removed words if baseline provided
  const removedWords = showRemoved && baselineText && draftText
    ? getRemovedWords(baselineText, draftText)
    : [];

  return (
    <div className="space-y-2">
      {/* Draft text with additions highlighted */}
      <div className="text-sm leading-relaxed">
        {segments.map((segment, idx) => (
          <span key={idx} className={getDiffSegmentClasses(segment.type)}>
            {segment.text}
            {idx < segments.length - 1 && ' '}
          </span>
        ))}
      </div>

      {/* Show removed words separately if any */}
      {removedWords.length > 0 && (
        <div className="text-sm leading-relaxed pt-2 border-t border-zinc-800">
          <span className="text-zinc-500 text-xs mr-2">Removed:</span>
          {removedWords.map((word, idx) => (
            <span key={idx} className={getDiffSegmentClasses('remove')}>
              {word}
              {idx < removedWords.length - 1 && ' '}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Compact inline diff (single line, no removed section)
 */
export const InlineDiff: React.FC<{ segments: TextDiffSegment[] }> = ({ segments }) => {
  return (
    <span className="text-sm">
      {segments.map((segment, idx) => (
        <span key={idx} className={getDiffSegmentClasses(segment.type)}>
          {segment.text}
          {idx < segments.length - 1 && ' '}
        </span>
      ))}
    </span>
  );
};
