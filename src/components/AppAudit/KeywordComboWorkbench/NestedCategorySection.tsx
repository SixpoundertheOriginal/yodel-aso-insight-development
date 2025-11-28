/**
 * Nested Category Section
 *
 * Displays combos grouped by length, with value-based subsections
 * Structure: Length (2-word, 3-word, 4+) > Value (High, Medium, Low)
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ComboSuggestionCard } from './ComboSuggestionCard';
import type { GeneratedCombo } from '@/engine/combos/comboGenerationEngine';

interface ValueCategory {
  high: GeneratedCombo[];
  medium: GeneratedCombo[];
  low: GeneratedCombo[];
}

interface NestedCategorySectionProps {
  title: string;
  icon: string;
  combos: ValueCategory;
  total: number;
  lengthType: 2 | 3 | 4; // For styling
  isComboAdded: (text: string) => boolean;
  onAddCombo: (combo: GeneratedCombo) => void;
}

export const NestedCategorySection: React.FC<NestedCategorySectionProps> = ({
  title,
  icon,
  combos,
  total,
  lengthType,
  isComboAdded,
  onAddCombo,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSubsections, setExpandedSubsections] = useState({
    high: false,
    medium: false,
    low: false,
  });

  const toggleSubsection = (key: 'high' | 'medium' | 'low') => {
    setExpandedSubsections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ITEMS_PER_ROW = 3;
  const VISIBLE_ROWS = 2;
  const ITEMS_TO_SHOW = ITEMS_PER_ROW * VISIBLE_ROWS; // 6 items

  const getColorClasses = () => {
    switch (lengthType) {
      case 2:
        return {
          container: 'bg-violet-500/5 border-violet-400/20',
          text: 'text-violet-400',
          icon: 'text-violet-400',
          badge: 'border-violet-400/30 text-violet-400',
          chevron: 'text-violet-400',
        };
      case 3:
        return {
          container: 'bg-purple-500/5 border-purple-400/20',
          text: 'text-purple-400',
          icon: 'text-purple-400',
          badge: 'border-purple-400/30 text-purple-400',
          chevron: 'text-purple-400',
        };
      case 4:
        return {
          container: 'bg-pink-500/5 border-pink-400/20',
          text: 'text-pink-300',
          icon: 'text-pink-400',
          badge: 'border-pink-400/30 text-pink-400',
          chevron: 'text-pink-400',
        };
    }
  };

  const colorClasses = getColorClasses();

  if (total === 0) {
    return (
      <div className={`p-4 rounded-lg border ${colorClasses.container}`}>
        <div className={`flex items-center gap-2 ${colorClasses.text}`}>
          <span className="text-sm font-medium">
            {icon} {title} (0)
          </span>
          <Badge variant="outline" className={`text-xs ${colorClasses.badge}`}>
            No combos
          </Badge>
        </div>
      </div>
    );
  }

  const renderValueSubsection = (
    label: string,
    variant: 'high' | 'medium' | 'low',
    combos: GeneratedCombo[],
    emoji: string
  ) => {
    if (combos.length === 0) {
      return (
        <div className="text-xs text-zinc-500 italic py-2">
          {emoji} {label}: 0 combos
        </div>
      );
    }

    const isExpanded = expandedSubsections[variant];
    const displayedCombos = isExpanded ? combos : combos.slice(0, ITEMS_TO_SHOW);
    const hasMore = combos.length > ITEMS_TO_SHOW;

    return (
      <div className="space-y-2">
        <div
          className="flex items-center justify-between cursor-pointer py-1"
          onClick={() => toggleSubsection(variant)}
        >
          <div className="flex items-center gap-2">
            {hasMore && (
              isExpanded ? (
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-zinc-400" />
              )
            )}
            <span className="text-xs font-medium text-zinc-400">
              {emoji} {label}
            </span>
            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
              {combos.length}
            </Badge>
          </div>
        </div>

        {/* Compact 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {displayedCombos.map((combo, idx) => (
            <ComboSuggestionCard
              key={idx}
              combo={combo}
              isAdded={isComboAdded(combo.text)}
              onAdd={onAddCombo}
              variant={variant}
            />
          ))}
        </div>

        {/* View More Button */}
        {hasMore && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              toggleSubsection(variant);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-400"
          >
            {isExpanded ? 'Show Less' : `View ${combos.length - ITEMS_TO_SHOW} More`}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={`p-4 rounded-lg border space-y-4 ${colorClasses.container}`}>
      {/* Section Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className={`h-4 w-4 ${colorClasses.chevron}`} />
          ) : (
            <ChevronRight className={`h-4 w-4 ${colorClasses.chevron}`} />
          )}
          <span className={`text-sm font-medium ${colorClasses.text}`}>
            {icon} {title}
          </span>
          <Badge variant="outline" className={`text-xs ${colorClasses.badge}`}>
            {total} total
          </Badge>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 pl-6">
          {renderValueSubsection('High Value 70+', 'high', combos.high, '🎯')}
          {renderValueSubsection('Medium Value 50-69', 'medium', combos.medium, '📊')}
          {renderValueSubsection('Low Value <50', 'low', combos.low, '📉')}
        </div>
      )}
    </div>
  );
};
