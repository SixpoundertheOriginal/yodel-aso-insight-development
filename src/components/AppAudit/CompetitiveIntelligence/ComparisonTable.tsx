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

  // Helper: Calculate character usage from metadata
  const getCharacterUsage = (audit: any) => {
    const titleChars = audit.elements?.title?.metadata?.characterUsage || 0;
    const subtitleChars = audit.elements?.subtitle?.metadata?.characterUsage || 0;
    return {
      title: titleChars,
      subtitle: subtitleChars,
      maxTitle: 30,
      maxSubtitle: 30,
    };
  };

  // Helper: Detect duplicate keywords between title and subtitle
  const getDuplicateKeywords = (audit: any) => {
    const titleKeywords = audit.elements?.title?.metadata?.keywords || [];
    const subtitleKeywords = audit.elements?.subtitle?.metadata?.keywords || [];

    const titleSet = new Set(titleKeywords.map((k: string) => k.toLowerCase()));
    const duplicates = subtitleKeywords.filter((k: string) => titleSet.has(k.toLowerCase()));

    return {
      count: duplicates.length,
      keywords: duplicates,
    };
  };

  // Helper: Calculate keyword density (chars per keyword)
  const getKeywordDensity = (audit: any) => {
    const titleChars = audit.elements?.title?.metadata?.characterUsage || 0;
    const subtitleChars = audit.elements?.subtitle?.metadata?.characterUsage || 0;
    const totalKeywords = audit.keywordCoverage?.totalUniqueKeywords || 0;

    if (totalKeywords === 0) return 0;
    return (titleChars + subtitleChars) / totalKeywords;
  };

  // Helper: Analyze combo diversity (2-word and 3-word breakdown)
  const getComboDiversity = (audit: any) => {
    const allCombos = audit.comboCoverage?.allCombinedCombos || [];

    if (allCombos.length === 0) {
      return {
        twoWord: 0,
        threeWord: 0,
        twoWordPct: 0,
        threeWordPct: 0,
        total: 0,
      };
    }

    let twoWord = 0;
    let threeWord = 0;

    allCombos.forEach((combo: string) => {
      const wordCount = combo.trim().split(/\s+/).length;
      if (wordCount === 2) twoWord++;
      else if (wordCount === 3) threeWord++;
    });

    const total = allCombos.length;

    return {
      twoWord,
      threeWord,
      twoWordPct: Math.round((twoWord / total) * 100),
      threeWordPct: Math.round((threeWord / total) * 100),
      total,
    };
  };

  // Helper: Analyze keyword placement (title vs subtitle distribution)
  const getKeywordPlacement = (audit: any) => {
    const titleKeywords = audit.elements?.title?.metadata?.keywords || [];
    const subtitleKeywords = audit.elements?.subtitle?.metadata?.keywords || [];

    const titleCount = titleKeywords.length;
    const subtitleCount = subtitleKeywords.length;
    const total = titleCount + subtitleCount;

    if (total === 0) {
      return {
        titleCount: 0,
        subtitleCount: 0,
        titlePct: 0,
        subtitlePct: 0,
        total: 0,
      };
    }

    return {
      titleCount,
      subtitleCount,
      titlePct: Math.round((titleCount / total) * 100),
      subtitlePct: Math.round((subtitleCount / total) * 100),
      total,
    };
  };

  // Helper: Calculate combo casting score (algorithmic visibility potential)
  const getComboCastingScore = (keywordCount: number, comboCount: number) => {
    if (keywordCount === 0 || comboCount === 0) return 0;

    // Formula: sqrt(keywords) × log(combos)
    // Balances breadth (keywords) and depth (combos)
    const score = Math.sqrt(keywordCount) * Math.log10(comboCount);
    return Math.round(score * 10) / 10; // Round to 1 decimal
  };

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
        charUsage: getCharacterUsage(data.targetApp.audit),
        duplicates: getDuplicateKeywords(data.targetApp.audit),
        density: 0, // Will calculate after
        diversity: getComboDiversity(data.targetApp.audit),
        placement: getKeywordPlacement(data.targetApp.audit),
        castingScore: getComboCastingScore(
          data.targetApp.audit.keywordCoverage?.totalUniqueKeywords || 0,
          data.targetApp.audit.comboCoverage?.totalCombos || 0
        ),
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
        charUsage: getCharacterUsage(competitor.audit),
        duplicates: getDuplicateKeywords(competitor.audit),
        density: 0, // Will calculate after
        diversity: getComboDiversity(competitor.audit),
        placement: getKeywordPlacement(competitor.audit),
        castingScore: getComboCastingScore(
          competitor.audit.keywordCoverage?.totalUniqueKeywords || 0,
          competitor.audit.comboCoverage?.totalCombos || 0
        ),
      })),
    ];

    // Calculate density for each row (pass full audit for correct calculation)
    const targetAudit = data.targetApp.audit;
    const competitorAudits = data.competitors.map((c) => c.audit);

    rows[0].density = getKeywordDensity(targetAudit); // Target app
    rows.slice(1).forEach((row, index) => {
      row.density = getKeywordDensity(competitorAudits[index]);
    });

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
                <TableHead className="w-[200px]">
                  <SortButton column="name" label="App Name" />
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <span className="text-xs text-zinc-400">Title Chars</span>
                </TableHead>
                <TableHead className="text-center w-[100px]">
                  <span className="text-xs text-zinc-400">Subtitle Chars</span>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <span className="text-xs text-zinc-400">Dupes</span>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <span className="text-xs text-zinc-400">Density</span>
                </TableHead>
                <TableHead className="text-center w-[140px]">
                  <span className="text-xs text-zinc-400">Combo Diversity</span>
                </TableHead>
                <TableHead className="text-center w-[140px]">
                  <span className="text-xs text-zinc-400">Keyword Placement</span>
                </TableHead>
                <TableHead className="text-center w-[120px]">
                  <span className="text-xs text-zinc-400">Top Keyword</span>
                </TableHead>
                <TableHead className="text-center w-[80px]">
                  <span className="text-xs text-zinc-400">Casting</span>
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

                  {/* Title Character Usage */}
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono text-zinc-300">
                        {row.charUsage.title}/{row.charUsage.maxTitle}
                      </span>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            row.charUsage.title >= 27 ? 'bg-emerald-500' :
                            row.charUsage.title >= 21 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${(row.charUsage.title / row.charUsage.maxTitle) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Subtitle Character Usage */}
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono text-zinc-300">
                        {row.charUsage.subtitle}/{row.charUsage.maxSubtitle}
                      </span>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            row.charUsage.subtitle >= 27 ? 'bg-emerald-500' :
                            row.charUsage.subtitle >= 21 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${(row.charUsage.subtitle / row.charUsage.maxSubtitle) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Duplicates */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-sm font-mono ${
                        row.duplicates.count === 0 ? 'text-emerald-400' : 'text-orange-400'
                      }`}>
                        {row.duplicates.count}
                      </span>
                      {row.duplicates.count > 0 && (
                        <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-900/10 text-xs px-1">
                          ⚠️
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Keyword Density */}
                  <TableCell className="text-center">
                    <span className={`text-xs font-mono ${
                      row.density <= 5 ? 'text-emerald-400' :
                      row.density <= 6.5 ? 'text-zinc-300' :
                      'text-orange-400'
                    }`}>
                      {row.density.toFixed(1)}
                    </span>
                  </TableCell>

                  {/* Combo Diversity */}
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1.5">
                      {/* 2-word combos */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500 w-6">2w:</span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${row.diversity.twoWordPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-400 w-8 text-right">
                          {row.diversity.twoWordPct}%
                        </span>
                      </div>
                      {/* 3-word combos */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500 w-6">3w:</span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${row.diversity.threeWordPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-400 w-8 text-right">
                          {row.diversity.threeWordPct}%
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Keyword Placement */}
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1.5">
                      {/* Title keywords */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500 w-6">T:</span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{ width: `${row.placement.titlePct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-400 w-8 text-right">
                          {row.placement.titlePct}%
                        </span>
                      </div>
                      {/* Subtitle keywords */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500 w-6">S:</span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-cyan-500"
                            style={{ width: `${row.placement.subtitlePct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-400 w-8 text-right">
                          {row.placement.subtitlePct}%
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Top Strategic Keyword */}
                  <TableCell className="text-center">
                    {row.keywordFrequency.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-zinc-200">
                          {row.keywordFrequency[0].keyword}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {row.keywordFrequency[0].totalCombos}× combos
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">-</span>
                    )}
                  </TableCell>

                  {/* Combo Casting Score */}
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-lg font-bold font-mono ${
                        row.castingScore >= 8 ? 'text-emerald-400' :
                        row.castingScore >= 6 ? 'text-blue-400' :
                        row.castingScore >= 4 ? 'text-zinc-300' :
                        'text-orange-400'
                      }`}>
                        {row.castingScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {row.castingScore >= 8 ? '⭐⭐⭐' :
                         row.castingScore >= 6 ? '⭐⭐' :
                         row.castingScore >= 4 ? '⭐' : ''}
                      </span>
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
                {/* Title Chars - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Subtitle Chars - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Duplicates - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Density - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Combo Diversity - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Keyword Placement - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Top Keyword - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Casting Score - Empty for averages */}
                <TableCell className="text-center">
                  <span className="text-xs text-zinc-600">-</span>
                </TableCell>
                {/* Keyword Count Average */}
                <TableCell className="text-center">
                  <span className="text-sm font-mono text-zinc-400">{competitorAvg.keywordCount}</span>
                </TableCell>
                {/* Combo Count Average */}
                <TableCell className="text-center">
                  <span className="text-sm font-mono text-zinc-400">{competitorAvg.comboCount}</span>
                </TableCell>
                {/* Overall Score Average */}
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono text-xs border-zinc-700 text-zinc-400">
                    {competitorAvg.overallScore}
                  </Badge>
                </TableCell>
                {/* Top Keywords - Context */}
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
