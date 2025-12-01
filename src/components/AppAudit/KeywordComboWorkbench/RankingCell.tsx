/**
 * RankingCell Component
 *
 * Displays combo ranking in the All Combos Table.
 * Shows position (#1-100), trend indicator, and loading states.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import type { ComboRankingData } from '@/hooks/useBatchComboRankings';
import { formatCacheAge, isCacheStale } from '@/hooks/useBatchComboRankings';

interface RankingCellProps {
  combo: string;
  appId: string;
  country: string;
  cachedRanking?: ComboRankingData;
  isLoading?: boolean;
}

export const RankingCell: React.FC<RankingCellProps> = ({ combo, appId, country, cachedRanking, isLoading = false }) => {
  const ranking = cachedRanking;
  const error = null;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Checking...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
        Error
      </Badge>
    );
  }

  // App not in database (not being monitored)
  if (!ranking && !isLoading && !error) {
    return (
      <Badge
        variant="outline"
        className="border-zinc-700 text-zinc-600 text-xs"
        title="Add this app to tracked apps to enable ranking checks"
      >
        Not Tracked
      </Badge>
    );
  }

  // Not ranking
  if (!ranking || !ranking.isRanking || ranking.position === null) {
    return (
      <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
        Not Ranked
      </Badge>
    );
  }

  // Determine badge color based on position
  const getBadgeColor = (position: number) => {
    if (position <= 10) return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
    if (position <= 30) return 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5';
    if (position <= 50) return 'border-orange-500/30 text-orange-400 bg-orange-500/5';
    return 'border-zinc-600/30 text-zinc-400 bg-zinc-600/5';
  };

  // Determine trend icon
  const getTrendIcon = () => {
    if (!ranking.trend) return null;

    switch (ranking.trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-emerald-400" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-400" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-zinc-500" />;
      case 'new':
        return <Sparkles className="h-3 w-3 text-blue-400" />;
      default:
        return null;
    }
  };

  // Generate cache age tooltip
  const cacheAge = ranking.snapshotDate ? formatCacheAge(ranking.snapshotDate) : '';
  const isStale = ranking.snapshotDate ? isCacheStale(ranking.snapshotDate) : false;
  const cacheTooltip = `Last checked: ${cacheAge}${isStale ? ' (stale, refresh recommended)' : ''}`;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`${getBadgeColor(ranking.position)} text-xs font-mono font-semibold px-2 py-0.5`}
        title={cacheTooltip}
      >
        #{ranking.position}
      </Badge>

      {ranking.trend && (
        <div
          className="flex items-center"
          title={getTrendTooltip(ranking.trend, ranking.positionChange)}
        >
          {getTrendIcon()}
        </div>
      )}

      {/* Stale indicator */}
      {isStale && (
        <div
          className="h-1.5 w-1.5 rounded-full bg-yellow-500/50"
          title="Data is over 20 hours old"
        />
      )}
    </div>
  );
};

/**
 * Helper: Get tooltip text for trend
 */
function getTrendTooltip(trend: string, positionChange: number | null): string {
  if (trend === 'new') return 'New ranking';
  if (trend === 'stable') return 'Position stable';
  if (trend === 'up' && positionChange) return `Improved by ${positionChange} positions`;
  if (trend === 'down' && positionChange) return `Dropped by ${Math.abs(positionChange)} positions`;
  return 'Ranking tracked';
}
