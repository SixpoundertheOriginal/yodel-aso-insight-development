/**
 * Combo Strength Tier Row
 *
 * Expandable row showing combos for a specific strength tier
 * - Displays count with emoji indicator
 * - Expands to show list of combos
 * - Shows existing vs missing with badges
 * - Click combo to add to All Combos Table
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GeneratedCombo } from '@/engine/combos/comboGenerationEngine';

interface ComboStrengthTierRowProps {
  emoji: string;
  label: string;
  count: number;
  combos: GeneratedCombo[];
  onAddCombo?: (combo: GeneratedCombo) => void;
  totalCombos?: number; // Total combos for progress bar calculation
  tierLevel?: 'excellent' | 'good' | 'needs-improvement' | 'critical'; // For gradient intensity
}

export const ComboStrengthTierRow: React.FC<ComboStrengthTierRowProps> = ({
  emoji,
  label,
  count,
  combos,
  onAddCombo,
  totalCombos = 100,
  tierLevel = 'needs-improvement',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate percentage for progress bar
  const percentage = totalCombos > 0 ? (count / totalCombos) * 100 : 0;

  // Gradient intensity based on tier level
  const tierGradients = {
    'excellent': 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
    'good': 'from-amber-500/15 to-yellow-500/15 border-amber-500/25',
    'needs-improvement': 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
    'critical': 'from-red-500/10 to-rose-500/10 border-red-500/20'
  };

  // Badge colors based on tier level
  const badgeColors = {
    'excellent': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    'good': 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    'needs-improvement': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    'critical': 'bg-red-500/10 text-red-400 border-red-500/30'
  };

  // Progress bar colors
  const progressColors = {
    'excellent': 'bg-emerald-500/40',
    'good': 'bg-amber-500/40',
    'needs-improvement': 'bg-orange-500/30',
    'critical': 'bg-red-500/30'
  };

  // Number emphasis - larger for significant counts
  const countSizeClass = count >= 10 ? 'text-xl' : count >= 5 ? 'text-lg' : 'text-base';
  const countWeightClass = count >= 10 ? 'font-bold' : count >= 5 ? 'font-semibold' : 'font-normal';

  if (count === 0) {
    return (
      <div className="flex items-center justify-between py-1 px-2 text-sm opacity-50">
        <div className="flex items-center gap-2">
          <span className="text-base opacity-60">{emoji}</span>
          <span className="text-zinc-500">{label}</span>
        </div>
        <Badge variant="outline" className="text-zinc-600 border-zinc-800 text-xs">
          {count}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`border rounded-md bg-gradient-to-br ${tierGradients[tierLevel]} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-black/20 transition-colors relative"
      >
        {/* Progress bar background */}
        <div
          className={`absolute left-0 top-0 h-full ${progressColors[tierLevel]} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />

        <div className="flex items-center gap-3 relative z-10">
          <span className="text-lg">{emoji}</span>
          <span className="text-sm text-zinc-200 font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="outline" className={`${badgeColors[tierLevel]} ${countSizeClass} ${countWeightClass} px-2.5 py-0.5`}>
            {count}
          </Badge>
          {percentage > 5 && (
            <span className="text-xs text-zinc-400 font-mono">
              {percentage.toFixed(0)}%
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Expanded Combo List */}
      {isExpanded && (
        <div className="border-t border-zinc-800/50 p-2 space-y-1 max-h-60 overflow-y-auto">
          {combos.map((combo, index) => (
            <div
              key={`${combo.text}-${index}`}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-900/40 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="font-mono text-xs text-zinc-300">{combo.text}</span>
                {!combo.exists && (
                  <Badge variant="outline" className="text-[10px] bg-zinc-800 text-zinc-500 border-zinc-700">
                    Missing
                  </Badge>
                )}
              </div>

              {/* Add to Table Button */}
              {!combo.exists && onAddCombo && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAddCombo(combo)}
                  className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
