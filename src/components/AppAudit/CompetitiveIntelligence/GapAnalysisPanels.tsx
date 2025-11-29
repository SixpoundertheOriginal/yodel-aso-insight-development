/**
 * Gap Analysis Panels Component
 *
 * Displays all 4 gap metrics:
 * 1. Missing Keywords (keywords competitors use but you don't)
 * 2. Missing Combos (combos competitors have but you don't)
 * 3. Frequency Gaps (keywords you use less than competitors)
 * 4. Summary (quick wins and insights)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import type { GapAnalysisResult } from '@/types/competitiveIntelligence';

interface GapAnalysisPanelsProps {
  gapAnalysis: GapAnalysisResult;
}

export const GapAnalysisPanels: React.FC<GapAnalysisPanelsProps> = ({ gapAnalysis }) => {
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [showAllMissingKeywords, setShowAllMissingKeywords] = useState(false);
  const [showAllMissingCombos, setShowAllMissingCombos] = useState(false);
  const [showAllFrequencyGaps, setShowAllFrequencyGaps] = useState(false);

  // Helper function to get missing combos containing a specific keyword
  const getCombosForKeyword = (keyword: string): typeof gapAnalysis.missingCombos => {
    return gapAnalysis.missingCombos.filter((combo) =>
      combo.combo.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const toggleKeywordExpansion = (keyword: string) => {
    setExpandedKeyword(expandedKeyword === keyword ? null : keyword);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied "${text}" to clipboard`);
  };

  const getOpportunityColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30';
    if (score >= 60) return 'bg-blue-500/10 text-blue-400 border-blue-400/30';
    if (score >= 40) return 'bg-purple-500/10 text-purple-400 border-purple-400/30';
    return 'bg-zinc-700/30 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Quick Wins
          </CardTitle>
          <CardDescription>Top opportunities ranked by ROI potential</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Missing Keyword */}
            {gapAnalysis.missingKeywords.length > 0 && (
              <div className="p-4 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Top Missing Keyword</p>
                  <Badge variant="outline" className={getOpportunityColor(gapAnalysis.missingKeywords[0].opportunityScore)}>
                    {gapAnalysis.missingKeywords[0].opportunityScore}
                  </Badge>
                </div>
                <p className="text-lg font-semibold text-zinc-200 mb-1">
                  {gapAnalysis.missingKeywords[0].keyword}
                </p>
                <p className="text-xs text-zinc-500">
                  Used by {gapAnalysis.missingKeywords[0].usedByCompetitors} competitors
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(gapAnalysis.missingKeywords[0].keyword, 'keyword')}
                  className="mt-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            )}

            {/* Top Missing Combo */}
            {gapAnalysis.missingCombos.length > 0 && (
              <div className="p-4 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Top Missing Combo</p>
                  <Badge variant="outline" className={getOpportunityColor(gapAnalysis.missingCombos[0].opportunityScore)}>
                    {gapAnalysis.missingCombos[0].opportunityScore}
                  </Badge>
                </div>
                <p className="text-lg font-semibold text-zinc-200 mb-1">
                  "{gapAnalysis.missingCombos[0].combo}"
                </p>
                <p className="text-xs text-zinc-500">
                  Used by {gapAnalysis.missingCombos[0].usedByCompetitors} competitors
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(gapAnalysis.missingCombos[0].combo, 'combo')}
                  className="mt-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            )}

            {/* Top Frequency Gap */}
            {gapAnalysis.frequencyGaps.length > 0 && (
              <div className="p-4 bg-zinc-800/40 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Biggest Gap</p>
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-900/10">
                    +{gapAnalysis.frequencyGaps[0].gap.toFixed(1)} uses
                  </Badge>
                </div>
                <p className="text-lg font-semibold text-zinc-200 mb-1">
                  {gapAnalysis.frequencyGaps[0].keyword}
                </p>
                <p className="text-xs text-zinc-500">
                  You: {gapAnalysis.frequencyGaps[0].targetFrequency} • Avg: {gapAnalysis.frequencyGaps[0].competitorAvgFrequency}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Missing Keywords Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                Missing Keywords
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 mt-1">
                Keywords competitors use but you don't • Sorted by opportunity score
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400 bg-emerald-900/10">
              {gapAnalysis.missingKeywords.length} Opportunities
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {gapAnalysis.missingKeywords.length > 0 ? (
            <>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-center">Competitors</TableHead>
                      <TableHead className="text-center">Avg Frequency</TableHead>
                      <TableHead className="text-center">Missing Combos</TableHead>
                      <TableHead className="text-center">Opportunity</TableHead>
                      <TableHead className="text-left">Top Competitor</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllMissingKeywords ? gapAnalysis.missingKeywords : gapAnalysis.missingKeywords.slice(0, 15)).map((keyword, index) => {
                      const combosForKeyword = getCombosForKeyword(keyword.keyword);
                      const isExpanded = expandedKeyword === keyword.keyword;

                      return (
                        <React.Fragment key={index}>
                          {/* Main keyword row */}
                          <TableRow
                            className="border-zinc-800 hover:bg-zinc-800/30 cursor-pointer"
                            onClick={() => toggleKeywordExpansion(keyword.keyword)}
                          >
                            <TableCell className="text-xs text-zinc-500 font-mono">{index + 1}</TableCell>
                            <TableCell className="font-medium text-zinc-200">
                              <div className="flex items-center gap-2">
                                {combosForKeyword.length > 0 && (
                                  isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-zinc-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                                  )
                                )}
                                <span>{keyword.keyword}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-mono text-zinc-300">
                                {keyword.usedByCompetitors}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-mono text-zinc-300">
                                {keyword.avgFrequency.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {combosForKeyword.length > 0 ? (
                                <Badge variant="outline" className="border-blue-400/30 text-blue-400 bg-blue-900/10">
                                  {combosForKeyword.length}
                                </Badge>
                              ) : (
                                <span className="text-xs text-zinc-600">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={getOpportunityColor(keyword.opportunityScore)}>
                                {keyword.opportunityScore}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-zinc-400 truncate max-w-[150px]">
                              {keyword.topCompetitor}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(keyword.keyword, 'keyword');
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded combo rows */}
                          {isExpanded && combosForKeyword.length > 0 && (
                            <TableRow className="border-zinc-800 bg-zinc-900/50">
                              <TableCell colSpan={8} className="p-0">
                                <div className="px-4 py-3 bg-zinc-900/30 border-l-2 border-blue-500/30">
                                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                                    Missing Combos with "{keyword.keyword}"
                                  </p>
                                  <div className="space-y-1">
                                    {combosForKeyword.slice(0, 10).map((combo, comboIndex) => (
                                      <div
                                        key={comboIndex}
                                        className="flex items-center justify-between p-2 bg-zinc-800/30 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <span className="text-xs text-zinc-600 font-mono w-6">
                                            {comboIndex + 1}
                                          </span>
                                          <span className="text-sm text-zinc-300 font-medium">
                                            "{combo.combo}"
                                          </span>
                                          <span className="text-xs text-zinc-600">
                                            •
                                          </span>
                                          <span className="text-xs text-zinc-500">
                                            {combo.usedByCompetitors} competitor{combo.usedByCompetitors > 1 ? 's' : ''}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className={`${getOpportunityColor(combo.opportunityScore)} text-xs`}>
                                            {combo.opportunityScore}
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyToClipboard(combo.combo, 'combo');
                                            }}
                                            className="h-7 w-7 p-0 hover:bg-zinc-700"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    {combosForKeyword.length > 10 && (
                                      <p className="text-xs text-zinc-600 italic mt-2">
                                        + {combosForKeyword.length - 10} more combo{combosForKeyword.length - 10 > 1 ? 's' : ''}...
                                      </p>
                                    )}
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
              </div>
              {gapAnalysis.missingKeywords.length > 15 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllMissingKeywords(!showAllMissingKeywords)}
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
                  >
                    {showAllMissingKeywords ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {gapAnalysis.missingKeywords.length} Keywords
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-zinc-500">No missing keywords found - you're using all competitor keywords!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Combos Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                Missing Combos
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 mt-1">
                Keyword combinations competitors have but you don't
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400 bg-blue-900/10">
              {gapAnalysis.missingCombos.length} Opportunities
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {gapAnalysis.missingCombos.length > 0 ? (
            <>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Combo</TableHead>
                      <TableHead className="text-center">Competitors</TableHead>
                      <TableHead className="text-center">Opportunity</TableHead>
                      <TableHead className="text-left">Top Competitor</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllMissingCombos ? gapAnalysis.missingCombos : gapAnalysis.missingCombos.slice(0, 15)).map((combo, index) => (
                      <TableRow key={index} className="border-zinc-800 hover:bg-zinc-800/30">
                        <TableCell className="text-xs text-zinc-500 font-mono">{index + 1}</TableCell>
                        <TableCell className="font-medium text-zinc-200">"{combo.combo}"</TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono text-zinc-300">
                            {combo.usedByCompetitors}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getOpportunityColor(combo.opportunityScore)}>
                            {combo.opportunityScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-400 truncate max-w-[150px]">
                          {combo.topCompetitor}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(combo.combo, 'combo')}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {gapAnalysis.missingCombos.length > 15 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllMissingCombos(!showAllMissingCombos)}
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
                  >
                    {showAllMissingCombos ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {gapAnalysis.missingCombos.length} Combos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-zinc-500">No missing combos found - you're using all competitor combinations!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frequency Gaps Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                Frequency Gaps
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 mt-1">
                Keywords you use less frequently than competitors
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs border-orange-400/30 text-orange-400 bg-orange-900/10">
              {gapAnalysis.frequencyGaps.length} Gaps
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {gapAnalysis.frequencyGaps.length > 0 ? (
            <>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-center">Your Frequency</TableHead>
                      <TableHead className="text-center">Competitor Avg</TableHead>
                      <TableHead className="text-center">Gap</TableHead>
                      <TableHead className="text-left">Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllFrequencyGaps ? gapAnalysis.frequencyGaps : gapAnalysis.frequencyGaps.slice(0, 15)).map((gap, index) => (
                      <TableRow key={index} className="border-zinc-800 hover:bg-zinc-800/30">
                        <TableCell className="text-xs text-zinc-500 font-mono">{index + 1}</TableCell>
                        <TableCell className="font-medium text-zinc-200">{gap.keyword}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono text-zinc-300">
                            {gap.targetFrequency}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono text-zinc-300">
                            {gap.competitorAvgFrequency.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-900/10">
                            +{gap.gap.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-400">
                          {gap.recommendation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {gapAnalysis.frequencyGaps.length > 15 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllFrequencyGaps(!showAllFrequencyGaps)}
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
                  >
                    {showAllFrequencyGaps ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {gapAnalysis.frequencyGaps.length} Gaps
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-zinc-500">No frequency gaps found - your usage is competitive!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
