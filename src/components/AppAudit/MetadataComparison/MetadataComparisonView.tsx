/**
 * MetadataComparisonView Component
 *
 * Split-view comparison of baseline vs draft metadata audits.
 * Shows side-by-side KPI cards with delta badges and text diffs.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitCompare, TrendingUp, TrendingDown } from 'lucide-react';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type { MetadataDeltas, TextDiff, BaselineMetadata, DraftMetadata } from '@/types/metadataOptimization';
import { DeltaBadge, CompactDeltaBadge } from './DeltaBadge';
import { TextDiffHighlighter, InlineDiff } from './TextDiffHighlighter';
import { getDeltaSummary, getSentimentColor } from '@/utils/metadataComparison';

interface MetadataComparisonViewProps {
  /** Baseline audit (production metadata) */
  baselineAudit: UnifiedMetadataAuditResult;
  /** Draft audit (proposed changes) */
  draftAudit: UnifiedMetadataAuditResult;
  /** Calculated deltas */
  deltas: MetadataDeltas;
  /** Text diffs */
  textDiff: TextDiff;
  /** Baseline metadata */
  baseline: BaselineMetadata;
  /** Draft metadata */
  draft: DraftMetadata;
}

export const MetadataComparisonView: React.FC<MetadataComparisonViewProps> = ({
  baselineAudit,
  draftAudit,
  deltas,
  textDiff,
  baseline,
  draft,
}) => {
  // Get stats from audits
  const baselineStats = baselineAudit.comboCoverage.statsByBrandType?.generic || baselineAudit.comboCoverage.stats;
  const draftStats = draftAudit.comboCoverage.statsByBrandType?.generic || draftAudit.comboCoverage.stats;

  // Calculate combo counts
  const baselineExcellent = baselineStats?.titleConsecutive || 0;
  const draftExcellent = draftStats?.titleConsecutive || 0;

  const baselineGood = (baselineStats?.titleNonConsecutive || 0) + (baselineStats?.titleKeywordsCross || 0);
  const draftGood = (draftStats?.titleNonConsecutive || 0) + (draftStats?.titleKeywordsCross || 0);

  const baselineNeedsImprovement = (baselineStats?.missing || 0) +
    (baselineStats?.keywordsConsecutive || 0) +
    (baselineStats?.subtitleConsecutive || 0);
  const draftNeedsImprovement = (draftStats?.missing || 0) +
    (draftStats?.keywordsConsecutive || 0) +
    (draftStats?.subtitleConsecutive || 0);

  const baselineCoverage = baselineStats?.coveragePct || 0;
  const draftCoverage = draftStats?.coveragePct || 0;

  const baselineTitlePerf = baselineExcellent + baselineGood;
  const draftTitlePerf = draftExcellent + draftGood;

  const baselineMultiElement = baselineStats?.crossElement || 0;
  const draftMultiElement = draftStats?.crossElement || 0;

  // Get overall sentiment
  const { message: summaryMessage, sentiment } = getDeltaSummary(deltas);

  return (
    <Card className="relative bg-black/40 backdrop-blur-lg border border-blue-500/30">
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-blue-400/40" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-blue-400/40" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-blue-400/40" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-blue-400/40" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-blue-400" />
            <CardTitle className="text-base font-medium text-zinc-300">
              Baseline vs. Draft Comparison
            </CardTitle>
          </div>

          {/* Overall sentiment badge */}
          <Badge
            variant="outline"
            className={`text-xs ${
              sentiment === 'positive'
                ? 'border-emerald-400/40 text-emerald-400 bg-emerald-500/10'
                : sentiment === 'negative'
                ? 'border-red-400/40 text-red-400 bg-red-500/10'
                : 'border-zinc-600 text-zinc-400'
            }`}
          >
            {sentiment === 'positive' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : sentiment === 'negative' ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : null}
            {sentiment === 'positive' ? 'Improved' : sentiment === 'negative' ? 'Declined' : 'Mixed'}
          </Badge>
        </div>

        {/* Summary message */}
        <p className={`text-xs mt-2 ${getSentimentColor(sentiment)}`}>
          {summaryMessage}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Text Diffs */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Metadata Changes</h3>

          {/* Title diff */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider min-w-[60px]">Title:</span>
              <div className="flex-1">
                <TextDiffHighlighter
                  segments={textDiff.title}
                  baselineText={baseline.title}
                  draftText={draft.title}
                />
              </div>
            </div>
          </div>

          {/* Subtitle diff */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider min-w-[60px]">Subtitle:</span>
              <div className="flex-1">
                <TextDiffHighlighter
                  segments={textDiff.subtitle}
                  baselineText={baseline.subtitle}
                  draftText={draft.subtitle}
                />
              </div>
            </div>
          </div>

          {/* Keywords diff */}
          {(baseline.keywords || draft.keywords) && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider min-w-[60px]">Keywords:</span>
                <div className="flex-1">
                  <TextDiffHighlighter
                    segments={textDiff.keywords}
                    baselineText={baseline.keywords}
                    draftText={draft.keywords}
                    showRemoved={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPI Comparison Grid */}
        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Performance Impact</h3>

          {/* Split view: Baseline | Draft */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* Column headers */}
            <div className="text-center">
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                Baseline
              </Badge>
            </div>
            <div className="text-center w-20">
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                Change
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-xs border-violet-400/40 text-violet-400">
                Draft
              </Badge>
            </div>

            {/* Excellent Combos */}
            <div className="text-right">
              <p className="text-sm text-zinc-400">Excellent Combos</p>
              <p className="text-2xl font-bold text-orange-400">{baselineExcellent}</p>
            </div>
            <div className="flex justify-center">
              <DeltaBadge value={deltas.excellentCombos} size="md" />
            </div>
            <div className="text-left">
              <p className="text-sm text-zinc-400">Excellent Combos</p>
              <p className="text-2xl font-bold text-orange-400">{draftExcellent}</p>
            </div>

            {/* Good Combos */}
            <div className="text-right">
              <p className="text-sm text-zinc-400">Good Combos</p>
              <p className="text-2xl font-bold text-amber-400">{baselineGood}</p>
            </div>
            <div className="flex justify-center">
              <DeltaBadge value={deltas.goodCombos} size="md" />
            </div>
            <div className="text-left">
              <p className="text-sm text-zinc-400">Good Combos</p>
              <p className="text-2xl font-bold text-amber-400">{draftGood}</p>
            </div>

            {/* Coverage Quality */}
            <div className="text-right">
              <p className="text-sm text-zinc-400">Coverage Quality</p>
              <p className="text-2xl font-bold text-blue-400">{baselineCoverage}%</p>
            </div>
            <div className="flex justify-center">
              <DeltaBadge value={deltas.coveragePct} decimals={1} suffix="%" size="md" />
            </div>
            <div className="text-left">
              <p className="text-sm text-zinc-400">Coverage Quality</p>
              <p className="text-2xl font-bold text-blue-400">{draftCoverage}%</p>
            </div>

            {/* Needs Improvement */}
            <div className="text-right">
              <p className="text-sm text-zinc-400">Needs Improvement</p>
              <p className="text-2xl font-bold text-zinc-400">{baselineNeedsImprovement}</p>
            </div>
            <div className="flex justify-center">
              <DeltaBadge value={deltas.needsImprovement} size="md" inverse />
            </div>
            <div className="text-left">
              <p className="text-sm text-zinc-400">Needs Improvement</p>
              <p className="text-2xl font-bold text-zinc-400">{draftNeedsImprovement}</p>
            </div>
          </div>

          {/* Secondary metrics (compact) */}
          <div className="pt-3 border-t border-zinc-800/50 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-2 bg-zinc-900/30 rounded">
              <span className="text-zinc-500">Title Performance</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-mono">{baselineTitlePerf}</span>
                <span className="text-zinc-600">→</span>
                <span className="text-zinc-300 font-mono">{draftTitlePerf}</span>
                <CompactDeltaBadge value={deltas.titlePerformance} />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-900/30 rounded">
              <span className="text-zinc-500">Multi-Element</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-mono">{baselineMultiElement}</span>
                <span className="text-zinc-600">→</span>
                <span className="text-zinc-300 font-mono">{draftMultiElement}</span>
                <CompactDeltaBadge value={deltas.multiElementCombos} />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-900/30 rounded">
              <span className="text-zinc-500">Unique Keywords</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-mono">
                  {baselineAudit.keywordCoverage.uniqueKeywordsCount || 0}
                </span>
                <span className="text-zinc-600">→</span>
                <span className="text-zinc-300 font-mono">
                  {draftAudit.keywordCoverage.uniqueKeywordsCount || 0}
                </span>
                <CompactDeltaBadge value={deltas.uniqueKeywords} />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-900/30 rounded">
              <span className="text-zinc-500">Efficiency Score</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-mono">
                  {(baselineAudit.keywordCoverage.efficiency || 0).toFixed(1)}%
                </span>
                <span className="text-zinc-600">→</span>
                <span className="text-zinc-300 font-mono">
                  {(draftAudit.keywordCoverage.efficiency || 0).toFixed(1)}%
                </span>
                <CompactDeltaBadge value={deltas.efficiencyScore} decimals={1} suffix="%" />
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className={`p-3 rounded border ${
          sentiment === 'positive'
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : sentiment === 'negative'
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-blue-500/10 border-blue-500/20'
        }`}>
          <p className="text-xs text-zinc-300">
            {sentiment === 'positive' ? (
              <>
                <span className="font-medium text-emerald-400">✓ Recommended:</span> This draft improves your metadata. Consider applying these changes.
              </>
            ) : sentiment === 'negative' ? (
              <>
                <span className="font-medium text-red-400">✗ Not Recommended:</span> This draft decreases performance. Consider revising.
              </>
            ) : (
              <>
                <span className="font-medium text-blue-400">• Mixed Results:</span> Review individual metrics to decide if changes are beneficial.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
