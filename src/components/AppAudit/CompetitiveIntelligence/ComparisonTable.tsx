/**
 * Comparison Table Component
 *
 * Side-by-side comparison of target app vs competitors
 * Shows key metrics: keyword count, combo count, keyword frequency
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AnalyzeCompetitorsData } from '@/types/competitiveIntelligence';

interface ComparisonTableProps {
  data: AnalyzeCompetitorsData;
}

type SortColumn = 'name' | 'keywordCount' | 'comboCount' | 'overallScore';
type SortDirection = 'asc' | 'desc';

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ data }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('overallScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Prepare table data
  const tableData = useMemo(() => {
    const rows = [
      // Target app row
      {
        id: data.targetApp.appStoreId,
        name: data.targetApp.name,
        subtitle: data.targetApp.subtitle || null,
        isTarget: true,
        keywordCount: data.targetApp.audit.keywordCoverage?.totalUniqueKeywords || 0,
        comboCount: data.targetApp.audit.comboCoverage?.totalCombos || 0,
        overallScore: data.targetApp.audit.overallScore || 0,
        keywordFrequency: data.targetApp.audit.keywordFrequency || [],
      },
      // Competitor rows
      ...data.competitors.map((competitor) => ({
        id: competitor.appStoreId,
        name: competitor.name,
        subtitle: competitor.subtitle || null,
        isTarget: false,
        keywordCount: competitor.audit.keywordCoverage?.totalUniqueKeywords || 0,
        comboCount: competitor.audit.comboCoverage?.totalCombos || 0,
        overallScore: competitor.audit.overallScore || 0,
        keywordFrequency: competitor.audit.keywordFrequency || [],
      })),
    ];

    // Sort rows
    const sorted = [...rows].sort((a, b) => {
      if (a.isTarget) return -1; // Always keep target app first
      if (b.isTarget) return 1;

      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'keywordCount':
          aValue = a.keywordCount;
          bValue = b.keywordCount;
          break;
        case 'comboCount':
          aValue = a.comboCount;
          bValue = b.comboCount;
          break;
        case 'overallScore':
          aValue = a.overallScore;
          bValue = b.overallScore;
          break;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
    });

    return sorted;
  }, [data, sortColumn, sortDirection]);

  // Calculate averages for comparison
  const competitorAvg = useMemo(() => {
    if (data.competitors.length === 0) return { keywordCount: 0, comboCount: 0, overallScore: 0 };

    const sum = data.competitors.reduce(
      (acc, comp) => ({
        keywordCount: acc.keywordCount + (comp.audit.keywordCoverage?.totalUniqueKeywords || 0),
        comboCount: acc.comboCount + (comp.audit.comboCoverage?.totalCombos || 0),
        overallScore: acc.overallScore + (comp.audit.overallScore || 0),
      }),
      { keywordCount: 0, comboCount: 0, overallScore: 0 }
    );

    return {
      keywordCount: Math.round(sum.keywordCount / data.competitors.length),
      comboCount: Math.round(sum.comboCount / data.competitors.length),
      overallScore: Math.round(sum.overallScore / data.competitors.length),
    };
  }, [data.competitors]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getComparisonIndicator = (value: number, avgValue: number, isTarget: boolean) => {
    if (!isTarget) return null;

    const diff = value - avgValue;
    const percentage = avgValue > 0 ? Math.round((diff / avgValue) * 100) : 0;

    if (Math.abs(diff) < 2) {
      return (
        <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400 ml-2">
          <Minus className="h-3 w-3 mr-1" />
          On Par
        </Badge>
      );
    }

    if (diff > 0) {
      return (
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-900/10 ml-2">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{percentage}%
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 bg-red-900/10 ml-2">
        <TrendingDown className="h-3 w-3 mr-1" />
        {percentage}%
      </Badge>
    );
  };

  const SortButton: React.FC<{ column: SortColumn; label: string }> = ({ column, label }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(column)}
      className="h-8 px-2 hover:bg-zinc-800"
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono tracking-wide uppercase text-zinc-300">
          Side-by-Side Comparison
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Your app vs {data.competitors.length} competitors • Sorted by {sortColumn.replace(/([A-Z])/g, ' $1').toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="w-[250px]">
                  <SortButton column="name" label="App Name" />
                </TableHead>
                <TableHead className="text-center">
                  <SortButton column="keywordCount" label="Keywords" />
                </TableHead>
                <TableHead className="text-center">
                  <SortButton column="comboCount" label="Combos" />
                </TableHead>
                <TableHead className="text-center">
                  <SortButton column="overallScore" label="Score" />
                </TableHead>
                <TableHead className="text-left">Top Keywords</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow
                  key={row.id}
                  className={`border-zinc-800 ${
                    row.isTarget
                      ? 'bg-purple-500/10 hover:bg-purple-500/15'
                      : 'hover:bg-zinc-800/30'
                  }`}
                >
                  {/* App Name */}
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={row.isTarget ? 'text-purple-300' : 'text-zinc-300'}>
                          {row.name}
                        </span>
                        {row.isTarget && (
                          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 bg-purple-900/20">
                            You
                          </Badge>
                        )}
                      </div>
                      {row.subtitle && (
                        <span className="text-xs text-zinc-500 line-clamp-1">
                          {row.subtitle}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Keyword Count */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-mono text-zinc-200">{row.keywordCount}</span>
                      {getComparisonIndicator(row.keywordCount, competitorAvg.keywordCount, row.isTarget)}
                    </div>
                  </TableCell>

                  {/* Combo Count */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-mono text-zinc-200">{row.comboCount}</span>
                      {getComparisonIndicator(row.comboCount, competitorAvg.comboCount, row.isTarget)}
                    </div>
                  </TableCell>

                  {/* Overall Score */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${
                          row.overallScore >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30'
                            : row.overallScore >= 60
                            ? 'bg-blue-500/10 text-blue-400 border-blue-400/30'
                            : 'bg-zinc-700/30 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {row.overallScore}
                      </Badge>
                      {getComparisonIndicator(row.overallScore, competitorAvg.overallScore, row.isTarget)}
                    </div>
                  </TableCell>

                  {/* Top Keywords */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.keywordFrequency.slice(0, 3).map((kf, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs border-zinc-700 text-zinc-400 bg-zinc-800/50"
                        >
                          {kf.keyword}
                          <span className="ml-1 text-zinc-600">({kf.totalCombos})</span>
                        </Badge>
                      ))}
                      {row.keywordFrequency.length > 3 && (
                        <span className="text-xs text-zinc-600">
                          +{row.keywordFrequency.length - 3} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Average Row */}
              <TableRow className="border-t-2 border-zinc-700 bg-zinc-800/20 hover:bg-zinc-800/30">
                <TableCell className="font-medium text-zinc-400">
                  Competitor Average
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono text-zinc-400">{competitorAvg.keywordCount}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono text-zinc-400">{competitorAvg.comboCount}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono text-xs border-zinc-700 text-zinc-400">
                    {competitorAvg.overallScore}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-zinc-600">Based on {data.competitors.length} competitors</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
