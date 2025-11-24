/**
 * Keyword Frequency View
 *
 * Shows how many combos each keyword participates in.
 * Helps identify:
 * - Most versatile keywords (high combo count)
 * - Underutilized keywords (low combo count)
 * - Keywords to prioritize in optimization
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Search } from 'lucide-react';
import type { GeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { Input } from '@/components/ui/input';

interface KeywordStats {
  keyword: string;
  totalCombos: number;
  existingCombos: number;
  missingCombos: number;
  coverage: number; // % of combos that exist
  strategicValue: number; // Average strategic value
  source: 'title' | 'subtitle' | 'both';
}

interface KeywordFrequencyViewProps {
  titleKeywords: string[];
  subtitleKeywords: string[];
  combos: GeneratedCombo[];
}

export const KeywordFrequencyView: React.FC<KeywordFrequencyViewProps> = ({
  titleKeywords,
  subtitleKeywords,
  combos,
}) => {
  const [sortBy, setSortBy] = useState<'total' | 'existing' | 'missing' | 'coverage'>('total');

  // Calculate stats for each keyword
  const keywordStats: KeywordStats[] = [];

  [...titleKeywords, ...subtitleKeywords].forEach((keyword) => {
    const keywordCombos = combos.filter(c => c.keywords.includes(keyword));
    const existing = keywordCombos.filter(c => c.exists);
    const missing = keywordCombos.filter(c => !c.exists);
    const avgValue = keywordCombos.length > 0
      ? Math.round(keywordCombos.reduce((sum, c) => sum + (c.strategicValue || 0), 0) / keywordCombos.length)
      : 0;

    const source = titleKeywords.includes(keyword) && subtitleKeywords.includes(keyword)
      ? 'both'
      : titleKeywords.includes(keyword)
      ? 'title'
      : 'subtitle';

    keywordStats.push({
      keyword,
      totalCombos: keywordCombos.length,
      existingCombos: existing.length,
      missingCombos: missing.length,
      coverage: keywordCombos.length > 0 ? Math.round((existing.length / keywordCombos.length) * 100) : 0,
      strategicValue: avgValue,
      source,
    });
  });

  // Sort (combos prop is already filtered by parent filters)
  const sortedStats = [...keywordStats].sort((a, b) => {
    switch (sortBy) {
      case 'total':
        return b.totalCombos - a.totalCombos;
      case 'existing':
        return b.existingCombos - a.existingCombos;
      case 'missing':
        return b.missingCombos - a.missingCombos;
      case 'coverage':
        return b.coverage - a.coverage;
      default:
        return 0;
    }
  });

  // Top performers (use filtered and sorted stats)
  const topByTotal = [...sortedStats].sort((a, b) => b.totalCombos - a.totalCombos).slice(0, 3);
  const topByCoverage = [...sortedStats].filter(s => s.coverage >= 50).sort((a, b) => b.coverage - a.coverage).slice(0, 3);
  const needsWork = [...sortedStats].filter(s => s.coverage < 50).sort((a, b) => a.coverage - b.coverage).slice(0, 3);

  const maxCombos = Math.max(...keywordStats.map(s => s.totalCombos), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-900/20 to-green-900/10 border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-emerald-300">
              Most Versatile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByTotal.map((stat, idx) => (
              <div key={stat.keyword} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">
                  {idx + 1}. {stat.keyword}
                </span>
                <Badge variant="outline" className="border-emerald-400/30 text-emerald-400">
                  {stat.totalCombos}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/10 border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-blue-300">
              Best Utilized
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByCoverage.length > 0 ? topByCoverage.map((stat, idx) => (
              <div key={stat.keyword} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">
                  {idx + 1}. {stat.keyword}
                </span>
                <Badge variant="outline" className="border-blue-400/30 text-blue-400">
                  {stat.coverage}%
                </Badge>
              </div>
            )) : (
              <p className="text-xs text-zinc-500">No keywords with 50%+ coverage</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-amber-300">
              Underutilized
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsWork.length > 0 ? needsWork.map((stat, idx) => (
              <div key={stat.keyword} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">
                  {idx + 1}. {stat.keyword}
                </span>
                <Badge variant="outline" className="border-amber-400/30 text-amber-400">
                  {stat.coverage}%
                </Badge>
              </div>
            )) : (
              <p className="text-xs text-zinc-500">No keywords with &lt;50% coverage</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-400" />
            <CardTitle className="text-sm font-medium">Keyword Participation</CardTitle>
            <Badge variant="outline" className="text-xs border-violet-400/30 text-violet-400">
              {sortedStats.length} keywords
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Sort Buttons */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
            <span className="text-xs text-zinc-500">Sort by:</span>
            <button
              onClick={() => setSortBy('total')}
              className={`text-xs px-2 py-1 rounded ${
                sortBy === 'total'
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Total Combos
            </button>
            <button
              onClick={() => setSortBy('existing')}
              className={`text-xs px-2 py-1 rounded ${
                sortBy === 'existing'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Existing
            </button>
            <button
              onClick={() => setSortBy('missing')}
              className={`text-xs px-2 py-1 rounded ${
                sortBy === 'missing'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Missing
            </button>
            <button
              onClick={() => setSortBy('coverage')}
              className={`text-xs px-2 py-1 rounded ${
                sortBy === 'coverage'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Coverage %
            </button>
          </div>

          {/* Table */}
          <div className="space-y-2">
            {sortedStats.map((stat) => {
              const barWidth = (stat.totalCombos / maxCombos) * 100;
              const existingWidth = stat.totalCombos > 0 ? (stat.existingCombos / stat.totalCombos) * 100 : 0;

              return (
                <div
                  key={stat.keyword}
                  className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-violet-500/30 transition-all space-y-2"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">{stat.keyword}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          stat.source === 'title'
                            ? 'border-blue-400/30 text-blue-400'
                            : stat.source === 'subtitle'
                            ? 'border-emerald-400/30 text-emerald-400'
                            : 'border-violet-400/30 text-violet-400'
                        }`}
                      >
                        {stat.source}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="text-zinc-400">Total: </span>
                        <span className="text-zinc-300 font-medium">{stat.totalCombos}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-400">Coverage: </span>
                        <span
                          className={`font-medium ${
                            stat.coverage >= 70
                              ? 'text-emerald-400'
                              : stat.coverage >= 40
                              ? 'text-blue-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {stat.coverage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-6 bg-zinc-800/30 rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-emerald-500/20 border-r-2 border-emerald-500/40"
                      style={{ width: `${existingWidth}%` }}
                    />
                    <div
                      className="absolute h-full bg-amber-500/20"
                      style={{
                        left: `${existingWidth}%`,
                        width: `${100 - existingWidth}%`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                      <span className="text-emerald-400 font-medium">
                        {stat.existingCombos} existing
                      </span>
                      <span className="text-amber-400 font-medium">
                        {stat.missingCombos} missing
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sortedStats.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No keywords match your search
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
