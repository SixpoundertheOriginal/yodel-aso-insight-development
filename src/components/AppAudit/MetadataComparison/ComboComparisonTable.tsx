/**
 * Combo Comparison Table Component
 *
 * Detailed side-by-side view of all combo changes.
 * Shows added (green), removed (red), and tier changes (yellow).
 * Collapsible for detailed drill-down.
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ComboDiff } from '@/utils/metadataComparisonAnalysis';
import { getTierLabel } from '@/utils/metadataComparisonAnalysis';

export const ComboComparisonTable: React.FC<{ diff: ComboDiff }> = ({ diff }) => {
  const [showAll, setShowAll] = useState(false);

  const displayLimit = 20;
  const totalItems = diff.added.length + diff.removed.length + diff.tierUpgrades.length + diff.tierDowngrades.length;
  const hasMore = totalItems > displayLimit;

  return (
    <div className="mt-4 space-y-4">
      {/* Added Combos */}
      {diff.added.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
            ✅ Added Combos ({diff.added.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {(showAll ? diff.added : diff.added.slice(0, displayLimit)).map((combo, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                <span className="text-xs text-emerald-300 font-mono">{combo.text}</span>
                <Badge variant="outline" className="text-[10px] border-emerald-400/40 text-emerald-400">
                  {getTierLabel(getTierFromStrength(combo.strength))}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Combos */}
      {diff.removed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider">
            ❌ Removed Combos ({diff.removed.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {(showAll ? diff.removed : diff.removed.slice(0, displayLimit)).map((combo, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded">
                <span className="text-xs text-red-300 font-mono line-through">{combo.text}</span>
                <Badge variant="outline" className="text-[10px] border-red-400/40 text-red-400">
                  {getTierLabel(getTierFromStrength(combo.strength))}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Upgrades */}
      {diff.tierUpgrades.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-blue-400 uppercase tracking-wider">
            ⬆️ Tier Upgrades ({diff.tierUpgrades.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(showAll ? diff.tierUpgrades : diff.tierUpgrades.slice(0, displayLimit)).map((change, idx) => (
              <div key={idx} className="p-2 bg-blue-500/10 border border-blue-500/20 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-mono">{change.text}</span>
                  <Badge variant="outline" className="text-[10px] border-blue-400/40 text-blue-400">
                    +{change.improvement} tier{change.improvement > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Tier {change.baselineTier} → Tier {change.draftTier}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Downgrades */}
      {diff.tierDowngrades.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider">
            ⬇️ Tier Downgrades ({diff.tierDowngrades.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(showAll ? diff.tierDowngrades : diff.tierDowngrades.slice(0, displayLimit)).map((change, idx) => (
              <div key={idx} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300 font-mono">{change.text}</span>
                  <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-400">
                    {change.improvement} tier{Math.abs(change.improvement) > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Tier {change.baselineTier} → Tier {change.draftTier}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show More/Less Button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => setShowAll(!showAll)}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All ({totalItems} total)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {totalItems === 0 && (
        <p className="text-xs text-zinc-500 text-center py-8">
          No combo changes detected
        </p>
      )}
    </div>
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
