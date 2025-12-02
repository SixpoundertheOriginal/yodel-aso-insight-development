/**
 * Duplicate Highlighter Component
 *
 * Renders text with red-highlighted duplicate words for visual identification.
 * Used in the Enhanced Duplicates Card to show where duplicates appear.
 */

import React from 'react';

interface HighlightedTextProps {
  text: string;
  duplicates: string[];
  label: string; // "Title", "Subtitle", "Keywords"
}

/**
 * Component to render text with red-highlighted duplicates
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  duplicates,
  label,
}) => {
  // Normalize duplicates set for faster lookup
  const duplicatesSet = new Set(duplicates.map(d => d.toLowerCase()));

  // Split text into words while preserving separators
  const parts = text.split(/(\s+|,)/);

  return (
    <div className="mb-3">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}:</span>
      <div className="mt-1 text-sm text-zinc-300 leading-relaxed">
        {parts.map((part, idx) => {
          // Clean the word for comparison (remove punctuation, lowercase)
          const cleanWord = part.toLowerCase().replace(/[^\w]/g, '');
          const isDupe = cleanWord.length > 0 && duplicatesSet.has(cleanWord);

          return (
            <span
              key={idx}
              className={
                isDupe
                  ? 'bg-red-500/20 text-red-400 px-1 rounded font-medium'
                  : ''
              }
            >
              {part}
            </span>
          );
        })}
      </div>
    </div>
  );
};
