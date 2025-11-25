/**
 * Vertical Benchmarks Panel
 *
 * Phase 21: Vertical Intelligence Layer
 *
 * Displays vertical-specific benchmark targets and compares them to current scores.
 * Shows:
 * - Generic combo count targets (excellent/good/moderate)
 * - Intent balance targets
 * - Custom benchmarks
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { VerticalContext } from './types';
import type { UnifiedMetadataAuditResult } from './types';

interface VerticalBenchmarksPanelProps {
  verticalContext: VerticalContext;
  auditResult: UnifiedMetadataAuditResult;
}

export const VerticalBenchmarksPanel: React.FC<VerticalBenchmarksPanelProps> = ({
  verticalContext,
  auditResult,
}) => {
  const { benchmarks } = verticalContext;

  if (!benchmarks) {
    return null;
  }

  // Get current generic combo count from audit result
  const currentGenericComboCount =
    auditResult.comboCoverage.titleCombosClassified?.filter((c) => c.type === 'generic').length || 0;

  // Determine tier based on thresholds
  const getComboTier = (count: number) => {
    if (!benchmarks.generic_combo_count) return 'none';
    const { excellent, good, moderate } = benchmarks.generic_combo_count;
    if (count >= excellent) return 'excellent';
    if (count >= good) return 'good';
    if (count >= moderate) return 'moderate';
    return 'poor';
  };

  const tier = getComboTier(currentGenericComboCount);

  const tierColors = {
    excellent: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40',
    good: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/40',
    moderate: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40',
    poor: 'text-red-400 bg-red-900/30 border-red-700/40',
    none: 'text-zinc-400 bg-zinc-800/30 border-zinc-700/40',
  };

  const tierIcons = {
    excellent: <CheckCircle className="h-4 w-4" />,
    good: <CheckCircle className="h-4 w-4" />,
    moderate: <AlertCircle className="h-4 w-4" />,
    poor: <XCircle className="h-4 w-4" />,
    none: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-violet-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-violet-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-violet-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-violet-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-400" />
          VERTICAL BENCHMARKS
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Compare your metadata against vertical-specific performance targets
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Generic Combo Count Benchmark */}
        {benchmarks.generic_combo_count && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                Generic Combo Count
              </span>
              <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border ${tierColors[tier]}`}>
                {tierIcons[tier]}
                <span className="uppercase">{tier}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-400">Current:</span>
              <span className="font-mono font-semibold text-violet-300">{currentGenericComboCount}</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400">Excellent</span>
                <span className="font-mono text-zinc-400">≥ {benchmarks.generic_combo_count.excellent}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-400">Good</span>
                <span className="font-mono text-zinc-400">≥ {benchmarks.generic_combo_count.good}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-400">Moderate</span>
                <span className="font-mono text-zinc-400">≥ {benchmarks.generic_combo_count.moderate}</span>
              </div>
            </div>
          </div>
        )}

        {/* Intent Balance Targets */}
        {benchmarks.intent_balance_targets && Object.keys(benchmarks.intent_balance_targets).length > 0 && (
          <div className="space-y-2 pt-4 border-t border-zinc-800/50">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Intent Balance Targets
            </span>
            <div className="space-y-1.5">
              {Object.entries(benchmarks.intent_balance_targets).map(([intent, target]) => (
                <div key={intent} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 capitalize">{intent.replace('_', ' ')}</span>
                  <span className="font-mono text-violet-300">{(target as number * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Benchmarks */}
        {benchmarks.custom && Object.keys(benchmarks.custom).length > 0 && (
          <div className="space-y-2 pt-4 border-t border-zinc-800/50">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Custom Benchmarks
            </span>
            <div className="space-y-1.5">
              {Object.entries(benchmarks.custom).map(([key, value]) => {
                const displayValue =
                  typeof value === 'number'
                    ? value
                    : `${(value as any).min || 0}-${(value as any).max || 100} (target: ${(value as any).target || 50})`;

                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-mono text-violet-300">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
