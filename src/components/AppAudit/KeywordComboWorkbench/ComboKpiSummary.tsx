/**
 * Combo KPI Summary - Header + 12 Stat Cards + Banners + Distribution
 *
 * Displays:
 * - ENHANCED KEYWORD COMBO WORKBENCH header
 * - High-level KPI overview with 3 rows of 4 cards
 * - Success/Warning banners based on ranking quality
 * - Title + Subtitle Distribution (collapsible)
 */

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { CardTitle } from '@/components/ui/card';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import {
  extractRankingTokens,
  calculateRankingSlotEfficiency,
  analyzeDuplicates,
  createRankingDistributionMap,
} from '@/engine/metadata/utils/rankingTokenExtractor';
import { HighlightedText } from './DuplicateHighlighter';
import { KpiCard, KpiCardSkeleton } from './KpiCard';
import { getCardConfig } from './kpiCardUtils';

interface ComboKpiSummaryProps {
  comboCoverage: UnifiedMetadataAuditResult['comboCoverage'];
  title: string;
  subtitle: string;
  keywords?: string; // Keywords field for unique keyword count
  filteredComboCount: number; // For "Filtered View" card
  isLoading?: boolean; // Loading state when refetching with new keywords
}

export const ComboKpiSummary: React.FC<ComboKpiSummaryProps> = ({
  comboCoverage,
  title,
  subtitle,
  keywords = '',
  filteredComboCount,
  isLoading = false,
}) => {
  // State for expandable duplicate breakdown
  const [showDuplicateBreakdown, setShowDuplicateBreakdown] = useState(false);

  // Get generic-only stats from backend by default (most relevant for ASO)
  const stats = useMemo(() => {
    if (comboCoverage.statsByBrandType) {
      return comboCoverage.statsByBrandType.generic;  // DEFAULT TO GENERIC
    }
    // Fallback to all stats (backwards compatibility)
    return comboCoverage.stats || {
      totalPossible: 0,
      existing: 0,
      missing: 0,
      coveragePct: 0,
      titleConsecutive: 0,
      titleNonConsecutive: 0,
      titleKeywordsCross: 0,
      crossElement: 0,
      keywordsConsecutive: 0,
      subtitleConsecutive: 0,
      keywordsSubtitleCross: 0,
      keywordsNonConsecutive: 0,
      subtitleNonConsecutive: 0,
      threeWayCross: 0,
    };
  }, [comboCoverage]);

  // Ranking analysis (Title + Subtitle + Keywords Field)
  const rankingAnalysis = useMemo(() => {
    // Extract tokens from Title + Subtitle (for ranking metrics)
    const titleSubtitleTokens = extractRankingTokens(title, subtitle);
    const efficiency = calculateRankingSlotEfficiency(title, subtitle);
    const duplicates = analyzeDuplicates(title, subtitle, keywords); // Include keywords field
    const distribution = createRankingDistributionMap(title, subtitle);

    // Extract tokens from Keywords Field
    const keywordsTokens = keywords
      .split(',')
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw.length > 0);

    // Combine all unique tokens (Title + Subtitle + Keywords)
    const allUniqueTokens = new Set([
      ...titleSubtitleTokens.uniqueTokens,
      ...keywordsTokens
    ]);

    return {
      tokenSet: {
        ...titleSubtitleTokens,
        uniqueTokens: Array.from(allUniqueTokens)
      },
      efficiency,
      duplicates,
      distribution
    };
  }, [title, subtitle, keywords]);

  // Loading skeleton component
  const LoadingCard = () => (
    <div className="space-y-1 bg-zinc-900/50 p-3 rounded-lg border border-zinc-700/50 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-24" />
      <div className="h-8 bg-zinc-800 rounded w-16" />
      <div className="h-3 bg-zinc-800 rounded w-32" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ENHANCED KEYWORD COMBO WORKBENCH Header */}
      <div>
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium tracking-wide uppercase text-zinc-300">
            <Link2 className="h-4 w-4 text-violet-400" />
            ENHANCED KEYWORD COMBO WORKBENCH
          </CardTitle>
          {isLoading && (
            <Badge variant="outline" className="text-xs border-violet-400/40 text-violet-400 animate-pulse">
              Recomputing...
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5">
          Powered by ASO Bible • All Possible Combinations • Strategic Recommendations
        </p>
      </div>

      {/* Row 1: Ranking Power Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <KpiCardSkeleton size="md" />
            <KpiCardSkeleton size="md" />
            <KpiCardSkeleton size="md" />
            <KpiCardSkeleton size="md" />
          </>
        ) : (
          <>
            <KpiCard
              value={stats.titleConsecutive}
              label="Excellent Combos"
              subtitle="Title Consecutive • 100 pts"
              icon="🔥🔥🔥"
              variant="strength-1"
              {...getCardConfig('strongest', stats.titleConsecutive, { type: 'count', isKeyMetric: true })}
            />

            <KpiCard
              value={stats.titleNonConsecutive + (stats.titleKeywordsCross || 0)}
              label="Good Combos"
              subtitle="Title-based • 70-85 pts"
              icon="🔥🔥"
              variant="strength-2"
              {...getCardConfig('strong', stats.titleNonConsecutive + (stats.titleKeywordsCross || 0), { type: 'count', isKeyMetric: true })}
            />

            <KpiCard
              value={stats.missing +
                (stats.keywordsConsecutive || 0) +
                stats.subtitleConsecutive +
                (stats.keywordsSubtitleCross || 0) +
                (stats.keywordsNonConsecutive || 0) +
                stats.subtitleNonConsecutive +
                (stats.threeWayCross || 0)}
              label="Growth Opportunities"
              subtitle="Missing + Low-tier combos"
              icon="🎯"
              variant="warning"
              {...getCardConfig('high-priority', stats.missing, { type: 'count' })}
            />

            <KpiCard
              value={`${stats.coveragePct}%`}
              label="Coverage Quality"
              subtitle={`${stats.existing}/${stats.totalPossible} combos`}
              icon="📊"
              variant="coverage-high"
              performance={getCardConfig('coverage', stats.coveragePct, { type: 'percentage' }).performance}
              size="md"
              animateNumber={true}
            />
          </>
        )}
      </div>

      {/* Row 2: Actionable Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <KpiCardSkeleton size="sm" />
            <KpiCardSkeleton size="sm" />
            <KpiCardSkeleton size="sm" />
            <KpiCardSkeleton size="sm" />
          </>
        ) : (
          <>
            <KpiCard
              value={stats.titleConsecutive + stats.titleNonConsecutive + (stats.titleKeywordsCross || 0)}
              label="Title Performance"
              subtitle="All Title-based combos"
              icon="💪"
              variant="neutral"
              size="sm"
              animateNumber={true}
            />

            <KpiCard
              value={stats.crossElement}
              label="Multi-Element Combos"
              subtitle="Title + Subtitle • 70 pts"
              icon="⚡"
              variant="efficiency"
              size="sm"
              animateNumber={true}
            />

            <KpiCard
              value={(stats.keywordsConsecutive || 0) +
                stats.subtitleConsecutive +
                (stats.keywordsSubtitleCross || 0) +
                (stats.keywordsNonConsecutive || 0) +
                stats.subtitleNonConsecutive +
                (stats.threeWayCross || 0)}
              label="Needs Improvement"
              subtitle="Lower-tier combos"
              icon="💤"
              variant="coverage-low"
              size="sm"
              animateNumber={true}
            />

            <KpiCard
              value={filteredComboCount}
              label="Active Filter"
              subtitle="Current results"
              icon="🔍"
              variant="neutral"
              size="sm"
              animateNumber={true}
            />
          </>
        )}
      </div>

      {/* Row 3: Ranking Quality Metrics (Title + Subtitle Analysis) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <KpiCardSkeleton size="md" />
            <KpiCardSkeleton size="md" />
            <KpiCardSkeleton size="md" />
            <KpiCardSkeleton size="md" />
          </>
        ) : (
          <>
            {/* Ranking Efficiency */}
            <KpiCard
              value={`${rankingAnalysis.efficiency.efficiency}%`}
              label="Efficiency Score"
              subtitle="Title + Subtitle quality"
              icon="⚡"
              variant="efficiency"
              performance={getCardConfig('efficiency', rankingAnalysis.efficiency.efficiency, { type: 'percentage' }).performance}
              size="md"
              animateNumber={true}
            />

            {/* Unique Keywords */}
            <KpiCard
              value={rankingAnalysis.tokenSet.uniqueTokens.length}
              label="Unique Keywords"
              subtitle="Non-duplicate tokens"
              icon="🔑"
              variant="coverage-high"
              size="md"
              animateNumber={true}
            />

            {/* Duplicates - Custom card with expandable breakdown */}
            <div
              className="group relative overflow-hidden backdrop-blur-xl border transition-all duration-300"
              style={{
                borderRadius: 'var(--card-radius-lg)',
                padding: 'var(--card-padding-md)',
                background: rankingAnalysis.duplicates.duplicateCount === 0
                  ? 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%), var(--card-gradient-efficiency)'
                  : 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%), var(--card-gradient-warning)',
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: 'var(--card-elevation-2)',
              }}
            >
              {/* Glass overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                  opacity: 0.5,
                }}
              />

              {/* Content */}
              <div className="relative z-10 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">
                      {rankingAnalysis.duplicates.duplicateCount === 0 ? '✅' : '⚠️'}
                    </span>
                    <p
                      className="text-zinc-400 font-medium uppercase tracking-wide leading-tight"
                      style={{ fontSize: 'var(--card-label-sm)' }}
                    >
                      Duplicate Words
                    </p>
                  </div>
                  {rankingAnalysis.duplicates.duplicateCount > 0 && rankingAnalysis.duplicates.breakdown && (
                    <button
                      onClick={() => setShowDuplicateBreakdown(!showDuplicateBreakdown)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                    >
                      {showDuplicateBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {showDuplicateBreakdown ? 'Hide' : 'Details'}
                    </button>
                  )}
                </div>
                <p
                  className="font-bold leading-none tracking-tight"
                  style={{
                    fontSize: 'var(--card-number-md)',
                    color: rankingAnalysis.duplicates.duplicateCount === 0 ? 'var(--card-excellent)' : 'var(--card-warning)',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  }}
                >
                  {rankingAnalysis.duplicates.duplicateCount}
                </p>
                <p
                  className="text-zinc-500 leading-tight"
                  style={{ fontSize: 'var(--card-subtitle-xs)' }}
                >
                  {rankingAnalysis.duplicates.duplicateCount === 0 ? 'No waste!' : 'Wasted slots'}
                </p>
              </div>

              {/* Expandable duplicate breakdown */}
              {showDuplicateBreakdown && rankingAnalysis.duplicates.duplicateCount > 0 && rankingAnalysis.duplicates.breakdown && (
                <div className="relative z-10 mt-3 pt-3 border-t border-red-500/20 bg-red-500/5 rounded p-3 space-y-3">
                  <p className="text-xs text-red-400 font-medium">
                    🔍 Duplicate Words Found:
                  </p>

                  {/* Highlighted text for each field */}
                  {rankingAnalysis.duplicates.breakdown?.inTitle && rankingAnalysis.duplicates.breakdown.inTitle.length > 0 && (
                    <HighlightedText
                      text={title}
                      duplicates={rankingAnalysis.duplicates.breakdown.inTitle}
                      label="Title"
                    />
                  )}

                  {rankingAnalysis.duplicates.breakdown?.inSubtitle && rankingAnalysis.duplicates.breakdown.inSubtitle.length > 0 && (
                    <HighlightedText
                      text={subtitle}
                      duplicates={rankingAnalysis.duplicates.breakdown.inSubtitle}
                      label="Subtitle"
                    />
                  )}

                  {keywords && rankingAnalysis.duplicates.breakdown?.inKeywords && rankingAnalysis.duplicates.breakdown.inKeywords.length > 0 && (
                    <HighlightedText
                      text={keywords}
                      duplicates={rankingAnalysis.duplicates.breakdown.inKeywords}
                      label="Keywords"
                    />
                  )}

                  {/* List of duplicate words */}
                  <div className="pt-3 border-t border-red-500/20">
                    <p className="text-[10px] text-zinc-500 mb-2">Duplicated words:</p>
                    <div className="flex flex-wrap gap-1">
                      {rankingAnalysis.duplicates.duplicateKeywords.map((word, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs border-red-400/40 text-red-400 bg-red-500/10"
                        >
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  {rankingAnalysis.duplicates.recommendation && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-300">
                      💡 {rankingAnalysis.duplicates.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Brand-Free Combos */}
            <KpiCard
              value={comboCoverage.totalCombos || 0}
              label="Brand-Free Combos"
              subtitle={`${comboCoverage.totalCombos}/${stats.totalPossible} (filtered)`}
              icon="💎"
              variant="coverage-high"
              size="md"
              animateNumber={true}
            />
          </>
        )}
      </div>

      {/* Duplicate Warning Banner */}
      {rankingAnalysis.duplicates.duplicateCount > 0 && (
        <div className="p-4 bg-orange-500/10 border border-orange-400/30 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="space-y-2 flex-1">
              <div className="font-medium text-orange-400">
                {rankingAnalysis.duplicates.duplicateCount} Duplicate Keyword{rankingAnalysis.duplicates.duplicateCount > 1 ? 's' : ''} Found
              </div>
              <div className="text-sm text-zinc-300">
                {rankingAnalysis.duplicates.recommendation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {rankingAnalysis.duplicates.duplicateCount === 0 && rankingAnalysis.efficiency.efficiency >= 80 && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="space-y-2 flex-1">
              <div className="font-medium text-emerald-400">
                Excellent Ranking Optimization!
              </div>
              <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
                <li>{rankingAnalysis.efficiency.efficiency}% efficiency (high-quality keyword usage)</li>
                <li>No duplicate keywords between title and subtitle</li>
                <li>Perfect complementarity: {rankingAnalysis.tokenSet.uniqueTokens.length} unique keywords</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Title + Subtitle Distribution (Collapsible) */}
      <details className="group">
        <summary className="cursor-pointer p-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-900/70 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-300">📍 Title + Subtitle Distribution</span>
              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                {rankingAnalysis.tokenSet.uniqueTokens.length} keywords
              </Badge>
            </div>
            <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
          </div>
        </summary>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Title Only */}
          <div className="p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
            <div className="text-xs text-blue-400 font-medium mb-2">
              Title Only ({rankingAnalysis.distribution.titleOnly.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {rankingAnalysis.distribution.titleOnly.length > 0 ? (
                rankingAnalysis.distribution.titleOnly.map((keyword, idx) => (
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
              Subtitle Only ({rankingAnalysis.distribution.subtitleOnly.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {rankingAnalysis.distribution.subtitleOnly.length > 0 ? (
                rankingAnalysis.distribution.subtitleOnly.map((keyword, idx) => (
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
              Both (Duplicates) ({rankingAnalysis.distribution.both.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {rankingAnalysis.distribution.both.length > 0 ? (
                rankingAnalysis.distribution.both.map((keyword, idx) => (
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
      </details>
    </div>
  );
};
