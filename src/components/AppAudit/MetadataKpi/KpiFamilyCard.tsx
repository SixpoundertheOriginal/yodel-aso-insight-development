/**
 * KPI Family Card
 *
 * Displays a single KPI family with:
 * - Family name + description
 * - Aggregated score (weighted average of member KPIs)
 * - Hover tooltip showing detailed KPI breakdown
 *
 * Phase 1: Title & Subtitle KPI Engine Integration
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { KpiFamilyResult, KpiResult, KpiId } from '@/engine/metadata/kpi/kpi.types';

interface KpiFamilyCardProps {
  family: KpiFamilyResult;
  kpis: Record<KpiId, KpiResult>;
}

export const KpiFamilyCard: React.FC<KpiFamilyCardProps> = ({ family, kpis }) => {
  const { id, label, score, kpiIds, weight } = family;

  // Get member KPIs for this family
  const memberKpis = kpiIds.map((kpiId) => kpis[kpiId]).filter(Boolean);

  // Color coding based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-400/40';
    if (score >= 60) return 'text-yellow-400 border-yellow-400/40';
    if (score >= 40) return 'text-orange-400 border-orange-400/40';
    return 'text-red-400 border-red-400/40';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-400/5';
    if (score >= 60) return 'bg-yellow-400/5';
    if (score >= 40) return 'bg-orange-400/5';
    return 'bg-red-400/5';
  };

  const scoreColorClass = getScoreColor(score);
  const scoreBgClass = getScoreBgColor(score);

  // Family icon based on ID
  const getFamilyIcon = (familyId: string) => {
    switch (familyId) {
      case 'clarity_structure':
        return '📐';
      case 'keyword_architecture':
        return '🏗️';
      case 'hook_strength':
        return '🎣';
      case 'brand_vs_generic':
        return '⚖️';
      case 'psychology_alignment':
        return '🧠';
      case 'intent_alignment':
        return '🎯';
      default:
        return '📊';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`relative cursor-help transition-all duration-200 hover:border-emerald-400/60 ${scoreBgClass} border-zinc-700`}
          >
            <CardContent className="p-4 space-y-3">
              {/* Header: Icon + Label */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFamilyIcon(id)}</span>
                    <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                      {label}
                    </h4>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                    Weight: {Math.round(weight * 100)}% • {memberKpis.length} KPIs
                  </p>
                </div>
                <Info className="h-3 w-3 text-zinc-500 flex-shrink-0" />
              </div>

              {/* Score Display */}
              <div className="flex items-end justify-between">
                <div>
                  <div className={`text-3xl font-mono font-bold ${scoreColorClass}`}>
                    {Math.round(score)}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    Family Score
                  </div>
                </div>

                {/* Score Bar */}
                <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${scoreColorClass.replace('text-', 'bg-').replace('border-', 'bg-')} transition-all duration-500`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          className="max-w-md p-4 bg-zinc-900 border-zinc-700"
        >
          <div className="space-y-3">
            <div>
              <h5 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                {getFamilyIcon(id)} {label}
              </h5>
              <p className="text-xs text-zinc-400 mt-1">
                Aggregated score from {memberKpis.length} member KPIs (Weight: {Math.round(weight * 100)}%)
              </p>
            </div>

            {/* Member KPI List */}
            <div className="space-y-2 border-t border-zinc-800 pt-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                Member KPIs:
              </p>
              {memberKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="flex items-center justify-between gap-4 py-1.5 px-2 rounded bg-zinc-800/50"
                >
                  <div className="flex-1">
                    <div className="text-xs text-zinc-300">{kpi.label}</div>
                    <div className="text-[10px] text-zinc-500">
                      Raw: {typeof kpi.value === 'number' ? kpi.value.toFixed(2) : kpi.value}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs font-mono ${getScoreColor(kpi.normalized)} px-2 py-0.5`}
                  >
                    {Math.round(kpi.normalized)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
