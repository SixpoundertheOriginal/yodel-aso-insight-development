/**
 * Enhanced Combo Filters
 *
 * Advanced filtering for the combo workbench with:
 * - Existence filter (existing, missing, all)
 * - Length filter (2-word, 3-word, 4-word)
 * - Keyword search (filter by specific keyword)
 * - Strategic value range filter
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { isV2_1FeatureEnabled } from '@/config/metadataFeatureFlags';

export interface ComboFilterState {
  existence: 'all' | 'existing' | 'missing';
  length: 'all' | '2' | '3' | '4' | '5+';
  keywordSearch: string;
  minStrategicValue: number;
  source: 'all' | 'title' | 'subtitle' | 'both';

  // V2.1 filters (optional for backward compatibility)
  showHighValueOnly?: boolean; // priority_score > 70
  showBrandHybridOnly?: boolean; // brand + generic combos
  showLongTailOnly?: boolean; // 3+ words
  maxNoiseConfidence?: number; // 0-100 threshold (default: 30)
}

interface EnhancedComboFiltersProps {
  filters: ComboFilterState;
  onChange: (filters: ComboFilterState) => void;
  stats?: {
    total: number;
    filtered: number;
  };
}

export const EnhancedComboFilters: React.FC<EnhancedComboFiltersProps> = ({
  filters,
  onChange,
  stats,
}) => {
  const handleReset = () => {
    onChange({
      existence: 'all',
      length: 'all',
      keywordSearch: '',
      minStrategicValue: 0,
      source: 'all',
      // V2.1 filters
      showHighValueOnly: false,
      showBrandHybridOnly: false,
      showLongTailOnly: false,
      maxNoiseConfidence: undefined,
    });
  };

  const hasActiveFilters =
    filters.existence !== 'all' ||
    filters.length !== 'all' ||
    filters.keywordSearch !== '' ||
    filters.minStrategicValue > 0 ||
    filters.source !== 'all' ||
    // V2.1 filters
    filters.showHighValueOnly ||
    filters.showBrandHybridOnly ||
    filters.showLongTailOnly ||
    (filters.maxNoiseConfidence !== undefined && filters.maxNoiseConfidence < 100);

  const v2_1Enabled = isV2_1FeatureEnabled('COMBO_ENHANCE');

  return (
    <div className="space-y-4 mb-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-300">Advanced Filters</span>
          {stats && (
            <Badge variant="outline" className="text-xs border-violet-400/30 text-violet-400">
              {stats.filtered} / {stats.total}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-xs text-zinc-400 hover:text-zinc-300"
          >
            <X className="h-3 w-3 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Keyword Search */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Search Keyword</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="e.g., games"
              value={filters.keywordSearch}
              onChange={(e) => onChange({ ...filters, keywordSearch: e.target.value })}
              className="pl-8 bg-zinc-900 border-zinc-700 text-sm"
            />
          </div>
          {filters.keywordSearch && (
            <p className="text-xs text-zinc-500">
              Showing combos containing "{filters.keywordSearch}"
            </p>
          )}
        </div>

        {/* Existence Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Combo Status</Label>
          <Select
            value={filters.existence}
            onValueChange={(value: any) => onChange({ ...filters, existence: value })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Combos</SelectItem>
              <SelectItem value="existing">Existing Only</SelectItem>
              <SelectItem value="missing">Missing Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Length Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Combo Length</Label>
          <Select
            value={filters.length}
            onValueChange={(value: any) => onChange({ ...filters, length: value })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Lengths</SelectItem>
              <SelectItem value="2">2-word</SelectItem>
              <SelectItem value="3">3-word</SelectItem>
              <SelectItem value="4">4-word</SelectItem>
              <SelectItem value="5+">5+ words</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Source</Label>
          <Select
            value={filters.source}
            onValueChange={(value: any) => onChange({ ...filters, source: value })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="title">Title Only</SelectItem>
              <SelectItem value="subtitle">Subtitle Only</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Strategic Value Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Min Strategic Value</Label>
          <Select
            value={filters.minStrategicValue.toString()}
            onValueChange={(value) => onChange({ ...filters, minStrategicValue: parseInt(value) })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="0">Any Value (0+)</SelectItem>
              <SelectItem value="50">Medium (50+)</SelectItem>
              <SelectItem value="70">High (70+)</SelectItem>
              <SelectItem value="85">Very High (85+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* V2.1 Advanced Filters */}
      {v2_1Enabled && (
        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-300">V2.1 Priority Filters</span>
            <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
              NEW
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* High-Value Only */}
            <div className="flex items-center space-x-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-emerald-500/30 transition-colors">
              <Checkbox
                id="highValue"
                checked={filters.showHighValueOnly || false}
                onCheckedChange={(checked) =>
                  onChange({ ...filters, showHighValueOnly: !!checked })
                }
              />
              <div className="flex-1">
                <label
                  htmlFor="highValue"
                  className="text-sm font-medium text-zinc-300 cursor-pointer flex items-center gap-1"
                >
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  High-Value Only
                </label>
                <p className="text-xs text-zinc-500">Priority score &gt; 70</p>
              </div>
            </div>

            {/* Brand Hybrid Only */}
            <div className="flex items-center space-x-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-blue-500/30 transition-colors">
              <Checkbox
                id="brandHybrid"
                checked={filters.showBrandHybridOnly || false}
                onCheckedChange={(checked) =>
                  onChange({ ...filters, showBrandHybridOnly: !!checked })
                }
              />
              <div className="flex-1">
                <label
                  htmlFor="brandHybrid"
                  className="text-sm font-medium text-zinc-300 cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-blue-400" />
                  Brand+Generic
                </label>
                <p className="text-xs text-zinc-500">Hybrid combos only</p>
              </div>
            </div>

            {/* Long-Tail Only */}
            <div className="flex items-center space-x-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-purple-500/30 transition-colors">
              <Checkbox
                id="longTail"
                checked={filters.showLongTailOnly || false}
                onCheckedChange={(checked) =>
                  onChange({ ...filters, showLongTailOnly: !!checked })
                }
              />
              <div className="flex-1">
                <label
                  htmlFor="longTail"
                  className="text-sm font-medium text-zinc-300 cursor-pointer"
                >
                  Long-Tail Only
                </label>
                <p className="text-xs text-zinc-500">3+ words</p>
              </div>
            </div>

            {/* Max Noise Filter */}
            <div className="space-y-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <Label className="text-xs text-zinc-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-400" />
                Max Noise Threshold
              </Label>
              <Select
                value={(filters.maxNoiseConfidence ?? 100).toString()}
                onValueChange={(value) =>
                  onChange({ ...filters, maxNoiseConfidence: parseInt(value) })
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="100">No Filter (100)</SelectItem>
                  <SelectItem value="30">Low Noise (≤30)</SelectItem>
                  <SelectItem value="60">Medium Noise (≤60)</SelectItem>
                  <SelectItem value="90">High Noise (≤90)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">Active filters:</span>
          {filters.existence !== 'all' && (
            <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
              Status: {filters.existence}
            </Badge>
          )}
          {filters.length !== 'all' && (
            <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400">
              Length: {filters.length}
            </Badge>
          )}
          {filters.keywordSearch && (
            <Badge variant="outline" className="text-xs border-violet-400/30 text-violet-400">
              Keyword: {filters.keywordSearch}
            </Badge>
          )}
          {filters.source !== 'all' && (
            <Badge variant="outline" className="text-xs border-orange-400/30 text-orange-400">
              Source: {filters.source}
            </Badge>
          )}
          {filters.minStrategicValue > 0 && (
            <Badge variant="outline" className="text-xs border-amber-400/30 text-amber-400">
              Value: {filters.minStrategicValue}+
            </Badge>
          )}
          {/* V2.1 Filter Badges */}
          {filters.showHighValueOnly && (
            <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">
              High-Value Only
            </Badge>
          )}
          {filters.showBrandHybridOnly && (
            <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400">
              Brand+Generic Only
            </Badge>
          )}
          {filters.showLongTailOnly && (
            <Badge variant="outline" className="text-xs border-purple-400/30 text-purple-400">
              Long-Tail Only
            </Badge>
          )}
          {filters.maxNoiseConfidence !== undefined && filters.maxNoiseConfidence < 100 && (
            <Badge variant="outline" className="text-xs border-orange-400/30 text-orange-400">
              Max Noise: {filters.maxNoiseConfidence}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
