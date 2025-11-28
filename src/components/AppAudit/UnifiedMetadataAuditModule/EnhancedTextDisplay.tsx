/**
 * Enhanced Text Display Component
 *
 * Renders title/subtitle text as color-coded badge components:
 * - Brand (hexagon, orange)
 * - Keywords (rounded, purple/emerald)
 * - Connectors (rounded, muted)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { parseTextIntoSegments, type TextSegment } from '@/utils/brandDetector';

interface EnhancedTextDisplayProps {
  text: string;
  type: 'title' | 'subtitle';
  brandOverride?: string | null;
  disableAutoDetect?: boolean; // For subtitle: only use brandOverride, don't auto-detect
}

/**
 * Get badge style classes based on segment type and element type
 */
function getBadgeClasses(segment: TextSegment, elementType: 'title' | 'subtitle'): string {
  const baseClasses = 'font-mono tracking-wide';

  switch (segment.type) {
    case 'brand':
      // Hexagon style, orange
      return `${baseClasses} bg-orange-500/20 border-orange-500/40 text-orange-300 px-4 py-1.5 text-sm font-medium`;

    case 'keyword':
      // Rounded style, purple for title, emerald for subtitle
      const keywordColor = elementType === 'title'
        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
      return `${baseClasses} ${keywordColor} px-3 py-1 text-xs`;

    case 'connector':
    case 'separator':
      // Muted, subtle
      return `${baseClasses} bg-zinc-700/20 border-zinc-700/40 text-zinc-500 px-2 py-0.5 text-xs`;

    default:
      return baseClasses;
  }
}

/**
 * Get clip-path style for badge (hexagon for brand, none for others)
 */
function getClipPathStyle(segment: TextSegment): React.CSSProperties | undefined {
  if (segment.type === 'brand') {
    return {
      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    };
  }
  return undefined;
}

export const EnhancedTextDisplay: React.FC<EnhancedTextDisplayProps> = ({
  text,
  type,
  brandOverride,
  disableAutoDetect = false,
}) => {
  // Parse text into segments (individual keywords, not grouped)
  const segments = React.useMemo(() => {
    // For subtitle with disableAutoDetect, pass empty string to prevent auto-detection
    // Only use brand if explicitly set by user
    const brandToUse = disableAutoDetect ? (brandOverride || '') : brandOverride;
    return parseTextIntoSegments(text, brandToUse, disableAutoDetect);
  }, [text, brandOverride, disableAutoDetect]);

  if (!text || segments.length === 0) {
    return (
      <div className="text-sm text-zinc-400 italic">
        Not available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {segments.map((segment, index) => (
        <Badge
          key={`${segment.type}-${index}`}
          variant="outline"
          className={getBadgeClasses(segment, type)}
          style={getClipPathStyle(segment)}
        >
          {segment.text}
        </Badge>
      ))}
    </div>
  );
};
