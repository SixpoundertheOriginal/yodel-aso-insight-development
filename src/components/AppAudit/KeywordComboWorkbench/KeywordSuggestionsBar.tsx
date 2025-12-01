/**
 * Keyword Suggestions Bar
 *
 * Compact horizontal display of keyword combo suggestions grouped by length.
 * Clicking a badge filters the table to show only combos of that length.
 * Positioned right above the table for integrated UX.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface KeywordSuggestionsBarProps {
  suggestions: {
    twoWord: { total: number };
    threeWord: { total: number };
  };
  onLengthFilter: (length: '2' | '3' | 'all') => void;
  activeLengthFilter?: 'all' | '2' | '3';
  onViewAll?: () => void;
}

export const KeywordSuggestionsBar: React.FC<KeywordSuggestionsBarProps> = ({
  suggestions,
  onLengthFilter,
  activeLengthFilter = 'all',
  onViewAll,
}) => {
  const totalSuggestions =
    suggestions.twoWord.total +
    suggestions.threeWord.total;

  const isActive = (targetLength: string) => {
    return activeLengthFilter === targetLength;
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-semibold text-zinc-300">
            Keyword Suggestions
          </span>
          <Badge variant="outline" className="text-xs border-violet-400/30 text-violet-400 bg-violet-500/5">
            {totalSuggestions} total
          </Badge>
        </div>
        {onViewAll && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onViewAll}
            className="h-7 text-xs text-zinc-400 hover:text-zinc-300"
          >
            View All Combinations →
          </Button>
        )}
      </div>

      {/* Badges Row */}
      <div className="flex items-center flex-wrap gap-3 mb-2">
        {/* 2-Word Badge */}
        <Badge
          variant="outline"
          className={`
            cursor-pointer h-9 px-4 text-sm font-semibold
            transition-all duration-150
            hover:scale-105 hover:brightness-110
            ${isActive('2')
              ? 'border-violet-400 bg-violet-500/20 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
              : 'border-violet-400/30 text-violet-400 bg-violet-500/5'
            }
          `}
          onClick={() => onLengthFilter(isActive('2') ? 'all' : '2')}
          title="Click to filter table by 2-word combos"
        >
          ⚡ 2-Word ({suggestions.twoWord.total})
        </Badge>

        {/* 3-Word Badge */}
        <Badge
          variant="outline"
          className={`
            cursor-pointer h-9 px-4 text-sm font-semibold
            transition-all duration-150
            hover:scale-105 hover:brightness-110
            ${isActive('3')
              ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'border-purple-400/30 text-purple-400 bg-purple-500/5'
            }
          `}
          onClick={() => onLengthFilter(isActive('3') ? 'all' : '3')}
          title="Click to filter table by 3-word combos"
        >
          📏 3-Word ({suggestions.threeWord.total})
        </Badge>
      </div>

      {/* Helper Text */}
      <div className="text-xs text-zinc-500">
        Click any badge to filter table
        {onViewAll && (
          <>
            {' | '}
            <button
              onClick={onViewAll}
              className="text-violet-400 hover:text-violet-300 hover:underline transition-colors"
            >
              View all combinations
            </button>
          </>
        )}
      </div>
    </div>
  );
};
