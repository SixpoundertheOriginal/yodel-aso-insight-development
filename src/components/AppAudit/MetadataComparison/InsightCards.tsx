/**
 * Insight Cards Component
 *
 * Shows top gains, losses, tier upgrades, and strengthening opportunities
 * from metadata comparison in a 2x2 card grid.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowUpCircle, Lightbulb } from 'lucide-react';
import type { GeneratedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type { ComboTierChange, StrengthenOpportunity } from '@/utils/metadataComparisonAnalysis';
import { getTierLabel } from '@/utils/metadataComparisonAnalysis';

// ==================== TOP GAINS CARD ====================

export const TopGainsCard: React.FC<{ gains: GeneratedCombo[] }> = ({ gains }) => {
  const displayCount = Math.min(gains.length, 5);
  const overflow = Math.max(0, gains.length - displayCount);

  return (
    <Card className="bg-emerald-500/5 border-emerald-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <CardTitle className="text-sm font-medium text-emerald-400">
            Top Gains
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {gains.length === 0 ? (
          <p className="text-xs text-zinc-500">No new combos added</p>
        ) : (
          <>
            {gains.slice(0, displayCount).map((combo, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-emerald-500/10 rounded">
                <span className="text-xs text-emerald-300 font-mono">{combo.text}</span>
                <Badge variant="outline" className="text-[10px] border-emerald-400/40 text-emerald-400">
                  Tier {getTierFromStrength(combo.strength)}
                </Badge>
              </div>
            ))}
            {overflow > 0 && (
              <p className="text-xs text-zinc-500 text-center pt-1">
                +{overflow} more
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== TOP LOSSES CARD ====================

export const TopLossesCard: React.FC<{ losses: GeneratedCombo[] }> = ({ losses }) => {
  const displayCount = Math.min(losses.length, 5);
  const overflow = Math.max(0, losses.length - displayCount);

  return (
    <Card className="bg-red-500/5 border-red-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-400" />
          <CardTitle className="text-sm font-medium text-red-400">
            Top Losses
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {losses.length === 0 ? (
          <p className="text-xs text-zinc-500">No combos removed</p>
        ) : (
          <>
            {losses.slice(0, displayCount).map((combo, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-red-500/10 rounded">
                <span className="text-xs text-red-300 font-mono line-through">{combo.text}</span>
                <Badge variant="outline" className="text-[10px] border-red-400/40 text-red-400">
                  Was Tier {getTierFromStrength(combo.strength)}
                </Badge>
              </div>
            ))}
            {overflow > 0 && (
              <p className="text-xs text-zinc-500 text-center pt-1">
                +{overflow} more
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== TIER UPGRADES CARD ====================

export const TierUpgradesCard: React.FC<{ upgrades: ComboTierChange[] }> = ({ upgrades }) => {
  const displayCount = Math.min(upgrades.length, 5);
  const overflow = Math.max(0, upgrades.length - displayCount);

  return (
    <Card className="bg-blue-500/5 border-blue-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ArrowUpCircle className="h-4 w-4 text-blue-400" />
          <CardTitle className="text-sm font-medium text-blue-400">
            Tier Upgrades
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upgrades.length === 0 ? (
          <p className="text-xs text-zinc-500">No tier improvements</p>
        ) : (
          <>
            {upgrades.slice(0, displayCount).map((change, idx) => (
              <div key={idx} className="p-2 bg-blue-500/10 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-mono">{change.text}</span>
                  <Badge variant="outline" className="text-[10px] border-blue-400/40 text-blue-400">
                    +{change.improvement} tier{change.improvement > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <span>Tier {change.baselineTier}</span>
                  <span>→</span>
                  <span className="text-blue-400">Tier {change.draftTier}</span>
                </div>
              </div>
            ))}
            {overflow > 0 && (
              <p className="text-xs text-zinc-500 text-center pt-1">
                +{overflow} more
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== OPPORTUNITIES CARD ====================

export const OpportunitiesCard: React.FC<{ opportunities: StrengthenOpportunity[] }> = ({ opportunities }) => {
  const displayCount = Math.min(opportunities.length, 5);
  const overflow = Math.max(0, opportunities.length - displayCount);

  return (
    <Card className="bg-violet-500/5 border-violet-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-violet-400" />
          <CardTitle className="text-sm font-medium text-violet-400">
            Strengthening Opportunities
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {opportunities.length === 0 ? (
          <p className="text-xs text-zinc-500">No suggestions available</p>
        ) : (
          <>
            {opportunities.slice(0, displayCount).map((opp, idx) => (
              <div key={idx} className="p-2 bg-violet-500/10 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-violet-300 font-mono">{opp.combo.text}</span>
                  <Badge variant="outline" className="text-[10px] border-violet-400/40 text-violet-400">
                    Tier {opp.currentTier}
                  </Badge>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  💡 {opp.suggestion}
                </p>
              </div>
            ))}
            {overflow > 0 && (
              <p className="text-xs text-zinc-500 text-center pt-1">
                +{overflow} more
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== HELPER ====================

function getTierFromStrength(strength: string): number {
  switch (strength) {
    case 'title_consecutive':
      return 1;
    case 'title_non_consecutive':
    case 'title_keywords_cross':
      return 2;
    case 'cross_element':
      return 3;
    case 'keywords_consecutive':
    case 'subtitle_consecutive':
      return 4;
    case 'keywords_subtitle_cross':
      return 5;
    case 'keywords_non_consecutive':
    case 'subtitle_non_consecutive':
      return 6;
    case 'three_way_cross':
      return 7;
    default:
      return 8;
  }
}
