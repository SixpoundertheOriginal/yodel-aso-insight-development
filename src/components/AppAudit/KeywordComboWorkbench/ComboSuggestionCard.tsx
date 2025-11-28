/**
 * Compact Combo Suggestion Card
 *
 * Displays a single combo suggestion in a compact grid format with:
 * - Combo text
 * - Strategic value score
 * - Length badge
 * - Add button
 */

import React from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GeneratedCombo } from '@/engine/combos/comboGenerationEngine';

interface ComboSuggestionCardProps {
  combo: GeneratedCombo;
  isAdded: boolean;
  onAdd: (combo: GeneratedCombo) => void;
  variant?: 'high' | 'medium' | 'low';
}

export const ComboSuggestionCard: React.FC<ComboSuggestionCardProps> = ({
  combo,
  isAdded,
  onAdd,
  variant = 'medium',
}) => {
  const getVariantStyles = () => {
    if (isAdded) {
      return 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300';
    }

    switch (variant) {
      case 'high':
        return 'bg-emerald-500/5 border-emerald-400/20 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400/40';
      case 'medium':
        return 'bg-blue-500/5 border-blue-400/20 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400/40';
      case 'low':
        return 'bg-zinc-500/5 border-zinc-400/20 text-zinc-300 hover:bg-zinc-500/10 hover:border-zinc-400/40';
    }
  };

  const getLengthBadgeColor = () => {
    switch (combo.length) {
      case 2:
        return 'bg-violet-500/20 text-violet-300 border-violet-400/30';
      case 3:
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      default:
        return 'bg-pink-500/20 text-pink-300 border-pink-400/30';
    }
  };

  return (
    <div
      className={`
        relative p-3 rounded-lg border transition-all cursor-pointer
        ${getVariantStyles()}
        ${!isAdded && 'hover:scale-[1.02]'}
      `}
      onClick={() => !isAdded && onAdd(combo)}
    >
      {/* Combo Text */}
      <div className="mb-2">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {combo.text}
        </p>
      </div>

      {/* Bottom Row: Value + Length + Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Strategic Value */}
          <span className="text-xs font-mono font-semibold opacity-80 shrink-0">
            {combo.strategicValue || 0}
          </span>

          {/* Length Badge */}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLengthBadgeColor()}`}>
            {combo.length}w
          </Badge>
        </div>

        {/* Add Button */}
        <div className="shrink-0">
          {isAdded ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : (
            <Plus className="h-4 w-4 opacity-60 group-hover:opacity-100" />
          )}
        </div>
      </div>

      {/* Source indicator (optional, subtle) */}
      {combo.source && combo.source !== 'missing' && (
        <div className="absolute top-1 right-1">
          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
        </div>
      )}
    </div>
  );
};
