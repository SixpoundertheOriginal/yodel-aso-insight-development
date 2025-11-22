/**
 * SubtitleScoreCard Component
 *
 * Displays subtitle scoring results with incremental value analysis.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import type { SubtitleScoreResult } from '@/modules/metadata-scoring';
import { getScoreColor } from '@/lib/numberFormat';

interface SubtitleScoreCardProps {
  subtitle: string;
  result: SubtitleScoreResult;
}

export const SubtitleScoreCard: React.FC<SubtitleScoreCardProps> = ({ subtitle, result }) => {
  const scoreColor = getScoreColor(result.score);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-lg">Subtitle Score</CardTitle>
          </div>
          <Badge className={`text-xl px-4 py-1 ${scoreColor}`}>
            {result.score}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtitle Text */}
        <div>
          <p className="text-sm text-zinc-400 mb-1">Current Subtitle</p>
          <p className="text-base font-medium text-foreground">{subtitle}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {result.breakdown.characterCount}/{result.breakdown.maxCharacters} characters
          </p>
        </div>

        {/* Component Scores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/50 rounded p-3">
            <p className="text-xs text-zinc-400 mb-1">Character Usage</p>
            <p className={`text-lg font-bold ${getScoreColor(result.characterUsageScore)}`}>
              {result.characterUsageScore}
            </p>
          </div>
          <div className="bg-purple-900/20 border border-purple-400/30 rounded p-3">
            <p className="text-xs text-purple-400 mb-1 font-medium">Incremental Value ⭐</p>
            <p className={`text-lg font-bold ${getScoreColor(result.incrementalValueScore)}`}>
              {result.incrementalValueScore}
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded p-3">
            <p className="text-xs text-zinc-400 mb-1">Combo Coverage</p>
            <p className={`text-lg font-bold ${getScoreColor(result.comboCoverageScore)}`}>
              {result.comboCoverageScore}
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded p-3">
            <p className="text-xs text-zinc-400 mb-1">Semantic Quality</p>
            <p className={`text-lg font-bold ${result.semanticScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.semanticScore > 0 ? '+' : ''}{result.semanticScore}
            </p>
          </div>
        </div>

        {/* Incremental Value Breakdown */}
        <div className="bg-purple-900/10 border border-purple-400/20 rounded p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <p className="text-sm font-medium text-purple-300">Incremental Value Analysis</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-zinc-400">New Tokens:</p>
              <p className="text-purple-300 font-medium">{result.breakdown.newTokens.length} tokens</p>
            </div>
            <div>
              <p className="text-zinc-400">New Combos:</p>
              <p className="text-purple-300 font-medium">{result.breakdown.newCombos.length} combos</p>
            </div>
          </div>
        </div>

        {/* New Tokens (Unique to Subtitle) */}
        {result.breakdown.newTokens.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-medium text-zinc-300">New Keywords ({result.breakdown.newTokens.length})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.breakdown.newTokens.map((token, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
                  {token}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* New Combinations (Unique to Subtitle) */}
        {result.breakdown.newCombos.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-400" />
              <p className="text-sm font-medium text-zinc-300">New Combinations ({result.breakdown.newCombos.length})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.breakdown.newCombos.map((combo, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-blue-400/30 text-blue-400">
                  {combo}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Filler Tokens */}
        {result.breakdown.fillerTokens.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <p className="text-sm font-medium text-zinc-300">Filler Tokens ({result.breakdown.fillerTokens.length})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.breakdown.fillerTokens.map((token, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-yellow-400/30 text-yellow-400">
                  {token}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Duplicates */}
        {result.breakdown.duplicates.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-sm font-medium text-zinc-300">Duplicate Tokens ({result.breakdown.duplicates.length})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.breakdown.duplicates.map((token, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-red-400/30 text-red-400">
                  {token}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Penalty Info */}
        {result.duplicationPenalty > 0 && (
          <div className="bg-red-900/20 border border-red-400/30 rounded p-3">
            <p className="text-xs text-red-400">
              Total Penalty: -{result.duplicationPenalty} points (fillers + duplicates)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
