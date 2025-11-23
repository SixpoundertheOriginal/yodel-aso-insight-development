/**
 * Keyword Combo Filters
 *
 * Filter controls for the combo workbench:
 * - Search input
 * - Source filter
 * - Type filter
 * - Intent filter
 * - Hide noise toggle
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import type { SourceFilter, TypeFilter, IntentClass } from '@/stores/useKeywordComboStore';

export const KeywordComboFilters: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    sourceFilter,
    setSourceFilter,
    typeFilter,
    setTypeFilter,
    intentFilter,
    setIntentFilter,
    hideNoise,
    setHideNoise,
    reset,
  } = useKeywordComboStore();

  const hasActiveFilters =
    searchQuery ||
    sourceFilter !== 'all' ||
    typeFilter !== 'all' ||
    intentFilter !== 'all' ||
    !hideNoise;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setTypeFilter('all');
    setIntentFilter('all');
    setHideNoise(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-zinc-900/50 border-b border-zinc-800">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search combos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-zinc-800 border-zinc-700 text-sm"
        />
        {searchQuery && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSearchQuery('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Source Filter */}
      <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as SourceFilter)}>
        <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="title">Title Only</SelectItem>
          <SelectItem value="subtitle">Subtitle Only</SelectItem>
          <SelectItem value="cross-element">Cross-Element</SelectItem>
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
        <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="brand">Brand</SelectItem>
          <SelectItem value="generic">Generic</SelectItem>
          <SelectItem value="low-value">Low-Value</SelectItem>
        </SelectContent>
      </Select>

      {/* Intent Filter */}
      <Select value={intentFilter} onValueChange={(value) => setIntentFilter(value as 'all' | IntentClass)}>
        <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700">
          <SelectValue placeholder="Intent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Intents</SelectItem>
          <SelectItem value="learning">Learning</SelectItem>
          <SelectItem value="outcome">Outcome</SelectItem>
          <SelectItem value="brand">Brand</SelectItem>
          <SelectItem value="noise">Noise</SelectItem>
        </SelectContent>
      </Select>

      {/* Hide Noise Toggle */}
      <Button
        size="sm"
        variant={hideNoise ? 'default' : 'outline'}
        onClick={() => setHideNoise(!hideNoise)}
        className={hideNoise ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : ''}
      >
        {hideNoise ? 'Noise Hidden' : 'Show Noise'}
      </Button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClearFilters}
          className="text-zinc-400 hover:text-zinc-300"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      {/* Active Filter Count */}
      {hasActiveFilters && (
        <Badge variant="outline" className="text-xs border-orange-500/40 text-orange-400">
          <Filter className="h-3 w-3 mr-1" />
          {[searchQuery, sourceFilter !== 'all', typeFilter !== 'all', intentFilter !== 'all', !hideNoise].filter(Boolean).length} active
        </Badge>
      )}
    </div>
  );
};
