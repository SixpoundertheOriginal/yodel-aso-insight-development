/**
 * Strategic Keyword Frequency Panel
 *
 * Displays which keywords appear in the most combinations,
 * helping identify strategic keywords for search visibility.
 *
 * Shows breakdown by combo length (2-word, 3-word, 4+) and total count.
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Target, TrendingUp } from 'lucide-react';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { analyzeKeywordComboFrequency, type KeywordComboFrequency } from '@/utils/keywordComboFrequencyAnalyzer';

interface StrategicKeywordFrequencyPanelProps {
  /** All combos from title + subtitle */
  combos: ClassifiedCombo[];
  /** Optional: filter to show only top N keywords */
  topN?: number;
}

export const StrategicKeywordFrequencyPanel: React.FC<StrategicKeywordFrequencyPanelProps> = ({
  combos,
  topN,
}) => {
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);

  // Analyze keyword frequencies
  const keywordFrequencies = useMemo(() => {
    console.log('[StrategicKeywordFrequencyPanel] Input combos:', {
      combosLength: combos.length,
      firstCombo: combos[0],
      comboTypes: combos.map(c => c.type).slice(0, 5),
      allComboTexts: combos.map(c => c.text).slice(0, 10),
    });

    const allFrequencies = analyzeKeywordComboFrequency(combos);

    console.log('[StrategicKeywordFrequencyPanel] Analysis result:', {
      frequenciesCount: allFrequencies.length,
      topKeywords: allFrequencies.slice(0, 5).map(f => ({ keyword: f.keyword, total: f.totalCombos })),
    });

    return topN ? allFrequencies.slice(0, topN) : allFrequencies;
  }, [combos, topN]);

  // Find max count for progress bar scaling
  const maxCount = useMemo(() => {
    return Math.max(...keywordFrequencies.map(k => k.totalCombos), 1);
  }, [keywordFrequencies]);

  if (keywordFrequencies.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Strategic Keyword Frequency
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-zinc-500">No keyword combinations found</p>
          <p className="text-xs text-zinc-600 mt-2">
            Combos received: {combos.length} • Check browser console for debug info
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Strategic Keyword Frequency
          </CardTitle>
          <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400 bg-emerald-900/10">
            {keywordFrequencies.length} Keywords
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Keywords with the most combinations from current metadata • Ranked by total combo count
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-8 text-zinc-500">#</TableHead>
              <TableHead className="text-zinc-400">Keyword</TableHead>
              <TableHead className="text-center text-zinc-400">Total</TableHead>
              <TableHead className="text-center text-zinc-400">2-Word</TableHead>
              <TableHead className="text-center text-zinc-400">3-Word</TableHead>
              <TableHead className="text-center text-zinc-400">4+ Word</TableHead>
              <TableHead className="text-zinc-400">Frequency</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywordFrequencies.map((kf, index) => {
              const isExpanded = expandedKeyword === kf.keyword;
              const progressPercent = (kf.totalCombos / maxCount) * 100;

              return (
                <React.Fragment key={kf.keyword}>
                  <TableRow
                    className="border-zinc-800 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                    onClick={() => setExpandedKeyword(isExpanded ? null : kf.keyword)}
                  >
                    {/* Rank */}
                    <TableCell className="text-xs text-zinc-500 font-mono">
                      {index + 1}
                    </TableCell>

                    {/* Keyword */}
                    <TableCell className="font-medium text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{kf.keyword}</span>
                        {index < 3 && (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        )}
                      </div>
                    </TableCell>

                    {/* Total Count */}
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${
                          kf.totalCombos >= 10
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30'
                            : kf.totalCombos >= 5
                            ? 'bg-blue-500/10 text-blue-400 border-blue-400/30'
                            : 'bg-zinc-700/30 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {kf.totalCombos}
                      </Badge>
                    </TableCell>

                    {/* 2-Word */}
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm ${kf.twoWordCombos > 0 ? 'text-violet-400' : 'text-zinc-600'}`}>
                        {kf.twoWordCombos}
                      </span>
                    </TableCell>

                    {/* 3-Word */}
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm ${kf.threeWordCombos > 0 ? 'text-purple-400' : 'text-zinc-600'}`}>
                        {kf.threeWordCombos}
                      </span>
                    </TableCell>

                    {/* 4+ Word */}
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm ${kf.fourPlusCombos > 0 ? 'text-pink-400' : 'text-zinc-600'}`}>
                        {kf.fourPlusCombos}
                      </span>
                    </TableCell>

                    {/* Frequency Bar */}
                    <TableCell>
                      <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            kf.totalCombos >= 10
                              ? 'bg-emerald-500/60'
                              : kf.totalCombos >= 5
                              ? 'bg-blue-500/60'
                              : 'bg-zinc-600/60'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </TableCell>

                    {/* Expand Icon */}
                    <TableCell>
                      {kf.sampleCombos.length > 0 && (
                        isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row - Sample Combos */}
                  {isExpanded && kf.sampleCombos.length > 0 && (
                    <TableRow className="border-zinc-800 bg-zinc-800/20">
                      <TableCell colSpan={8} className="py-3">
                        <div className="pl-8">
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                            Sample Combinations ({kf.sampleCombos.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {kf.sampleCombos.map((combo, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs border-zinc-700 text-zinc-300 bg-zinc-800/50 font-mono"
                              >
                                {combo}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
