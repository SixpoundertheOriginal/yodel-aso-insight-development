/**
 * Ranking Fusion View
 * Shows final US ranking using max(rank_L) across all locales
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FusedRanking } from '@/types/multiLocaleMetadata';
import { LOCALE_NAMES } from '@/types/multiLocaleMetadata';

interface RankingFusionViewProps {
  fusedRankings: FusedRanking[];
}

export const RankingFusionView: React.FC<RankingFusionViewProps> = ({ fusedRankings }) => {
  // Helper: Get tier badge variant
  const getTierBadge = (tier: number) => {
    if (tier === 1) {
      return (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
          🔥 Tier 1
        </Badge>
      );
    }
    if (tier === 2) {
      return (
        <Badge variant="outline" className="border-blue-400/40 text-blue-400">
          💎 Tier 2
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-zinc-600 text-zinc-400">
        ⚡ Tier {tier}
      </Badge>
    );
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base font-medium text-zinc-200">
          🔀 Ranking Fusion Analysis
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Final US ranking = max(rank across all locales). Stronger locale wins for each keyword.
        </p>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead className="text-zinc-400">Keyword</TableHead>
              <TableHead className="text-zinc-400">Best Rank</TableHead>
              <TableHead className="text-zinc-400">Score</TableHead>
              <TableHead className="text-zinc-400">Source Locale</TableHead>
              <TableHead className="text-zinc-400">Appears In</TableHead>
              <TableHead className="text-zinc-400">Fusion Strategy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fusedRankings.slice(0, 20).map(ranking => (
              <TableRow key={ranking.keyword} className="border-zinc-800">
                {/* Keyword */}
                <TableCell className="font-medium text-zinc-200">
                  {ranking.keyword}
                </TableCell>

                {/* Best Tier */}
                <TableCell>{getTierBadge(ranking.bestTier)}</TableCell>

                {/* Score */}
                <TableCell>
                  <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                    {ranking.bestScore}
                  </Badge>
                </TableCell>

                {/* Source Locale */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      ranking.bestLocale === 'EN_US'
                        ? 'border-emerald-500/40 text-emerald-400'
                        : 'border-violet-400/40 text-violet-400'
                    }`}
                  >
                    {LOCALE_NAMES[ranking.bestLocale]}
                  </Badge>
                </TableCell>

                {/* Appears In */}
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {ranking.appearsIn.slice(0, 3).map(locale => (
                      <Badge
                        key={locale}
                        variant="outline"
                        className="text-[10px] border-zinc-700 text-zinc-500"
                      >
                        {locale}
                      </Badge>
                    ))}
                    {ranking.appearsIn.length > 3 && (
                      <span className="text-[10px] text-zinc-500">
                        +{ranking.appearsIn.length - 3}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Fusion Strategy */}
                <TableCell className="text-xs text-zinc-400">
                  {ranking.fusionStrategy === 'primary_strongest' ? (
                    <span className="text-emerald-400">📊 Primary (EN_US) strongest</span>
                  ) : ranking.fusionStrategy === 'secondary_stronger' ? (
                    <span className="text-violet-400">🔥 Secondary locale stronger</span>
                  ) : (
                    <span className="text-blue-400">⚖️ Equal rank</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {fusedRankings.length > 20 && (
          <p className="text-xs text-zinc-500 text-center mt-3">
            Showing top 20 of {fusedRankings.length} keywords
          </p>
        )}

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Card className="bg-zinc-900/30 border-zinc-800 p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Keywords</p>
            <p className="text-lg font-semibold text-zinc-200">{fusedRankings.length}</p>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">From EN_US</p>
            <p className="text-lg font-semibold text-emerald-400">
              {fusedRankings.filter(r => r.bestLocale === 'EN_US').length}
            </p>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">From Secondary</p>
            <p className="text-lg font-semibold text-violet-400">
              {fusedRankings.filter(r => r.bestLocale !== 'EN_US').length}
            </p>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
