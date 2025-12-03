/**
 * Tier Distribution Chart Component
 *
 * Visual breakdown showing combo count changes per tier (3 groups).
 * Shows baseline → draft progress bars with delta badges.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import type { TierDistribution } from '@/utils/metadataComparisonAnalysis';
import { CompactDeltaBadge } from './DeltaBadge';

export const TierDistributionChart: React.FC<{ distribution: TierDistribution }> = ({ distribution }) => {
  const totalBaseline = distribution.tier1.baseline + distribution.tier2.baseline + distribution.tier3Plus.baseline;
  const totalDraft = distribution.tier1.draft + distribution.tier2.draft + distribution.tier3Plus.draft;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <CardTitle className="text-sm font-medium text-zinc-300">
            Combo Tier Distribution
          </CardTitle>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Breakdown of combo strength across 3 tier groups
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier 1: Excellent */}
        <TierRow
          label="Excellent (Tier 1)"
          color="orange"
          baseline={distribution.tier1.baseline}
          draft={distribution.tier1.draft}
          delta={distribution.tier1.delta}
          totalBaseline={totalBaseline}
          totalDraft={totalDraft}
        />

        {/* Tier 2: Good */}
        <TierRow
          label="Good (Tier 2)"
          color="amber"
          baseline={distribution.tier2.baseline}
          draft={distribution.tier2.draft}
          delta={distribution.tier2.delta}
          totalBaseline={totalBaseline}
          totalDraft={totalDraft}
        />

        {/* Tier 3+: Poor */}
        <TierRow
          label="Poor (Tier 3+)"
          color="zinc"
          baseline={distribution.tier3Plus.baseline}
          draft={distribution.tier3Plus.draft}
          delta={distribution.tier3Plus.delta}
          totalBaseline={totalBaseline}
          totalDraft={totalDraft}
          inverse // Lower is better for poor tiers
        />
      </CardContent>
    </Card>
  );
};

// ==================== TIER ROW ====================

interface TierRowProps {
  label: string;
  color: 'orange' | 'amber' | 'zinc';
  baseline: number;
  draft: number;
  delta: number;
  totalBaseline: number;
  totalDraft: number;
  inverse?: boolean;
}

const TierRow: React.FC<TierRowProps> = ({
  label,
  color,
  baseline,
  draft,
  delta,
  totalBaseline,
  totalDraft,
  inverse = false,
}) => {
  const baselinePct = totalBaseline > 0 ? (baseline / totalBaseline) * 100 : 0;
  const draftPct = totalDraft > 0 ? (draft / totalDraft) * 100 : 0;

  const colorClasses = getColorClasses(color);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <CompactDeltaBadge value={delta} inverse={inverse} />
      </div>

      {/* Progress bars */}
      <div className="space-y-1.5">
        {/* Baseline bar */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 w-16 justify-center">
            Baseline
          </Badge>
          <div className="flex-1 h-6 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full ${colorClasses.bg} transition-all duration-500 flex items-center justify-end pr-2`}
              style={{ width: `${Math.max(baselinePct, 5)}%` }}
            >
              <span className="text-[10px] font-bold text-white">{baseline}</span>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 w-10 text-right">
            {baselinePct.toFixed(0)}%
          </span>
        </div>

        {/* Draft bar */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-violet-400/40 text-violet-400 w-16 justify-center">
            Draft
          </Badge>
          <div className="flex-1 h-6 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full ${colorClasses.bgBright} transition-all duration-500 flex items-center justify-end pr-2`}
              style={{ width: `${Math.max(draftPct, 5)}%` }}
            >
              <span className="text-[10px] font-bold text-white">{draft}</span>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 w-10 text-right">
            {draftPct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// ==================== COLOR CLASSES ====================

function getColorClasses(color: 'orange' | 'amber' | 'zinc') {
  switch (color) {
    case 'orange':
      return {
        bg: 'bg-orange-600',
        bgBright: 'bg-orange-500',
        text: 'text-orange-400',
      };
    case 'amber':
      return {
        bg: 'bg-amber-600',
        bgBright: 'bg-amber-500',
        text: 'text-amber-400',
      };
    case 'zinc':
      return {
        bg: 'bg-zinc-600',
        bgBright: 'bg-zinc-500',
        text: 'text-zinc-400',
      };
  }
}
