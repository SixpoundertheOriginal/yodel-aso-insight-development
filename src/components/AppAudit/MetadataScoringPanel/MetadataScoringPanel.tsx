/**
 * MetadataScoringPanel Component
 *
 * Main panel for displaying metadata scoring results (title + subtitle).
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Info } from 'lucide-react';
import { scoreMetadata, analyzeEnhancedCombinations } from '@/modules/metadata-scoring';
import { tokenize } from '@/modules/metadata-scoring/utils/tokenizer';
import { getStopwords } from '@/modules/metadata-scoring/services/configLoader';
import { analyzeCombinations } from '@/modules/metadata-scoring/utils/ngram';
import { TitleScoreCard } from './TitleScoreCard';
import { SubtitleScoreCard } from './SubtitleScoreCard';
import { CombinationAnalysisCard } from './CombinationAnalysisCard';
import { getScoreColor } from '@/lib/numberFormat';

interface MetadataScoringPanelProps {
  title: string;
  subtitle: string;
}

export const MetadataScoringPanel: React.FC<MetadataScoringPanelProps> = ({ title, subtitle }) => {
  // Calculate scores
  const result = scoreMetadata(title, subtitle);

  const scoreColor = getScoreColor(result.metadataScore);

  // Phase 2: Enhanced combination analysis
  const enhancedAnalysis = analyzeEnhancedCombinations(title, subtitle);

  // Legacy combination data (for backward compatibility, not used in enhanced mode)
  const stopwords = getStopwords();
  const titleTokens = tokenize(title);
  const subtitleTokens = tokenize(subtitle);
  const combinedTokens = [...titleTokens, ...subtitleTokens];

  const titleCombosAnalysis = analyzeCombinations(titleTokens, stopwords, 2, 4);
  const combinedCombosAnalysis = analyzeCombinations(combinedTokens, stopwords, 2, 4);

  const titleCombos = titleCombosAnalysis.meaningfulCombos;
  const allCombinedCombos = combinedCombosAnalysis.meaningfulCombos;
  const subtitleNewCombos = result.subtitle.breakdown.newCombos;

  return (
    <div className="space-y-6">
      {/* Header Card with Combined Score */}
      <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calculator className="h-6 w-6 text-emerald-400" />
              <CardTitle className="text-xl">Metadata Scoring Analysis</CardTitle>
            </div>
            <Badge className={`text-2xl px-6 py-2 ${scoreColor}`}>
              {result.metadataScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-2 bg-blue-900/20 border border-blue-400/30 rounded p-3">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Deterministic Scoring Engine</p>
              <p className="text-xs text-blue-400/80">
                This score is calculated using pure TypeScript algorithms analyzing character usage,
                keyword density, combinations, and semantic quality. Weighted: Title (70%) + Subtitle (30%).
              </p>
            </div>
          </div>

          {/* Weight Breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-zinc-800/50 rounded p-4">
              <p className="text-xs text-zinc-400 mb-1">Title Contribution (70%)</p>
              <p className={`text-2xl font-bold ${getScoreColor(result.title.score)}`}>
                {result.title.score}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                → {Math.round(result.title.score * 0.7)} weighted points
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded p-4">
              <p className="text-xs text-zinc-400 mb-1">Subtitle Contribution (30%)</p>
              <p className={`text-2xl font-bold ${getScoreColor(result.subtitle.score)}`}>
                {result.subtitle.score}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                → {Math.round(result.subtitle.score * 0.3)} weighted points
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Title and Subtitle Score Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TitleScoreCard title={title} result={result.title} />
        <SubtitleScoreCard subtitle={subtitle} result={result.subtitle} />
      </div>

      {/* Combination Analysis Card (Phase 2: Enhanced Mode) */}
      <CombinationAnalysisCard
        title={title}
        subtitle={subtitle}
        enhancedAnalysis={enhancedAnalysis}
      />

      {/* Insights and Recommendations */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Character Usage Insight */}
          {(result.title.breakdown.characterCount < 25 || result.subtitle.breakdown.characterCount < 25) && (
            <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3">
              <p className="text-sm text-yellow-300">
                <strong>Character Usage:</strong> You're underutilizing available space.
                {result.title.breakdown.characterCount < 25 && ` Title: ${result.title.breakdown.characterCount}/30 chars.`}
                {result.subtitle.breakdown.characterCount < 25 && ` Subtitle: ${result.subtitle.breakdown.characterCount}/30 chars.`}
              </p>
            </div>
          )}

          {/* Incremental Value Insight */}
          {result.subtitle.breakdown.newTokens.length === 0 && (
            <div className="bg-red-900/20 border border-red-400/30 rounded p-3">
              <p className="text-sm text-red-300">
                <strong>Incremental Value:</strong> Your subtitle doesn't add any new keywords beyond the title.
                Consider adding unique, descriptive keywords to maximize search visibility.
              </p>
            </div>
          )}

          {result.subtitle.breakdown.newTokens.length > 0 && result.subtitle.incrementalValueScore < 70 && (
            <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3">
              <p className="text-sm text-yellow-300">
                <strong>Incremental Value:</strong> Your subtitle adds {result.subtitle.breakdown.newTokens.length} new keywords,
                but could be more impactful. Consider adding more unique, specific terms.
              </p>
            </div>
          )}

          {result.subtitle.incrementalValueScore >= 70 && (
            <div className="bg-emerald-900/20 border border-emerald-400/30 rounded p-3">
              <p className="text-sm text-emerald-300">
                <strong>Incremental Value:</strong> Excellent! Your subtitle adds {result.subtitle.breakdown.newTokens.length} new keywords
                and {result.subtitle.breakdown.newCombos.length} new combinations, maximizing search coverage.
              </p>
            </div>
          )}

          {/* Filler/Duplicate Insight */}
          {(result.title.breakdown.fillerTokens.length > 2 || result.subtitle.breakdown.fillerTokens.length > 2) && (
            <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3">
              <p className="text-sm text-yellow-300">
                <strong>Filler Tokens:</strong> Consider replacing generic stopwords with more specific, keyword-rich terms.
              </p>
            </div>
          )}

          {(result.title.breakdown.duplicates.length > 0 || result.subtitle.breakdown.duplicates.length > 0) && (
            <div className="bg-red-900/20 border border-red-400/30 rounded p-3">
              <p className="text-sm text-red-300">
                <strong>Duplicate Tokens:</strong> Avoid repeating keywords within the same field.
                Use that space for additional unique keywords instead.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
