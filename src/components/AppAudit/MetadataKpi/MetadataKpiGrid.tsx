/**
 * Metadata KPI Grid
 *
 * Displays 6 KPI families in a responsive grid layout.
 * Each family card shows aggregated score + member KPIs in tooltip.
 *
 * Phase 1: Title & Subtitle KPI Engine Integration
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { KpiFamilyCard } from './KpiFamilyCard';
import type { KpiEngineResult } from '@/engine/metadata/kpi/kpi.types';

interface MetadataKpiGridProps {
  kpiResult: KpiEngineResult;
}

export const MetadataKpiGrid: React.FC<MetadataKpiGridProps> = ({ kpiResult }) => {
  const { families, overallScore } = kpiResult;

  // Sort families by weight (descending) for consistent display order
  const sortedFamilies = Object.values(families).sort((a, b) => b.weight - a.weight);

  return (
    <Card className="relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed hover:border-emerald-500/40 transition-all duration-300">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400/60" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-normal tracking-wide uppercase text-zinc-300">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              METADATA KPI ENGINE
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-1">
              34 KPIs across 6 families • Registry-driven analysis
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-2xl font-mono font-normal px-6 py-2 border-emerald-400/30 text-emerald-400"
            style={{
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
          >
            {Math.round(overallScore)}
          </Badge>
        </div>

        <div className="mt-3 text-sm text-zinc-400">
          Overall Metadata Quality Score • Weighted average of all families
        </div>
      </CardHeader>

      <CardContent className="space-y-0 pt-0">
        {/* KPI Family Grid (3x2 on desktop, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFamilies.map((family) => (
            <KpiFamilyCard
              key={family.id}
              family={family}
              kpis={kpiResult.kpis}
            />
          ))}
        </div>

        {/* Footer Help Text */}
        <div className="pt-6 space-y-2 border-t border-zinc-800 mt-6">
          <p className="text-xs text-zinc-500 italic">
            💡 <span className="font-medium">KPI Engine:</span> Scores are computed client-side using a registry-driven engine with configurable weights. Each family aggregates multiple KPIs for comprehensive metadata quality assessment.
          </p>
          <p className="text-xs text-zinc-500">
            Higher scores indicate stronger metadata quality. Hover over family cards to see detailed KPI breakdowns.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
