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
}

export const ComboStrengthTierRow: React.FC<ComboStrengthTierRowProps> = ({
  emoji,
  label,
  count,
  combos,
  onAddCombo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (count === 0) {
    return (
      <div className="flex items-center justify-between py-1 px-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="text-zinc-400">{label}</span>
        </div>
        <Badge variant="outline" className="text-zinc-600 border-zinc-800">
          {count}
        </Badge>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800/50 rounded-md">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 px-3 hover:bg-zinc-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="text-sm text-zinc-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
            {count}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
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
