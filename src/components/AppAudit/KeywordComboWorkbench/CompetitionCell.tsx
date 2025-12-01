/**
 * Competition Cell Component
 *
 * Displays the number of apps indexed by Apple for a keyword combo.
 * Shows competition level indicator (Low/Medium/High/Very High) with color-coded dot.
 *
 * Note: iTunes Search API limits results to 100, so "100" means "100+" (potentially thousands).
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCacheAge } from '@/hooks/useBatchComboRankings';

interface CompetitionCellProps {
  totalResults: number | null;
  snapshotDate?: string;
}

type CompetitionLevel = 'low' | 'medium' | 'high' | 'very-high';

/**
 * Determine competition level based on total indexed apps
 *
 * Thresholds (adjusted for 200-app API limit):
 * - Low: < 30 apps (very few competitors, easy to rank)
 * - Medium: 30-60 apps (moderate competition)
 * - High: 60-199 apps (high competition)
 * - Very High: 200 apps (maxed out API limit, likely thousands of apps)
 */
function getCompetitionLevel(totalResults: number): CompetitionLevel {
  if (totalResults >= 200) return 'very-high'; // Maxed out (200+)
  if (totalResults >= 60) return 'high';
  if (totalResults >= 30) return 'medium';
  return 'low';
}

/**
 * Get color-coded dot emoji for competition level
 */
function getCompetitionDot(level: CompetitionLevel): string {
  switch (level) {
    case 'low':
      return '🟢'; // Green - Easy to rank
    case 'medium':
      return '🟡'; // Yellow - Moderate effort
    case 'high':
      return '🟠'; // Orange - Challenging
    case 'very-high':
      return '🔴'; // Red - Extremely competitive
  }
}

/**
 * Get human-readable label for competition level
 */
function getCompetitionLabel(level: CompetitionLevel): string {
  switch (level) {
    case 'low':
      return 'Low Competition';
    case 'medium':
      return 'Medium Competition';
    case 'high':
      return 'High Competition';
    case 'very-high':
      return 'Very High Competition';
  }
}

/**
 * CompetitionCell Component
 *
 * Displays total apps indexed with competition indicator.
 * Shows "-" if data not available yet.
 */
export const CompetitionCell: React.FC<CompetitionCellProps> = ({
  totalResults,
  snapshotDate,
}) => {
  // No data yet - show placeholder
  if (totalResults === null) {
    return <span className="text-zinc-500 text-sm">-</span>;
  }

  const level = getCompetitionLevel(totalResults);
  const dot = getCompetitionDot(level);
  const label = getCompetitionLabel(level);

  // Format number with commas and add "+" if maxed out
  const formatted = totalResults >= 200
    ? '200+'
    : totalResults.toLocaleString();

  // Build tooltip content
  const cacheAge = snapshotDate ? formatCacheAge(snapshotDate) : '';
  const tooltipText = totalResults >= 200
    ? '200+ apps indexed by Apple for this keyword (API limit reached - likely thousands)'
    : `${totalResults} apps indexed by Apple for this keyword`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <span className="text-sm leading-none">{dot}</span>
            <span className="text-sm font-mono text-zinc-300 tabular-nums">
              {formatted}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-xs space-y-1">
            <div className="font-medium text-zinc-100">{tooltipText}</div>
            <div className="text-zinc-400">
              Competition: <span className="text-zinc-300 font-medium">{label}</span>
            </div>
            {snapshotDate && (
              <div className="text-zinc-500 text-[10px] mt-1.5 pt-1.5 border-t border-zinc-700">
                Last checked: {cacheAge}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
