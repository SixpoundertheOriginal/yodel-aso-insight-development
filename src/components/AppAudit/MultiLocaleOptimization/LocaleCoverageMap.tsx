/**
 * Locale Coverage Map
 * Shows which locales contribute which keywords/combos to US indexation
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import type { LocaleCoverageAnalysis } from '@/types/multiLocaleMetadata';
import { LOCALE_NAMES } from '@/types/multiLocaleMetadata';

interface LocaleCoverageMapProps {
  coverage: LocaleCoverageAnalysis;
}

export const LocaleCoverageMap: React.FC<LocaleCoverageMapProps> = ({ coverage }) => {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base font-medium text-zinc-200">
          📍 Locale Coverage Map
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Which locales contribute keywords and combinations to US App Store indexation
        </p>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead className="text-zinc-400">Locale</TableHead>
              <TableHead className="text-zinc-400 text-right">Unique Tokens</TableHead>
              <TableHead className="text-zinc-400 text-right">Combos</TableHead>
              <TableHead className="text-zinc-400 text-right">Duplicates</TableHead>
              <TableHead className="text-zinc-400">Contribution</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.locales.map(locale => (
              <TableRow key={locale.locale} className="border-zinc-800">
                {/* Locale Name */}
                <TableCell className="font-medium text-zinc-200">
                  {LOCALE_NAMES[locale.locale]}
                  {locale.locale === 'EN_US' && (
                    <Badge variant="outline" className="ml-2 text-[10px] border-emerald-500/40 text-emerald-400">
                      PRIMARY
                    </Badge>
                  )}
                </TableCell>

                {/* Unique Tokens */}
                <TableCell className="text-right">
                  <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                    {locale.uniqueTokens}
                  </Badge>
                </TableCell>

                {/* Total Combos */}
                <TableCell className="text-right">
                  <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                    {locale.totalCombos}
                  </Badge>
                </TableCell>

                {/* Duplicate Tokens */}
                <TableCell className="text-right">
                  {locale.duplicateTokens > 0 ? (
                    <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-400">
                      ⚠️ {locale.duplicateTokens}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">
                      ✓ 0
                    </Badge>
                  )}
                </TableCell>

                {/* Contribution % */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={locale.contributionPct} className="flex-1 h-2" />
                    <span className="text-xs text-zinc-400 min-w-[40px] text-right">
                      {locale.contributionPct.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  {locale.emptySlots ? (
                    <Badge variant="outline" className="text-[10px] border-blue-400/40 text-blue-400">
                      💡 Has Space
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                      Full
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Card className="bg-zinc-900/30 border-zinc-800 p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Empty Locales</p>
            <p className="text-lg font-semibold text-zinc-200">
              {coverage.emptyLocales.length}
              <span className="text-xs text-zinc-500 ml-1">/ 10</span>
            </p>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Underutilized</p>
            <p className="text-lg font-semibold text-zinc-200">
              {coverage.underutilizedLocales.length}
              <span className="text-xs text-zinc-500 ml-1">locales</span>
            </p>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Duplicated Keywords</p>
            <p className="text-lg font-semibold text-amber-400">
              {coverage.duplicatedKeywords.length}
              <span className="text-xs text-zinc-500 ml-1">keywords</span>
            </p>
          </Card>
        </div>

        {/* Duplicated Keywords Detail */}
        {coverage.duplicatedKeywords.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs font-medium text-amber-400 mb-2">⚠️ Duplicated Keywords (may reduce efficiency)</p>
            <div className="flex flex-wrap gap-2">
              {coverage.duplicatedKeywords.slice(0, 10).map(dup => (
                <div key={dup.keyword} className="text-xs">
                  <Badge variant="outline" className="border-amber-400/40 text-amber-400">
                    {dup.keyword}
                  </Badge>
                  <span className="text-zinc-500 ml-1">
                    ({dup.appearsIn.length} locales)
                  </span>
                </div>
              ))}
              {coverage.duplicatedKeywords.length > 10 && (
                <span className="text-xs text-zinc-500">
                  +{coverage.duplicatedKeywords.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
