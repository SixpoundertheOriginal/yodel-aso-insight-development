/**
 * Ranking Overview Card (V2.1 Consolidation)
 *
 * Combined card showing overall ranking metadata health.
 * Placed ABOVE Title and Subtitle element cards.
 *
 * Replaces standalone RankingElementsPanel with integrated view.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  extractRankingTokens,
  calculateRankingSlotEfficiency,
  analyzeDuplicates,
  createRankingDistributionMap,
} from '@/engine/metadata/utils/rankingTokenExtractor';
import type { UnifiedMetadataAuditResult } from './types';

interface RankingOverviewCardProps {
  title: string;
  subtitle: string;
  auditResult?: UnifiedMetadataAuditResult;
}

// Helper function: Extract meaningful keywords (copied from subtitleValueAnalyzer)
function extractMeaningfulKeywords(text: string): Set<string> {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', '&',
  ]);

  const normalized = text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  return new Set(
    words.filter((word) => !stopwords.has(word) && word.length >= 2)
  );
}

// Helper function: Generate combos from keywords (copied from subtitleValueAnalyzer)
function generateSimpleCombos(keywords: string[]): Set<string> {
  const combos = new Set<string>();

  // 2-word combos
  for (let i = 0; i < keywords.length - 1; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      combos.add(`${keywords[i]} ${keywords[j]}`);
      combos.add(`${keywords[j]} ${keywords[i]}`); // Both orders
    }
  }

  // 3-word combos (limited to avoid explosion)
  for (let i = 0; i < keywords.length - 2; i++) {
    for (let j = i + 1; j < keywords.length - 1; j++) {
      for (let k = j + 1; k < keywords.length; k++) {
        combos.add(`${keywords[i]} ${keywords[j]} ${keywords[k]}`);
      }
    }
  }

  return combos;
}

export function RankingOverviewCard({ title, subtitle, auditResult }: RankingOverviewCardProps) {
  // Compute ranking analysis
  const rankingAnalysis = useMemo(() => {
    const tokenSet = extractRankingTokens(title, subtitle);
    const efficiency = calculateRankingSlotEfficiency(title, subtitle);
    const duplicates = analyzeDuplicates(title, subtitle);
    const distribution = createRankingDistributionMap(title, subtitle);

    return { tokenSet, efficiency, duplicates, distribution };
  }, [title, subtitle]);

  const { tokenSet, efficiency, duplicates, distribution } = rankingAnalysis;

  // Calculate total combinations using V2.1 approach (matches subtitle section logic)
  const totalCombinations = useMemo(() => {
    // Extract keywords from both title and subtitle
    const titleKeywords = Array.from(extractMeaningfulKeywords(title));
    const subtitleKeywords = Array.from(extractMeaningfulKeywords(subtitle));
    const allKeywords = [...titleKeywords, ...subtitleKeywords];

    // Generate all possible combos (title-only + cross-element + subtitle-only)
    const allCombos = generateSimpleCombos(allKeywords);

    return allCombos.size;
  }, [title, subtitle]);

  // Efficiency color coding
  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="group relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-200">
          <Target className="h-5 w-5 text-blue-400" />
          📊 Ranking Overview — Title + Subtitle Analysis
        </CardTitle>
        <p className="text-sm text-zinc-400">
          Only title + subtitle rank in App Store. Combined efficiency and keyword distribution.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Efficiency Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
          <div>
            <div className="text-sm text-zinc-400">Ranking Efficiency</div>
            <div className={`text-2xl font-bold ${getEfficiencyColor(efficiency.efficiency)}`}>
              {efficiency.efficiency}%
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Unique Keywords</div>
            <div className="text-2xl font-bold text-zinc-200">
              {tokenSet.uniqueTokens.length}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Total Combinations</div>
            <div className="text-2xl font-bold text-violet-400">
              {totalCombinations}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Duplicates</div>
            <div className="text-2xl font-bold text-orange-400">
              {efficiency.duplicateCount}
            </div>
          </div>
        </div>

        {/* Ranking Distribution Map */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">Ranking Distribution</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Title Only */}
            <div className="p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
              <div className="text-xs text-blue-400 font-medium mb-2">
                Title Only ({distribution.titleOnly.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {distribution.titleOnly.length > 0 ? (
                  distribution.titleOnly.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-blue-500/10 text-blue-400 border-blue-400/30 text-xs"
                    >
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">None</span>
                )}
              </div>
            </div>

            {/* Subtitle Only */}
            <div className="p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
              <div className="text-xs text-purple-400 font-medium mb-2">
                Subtitle Only ({distribution.subtitleOnly.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {distribution.subtitleOnly.length > 0 ? (
                  distribution.subtitleOnly.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-purple-500/10 text-purple-400 border-purple-400/30 text-xs"
                    >
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">None</span>
                )}
              </div>
            </div>

            {/* Both (Duplicates) */}
            <div className="p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg">
              <div className="text-xs text-orange-400 font-medium mb-2">
                Both (Duplicates) ({distribution.both.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {distribution.both.length > 0 ? (
                  distribution.both.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-orange-500/10 text-orange-400 border-orange-400/30 text-xs"
                    >
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Duplicate Warning (if any) */}
        {duplicates.duplicateCount > 0 && (
          <div className="p-4 bg-orange-500/10 border border-orange-400/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="font-medium text-orange-400">
                  {duplicates.duplicateCount} Duplicate Keyword{duplicates.duplicateCount > 1 ? 's' : ''} Found
                </div>
                <div className="text-sm text-zinc-300">
                  {duplicates.recommendation}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message (if no duplicates and high efficiency) */}
        {duplicates.duplicateCount === 0 && efficiency.efficiency >= 80 && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="font-medium text-emerald-400">
                  Excellent Ranking Optimization!
                </div>
                <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
                  <li>{efficiency.efficiency}% efficiency (high-quality keyword usage)</li>
                  <li>No duplicate keywords between title and subtitle</li>
                  <li>Perfect complementarity: {tokenSet.uniqueTokens.length} unique keywords</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
