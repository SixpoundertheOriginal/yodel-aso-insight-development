/**
 * Competition Cell Component - Batman Arkham Knight Tactical Style
 *
 * Displays competition with tactical bar visualization and holographic glow.
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

function getCompetitionLevel(totalResults: number): CompetitionLevel {
  if (totalResults >= 200) return 'very-high';
  if (totalResults >= 60) return 'high';
  if (totalResults >= 30) return 'medium';
  return 'low';
}

function getCompetitionColor(level: CompetitionLevel): { bar: string; text: string; glow: string } {
  switch (level) {
    case 'low':
      return { bar: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]' };
    case 'medium':
      return { bar: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.3)]' };
    case 'high':
      return { bar: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.3)]' };
    case 'very-high':
      return { bar: 'bg-red-500', text: 'text-red-400', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]' };
  }
}

function getCompetitionLabel(level: CompetitionLevel): string {
  switch (level) {
    case 'low':
      return 'LOW';
    case 'medium':
      return 'MED';
    case 'high':
      return 'HIGH';
    case 'very-high':
      return 'V.HIGH';
  }
}

/**
 * Tactical Competition Cell - Bar visualization
 */
export const CompetitionCell: React.FC<CompetitionCellProps> = ({
  totalResults,
  snapshotDate,
}) => {
  if (totalResults === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-zinc-800/50 rounded-sm" />
        <span className="text-zinc-600 text-xs font-mono">--</span>
      </div>
    );
  }

  const level = getCompetitionLevel(totalResults);
  const { bar, text, glow } = getCompetitionColor(level);
  const label = getCompetitionLabel(level);
  
  // Calculate bar width percentage (0-100%)
  const barWidth = Math.min((totalResults / 200) * 100, 100);
  
  const formatted = totalResults >= 200 ? '200+' : totalResults.toLocaleString();
  const cacheAge = snapshotDate ? formatCacheAge(snapshotDate) : '';
  const tooltipText = totalResults >= 200
    ? '200+ apps (API limit - likely thousands)'
    : `${totalResults} apps indexed`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            {/* Tactical Bar */}
            <div className="relative w-16 h-2 bg-black/40 border border-zinc-800/60 rounded-sm overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full ${bar} ${glow} transition-all duration-300`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            
            {/* Value & Label */}
            <div className="flex flex-col items-start">
              <span className={`text-xs font-mono font-semibold ${text} leading-none`}>
                {formatted}
              </span>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
                {label}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-black/95 border-orange-500/30">
          <div className="text-xs space-y-1">
            <div className="font-medium text-zinc-100">{tooltipText}</div>
            <div className="text-zinc-400">
              Level: <span className={`font-bold ${text}`}>{label}</span>
            </div>
            {snapshotDate && (
              <div className="text-zinc-500 text-[10px] mt-1.5 pt-1.5 border-t border-zinc-800">
                Last checked: {cacheAge}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
