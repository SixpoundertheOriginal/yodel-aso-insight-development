/**
 * Keyword Ranking Analysis Tab
 *
 * Analyzes top-ranking apps for a specific keyword to understand
 * what helps them rank high in App Store search.
 *
 * Features:
 * - Keyword input with search
 * - Top 10 ranking apps analysis
 * - Placement patterns (in title/subtitle %)
 * - Co-occurring keywords
 * - Top combinations
 * - Strategy stats (avg keywords, combos, casting score)
 * - Actionable recommendations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2, TrendingUp, Award, Target, Lightbulb, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AnalyzeKeywordRankingResponse, AnalyzeKeywordRankingData } from '@/types/keywordRanking';

interface KeywordRankingTabProps {
  organizationId: string;
}

export const KeywordRankingTab: React.FC<KeywordRankingTabProps> = ({ organizationId }) => {
  const [keyword, setKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalyzeKeywordRankingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!keyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-keyword-ranking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            keyword: keyword.trim(),
            limit: 10,
            country: 'us',
            organizationId,
          }),
        }
      );

      const result: AnalyzeKeywordRankingResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Analysis failed');
      }

      setAnalysisData(result.data);
      toast.success(`Analyzed top ${result.data.topRankingApps.length} apps for "${keyword}"`);
    } catch (err: any) {
      console.error('[KeywordRankingTab] Analysis error:', err);
      setError(err.message || 'Failed to analyze keyword rankings');
      toast.error(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnalyzing) {
      handleAnalyze();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" />
            Keyword Ranking Analysis
          </CardTitle>
          <CardDescription>
            Analyze top 10 apps ranking for a keyword to understand their metadata strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Enter keyword (e.g., "meditation", "fitness tracker")'
              className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              disabled={isAnalyzing}
            />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !keyword.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium min-w-[140px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze Top 10
                </>
              )}
            </Button>
          </div>
          {isAnalyzing && (
            <p className="text-xs text-zinc-500 mt-2">
              Fetching metadata and running audits on top 10 apps... (~10-15 seconds)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysisData && (
        <>
          {/* Summary Stats */}
          <Card className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-400" />
                Top 10 Apps Ranking for "{analysisData.keyword}"
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Analyzed {new Date(analysisData.analyzedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">In Title</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {Math.round((analysisData.patterns.placement.inTitleCount / 10) * 100)}%
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {analysisData.patterns.placement.inTitleCount}/10 apps
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">In Subtitle</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {Math.round((analysisData.patterns.placement.inSubtitleCount / 10) * 100)}%
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {analysisData.patterns.placement.inSubtitleCount}/10 apps
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Keywords</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {analysisData.patterns.strategyStats.avgKeywordCount}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">per app</p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Combos</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {analysisData.patterns.strategyStats.avgComboCount}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">per app</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysisData.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-lg">{rec.startsWith('✅') ? '✅' : '⚠️'}</span>
                    <span className="text-zinc-300 flex-1">{rec.replace(/^[✅⚠️]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Top 10 Ranking Apps Table */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg font-mono tracking-wide uppercase text-zinc-300 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Top 10 Ranking Apps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase">#</TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase">App</TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase">Developer</TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase text-center">
                        In Title
                      </TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase text-center">
                        In Subtitle
                      </TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase text-center">
                        Combos
                      </TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase text-center">
                        Keywords
                      </TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase text-center">
                        Casting
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisData.topRankingApps.map((app) => {
                      const casting =
                        Math.sqrt(app.audit.keywordCoverage?.totalUniqueKeywords || 0) *
                        Math.log10(app.audit.comboCoverage?.totalCombos || 1);

                      return (
                        <TableRow key={app.appStoreId} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`
                                ${app.rank === 1 ? 'border-yellow-500/50 text-yellow-400' : ''}
                                ${app.rank === 2 ? 'border-zinc-400/50 text-zinc-400' : ''}
                                ${app.rank === 3 ? 'border-orange-500/50 text-orange-400' : ''}
                                ${app.rank > 3 ? 'border-zinc-600/50 text-zinc-500' : ''}
                              `}
                            >
                              #{app.rank}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img
                                src={app.iconUrl}
                                alt={app.name}
                                className="w-10 h-10 rounded-lg"
                              />
                              <div>
                                <p className="text-sm font-medium text-zinc-200">{app.name}</p>
                                <p className="text-xs text-zinc-500 line-clamp-1">
                                  {app.metadata.subtitle || 'No subtitle'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-zinc-400">
                            {app.developer}
                          </TableCell>
                          <TableCell className="text-center">
                            {app.keywordPresence.inTitle ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                ✓ Pos {app.keywordPresence.titlePosition}
                              </Badge>
                            ) : (
                              <span className="text-zinc-600 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {app.keywordPresence.inSubtitle ? (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                ✓ Pos {app.keywordPresence.subtitlePosition}
                              </Badge>
                            ) : (
                              <span className="text-zinc-600 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono text-zinc-300">
                            {app.keywordPresence.comboCount}
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono text-zinc-300">
                            {app.audit.keywordCoverage?.totalUniqueKeywords || 0}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`text-sm font-bold font-mono ${
                                casting >= 8 ? 'text-emerald-400' :
                                casting >= 6 ? 'text-blue-400' :
                                casting >= 4 ? 'text-zinc-300' : 'text-orange-400'
                              }`}
                            >
                              {casting.toFixed(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Co-occurring Keywords & Top Combos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Co-occurring Keywords */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base font-mono tracking-wide uppercase text-zinc-300">
                  Most Common Keywords
                </CardTitle>
                <CardDescription>
                  Keywords frequently used with "{analysisData.keyword}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisData.patterns.coOccurringKeywords.slice(0, 10).map((kw, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-zinc-800/40 rounded border border-zinc-700"
                    >
                      <span className="text-sm text-zinc-300 font-medium">{kw.keyword}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {kw.frequency}/10 apps
                        </span>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                          {kw.avgComboCount} combos
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Combos */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base font-mono tracking-wide uppercase text-zinc-300">
                  Most Common Combinations
                </CardTitle>
                <CardDescription>
                  Combinations frequently appearing across top apps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisData.patterns.topCombos.slice(0, 10).map((combo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-zinc-800/40 rounded border border-zinc-700"
                    >
                      <span className="text-sm text-zinc-300 font-medium">{combo.combo}</span>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                        {combo.frequency}/10 apps
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategy Stats */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base font-mono tracking-wide uppercase text-zinc-300">
                Strategy Benchmarks
              </CardTitle>
              <CardDescription>
                Average metadata strategy stats across top 10 apps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Title Chars</p>
                  <p className="text-xl font-bold text-zinc-300">
                    {analysisData.patterns.strategyStats.avgTitleChars}/30
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Subtitle Chars</p>
                  <p className="text-xl font-bold text-zinc-300">
                    {analysisData.patterns.strategyStats.avgSubtitleChars}/30
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Density</p>
                  <p className="text-xl font-bold text-zinc-300">
                    {analysisData.patterns.strategyStats.avgDensity}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">chars/keyword</p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Casting Score</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {analysisData.patterns.strategyStats.avgCastingScore}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Placement</p>
                  <p className="text-sm text-zinc-400">
                    {analysisData.patterns.placement.bothCount} both,{' '}
                    {analysisData.patterns.placement.titleOnlyCount} title,{' '}
                    {analysisData.patterns.placement.subtitleOnlyCount} subtitle
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Positions</p>
                  <p className="text-sm text-zinc-400">
                    Title: {analysisData.patterns.placement.avgTitlePosition || 'N/A'},
                    Subtitle: {analysisData.patterns.placement.avgSubtitlePosition || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
