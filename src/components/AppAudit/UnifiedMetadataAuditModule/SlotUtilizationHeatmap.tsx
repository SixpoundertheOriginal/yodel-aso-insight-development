/**
 * Slot Utilization Heatmap (V2.1 - Chapter 5 - Nice-to-Have)
 *
 * Visual heatmap showing character usage efficiency across metadata elements.
 *
 * **Metrics:**
 * - Utilization: % of available characters used
 * - Efficiency: % of useful characters (excludes stopwords/duplicates)
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3x3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateRankingSlotEfficiency } from '@/engine/metadata/utils/rankingTokenExtractor';

interface SlotUtilizationHeatmapProps {
  title: string;
  subtitle: string;
  description: string;
  platform?: 'ios' | 'android';
}

export function SlotUtilizationHeatmap({
  title,
  subtitle,
  description,
  platform = 'ios',
}: SlotUtilizationHeatmapProps) {
  // Calculate slot metrics
  const slotMetrics = useMemo(() => {
    const rankingEfficiency = calculateRankingSlotEfficiency(title, subtitle);

    const titleMax = 30;
    const subtitleMax = 30;
    const descriptionMax = 4000;

    const titleUtilization = (title.length / titleMax) * 100;
    const subtitleUtilization = (subtitle.length / subtitleMax) * 100;
    const descriptionUtilization = (description.length / descriptionMax) * 100;

    // Efficiency: useful characters / total characters
    // For title/subtitle, use ranking efficiency
    // For description, assume all characters are useful (conversion-focused)
    const titleEfficiency = rankingEfficiency.efficiency;
    const subtitleEfficiency = rankingEfficiency.efficiency; // Combined efficiency
    const descriptionEfficiency = descriptionUtilization > 50 ? 85 : 60; // Simple heuristic

    return {
      title: {
        used: title.length,
        max: titleMax,
        utilization: titleUtilization,
        efficiency: titleEfficiency,
      },
      subtitle: {
        used: subtitle.length,
        max: subtitleMax,
        utilization: subtitleUtilization,
        efficiency: subtitleEfficiency,
      },
      description: {
        used: description.length,
        max: descriptionMax,
        utilization: descriptionUtilization,
        efficiency: descriptionEfficiency,
      },
      overall: {
        totalUsed: title.length + subtitle.length + description.length,
        totalMax: titleMax + subtitleMax + descriptionMax,
        utilization: ((title.length + subtitle.length + description.length) / (titleMax + subtitleMax + descriptionMax)) * 100,
        efficiency: (titleEfficiency + subtitleEfficiency + descriptionEfficiency) / 3,
      },
    };
  }, [title, subtitle, description]);

  // Color coding helpers
  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'emerald';
    if (utilization >= 60) return 'yellow';
    if (utilization >= 40) return 'orange';
    return 'red';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'emerald';
    if (efficiency >= 60) return 'blue';
    return 'orange';
  };

  const getUtilizationBg = (utilization: number) => {
    if (utilization >= 80) return 'bg-emerald-500/20 border-emerald-400/40';
    if (utilization >= 60) return 'bg-yellow-500/20 border-yellow-400/40';
    if (utilization >= 40) return 'bg-orange-500/20 border-orange-400/40';
    return 'bg-red-500/20 border-red-400/40';
  };

  return (
    <Card className="group relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-200">
          <Grid3x3 className="h-5 w-5 text-cyan-400" />
          📊 Chapter 5: Slot Utilization Heatmap
        </CardTitle>
        <p className="text-sm text-zinc-400">
          Character usage efficiency across all metadata elements.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
          <div>
            <div className="text-sm text-zinc-400">Total Used</div>
            <div className="text-2xl font-bold text-zinc-200">
              {slotMetrics.overall.totalUsed}
            </div>
            <div className="text-xs text-zinc-500">of {slotMetrics.overall.totalMax} chars</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Overall Utilization</div>
            <div className={`text-2xl font-bold text-${getUtilizationColor(slotMetrics.overall.utilization)}-400`}>
              {slotMetrics.overall.utilization.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Overall Efficiency</div>
            <div className={`text-2xl font-bold text-${getEfficiencyColor(slotMetrics.overall.efficiency)}-400`}>
              {slotMetrics.overall.efficiency.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Status</div>
            {slotMetrics.overall.utilization >= 60 && slotMetrics.overall.efficiency >= 70 ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-400/30 mt-1">
                ✓ Optimized
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-400/30 mt-1">
                ⚠ Needs Work
              </Badge>
            )}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">Element Breakdown</h4>

          {/* Title Row */}
          <div className={`p-4 rounded-lg border-2 ${getUtilizationBg(slotMetrics.title.utilization)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-zinc-200">Title</div>
              <div className="text-sm text-zinc-400">
                {slotMetrics.title.used}/{slotMetrics.title.max} chars
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-400 mb-1">Utilization</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${getUtilizationColor(slotMetrics.title.utilization)}-500`}
                      style={{ width: `${Math.min(100, slotMetrics.title.utilization)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium text-${getUtilizationColor(slotMetrics.title.utilization)}-400`}>
                    {slotMetrics.title.utilization.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400 mb-1">Efficiency</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${getEfficiencyColor(slotMetrics.title.efficiency)}-500`}
                      style={{ width: `${Math.min(100, slotMetrics.title.efficiency)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium text-${getEfficiencyColor(slotMetrics.title.efficiency)}-400`}>
                    {slotMetrics.title.efficiency.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subtitle Row */}
          <div className={`p-4 rounded-lg border-2 ${getUtilizationBg(slotMetrics.subtitle.utilization)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-zinc-200">Subtitle</div>
              <div className="text-sm text-zinc-400">
                {slotMetrics.subtitle.used}/{slotMetrics.subtitle.max} chars
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-400 mb-1">Utilization</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${getUtilizationColor(slotMetrics.subtitle.utilization)}-500`}
                      style={{ width: `${Math.min(100, slotMetrics.subtitle.utilization)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium text-${getUtilizationColor(slotMetrics.subtitle.utilization)}-400`}>
                    {slotMetrics.subtitle.utilization.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400 mb-1">Efficiency</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${getEfficiencyColor(slotMetrics.subtitle.efficiency)}-500`}
                      style={{ width: `${Math.min(100, slotMetrics.subtitle.efficiency)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium text-${getEfficiencyColor(slotMetrics.subtitle.efficiency)}-400`}>
                    {slotMetrics.subtitle.efficiency.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description Row */}
          <div className={`p-4 rounded-lg border-2 ${getUtilizationBg(slotMetrics.description.utilization)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-zinc-200">Description</div>
              <div className="text-sm text-zinc-400">
                {slotMetrics.description.used}/{slotMetrics.description.max} chars
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-400 mb-1">Utilization</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${getUtilizationColor(slotMetrics.description.utilization)}-500`}
                      style={{ width: `${Math.min(100, slotMetrics.description.utilization)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium text-${getUtilizationColor(slotMetrics.description.utilization)}-400`}>
                    {slotMetrics.description.utilization.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400 mb-1">Quality (Est.)</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${getEfficiencyColor(slotMetrics.description.efficiency)}-500`}
                      style={{ width: `${Math.min(100, slotMetrics.description.efficiency)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium text-${getEfficiencyColor(slotMetrics.description.efficiency)}-400`}>
                    {slotMetrics.description.efficiency.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
          <div className="flex items-start gap-3">
            {slotMetrics.overall.utilization >= 60 ? (
              <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-2 flex-1">
              <div className="font-medium text-cyan-400 text-sm">Optimization Tips</div>
              <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
                {slotMetrics.title.utilization < 80 && (
                  <li>Title: Only {slotMetrics.title.utilization.toFixed(0)}% used. Add more keywords to reach 80-100%.</li>
                )}
                {slotMetrics.subtitle.utilization < 80 && (
                  <li>Subtitle: Only {slotMetrics.subtitle.utilization.toFixed(0)}% used. Use full 30 characters for maximum ranking power.</li>
                )}
                {slotMetrics.description.utilization < 30 && (
                  <li>Description: Only {slotMetrics.description.utilization.toFixed(0)}% used. Expand to include features, benefits, and CTAs.</li>
                )}
                {slotMetrics.overall.efficiency < 70 && (
                  <li>Low efficiency detected. Remove stopwords and duplicate keywords to improve ranking impact.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
