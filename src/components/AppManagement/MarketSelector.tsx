/**
 * Market Selector Component
 *
 * Allows users to select App Store markets for monitoring.
 * Supports both single-select (for search) and multi-select (for adding markets).
 *
 * Features:
 * - Tier-based grouping (Tier 1, 2, 3)
 * - Flag emojis for visual identification
 * - Search/filter markets
 * - Disabled state for unavailable markets
 */

import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import {
  SUPPORTED_MARKETS,
  getMarketsByTier,
  formatMarket,
  type MarketCode,
} from '@/config/markets';

interface MarketSelectorProps {
  value: MarketCode | MarketCode[];
  onChange: (value: MarketCode | MarketCode[]) => void;
  mode?: 'single' | 'multi';
  disabled?: boolean;
  placeholder?: string;
  excludeMarkets?: MarketCode[];  // Markets to hide (e.g., already added)
  className?: string;
}

/**
 * Single-select Market Selector
 * Used for search and primary market selection
 */
export const MarketSelector: React.FC<MarketSelectorProps> = ({
  value,
  onChange,
  mode = 'single',
  disabled = false,
  placeholder = 'Select market',
  excludeMarkets = [],
  className,
}) => {
  if (mode === 'multi') {
    return (
      <MultiMarketSelector
        value={value as MarketCode[]}
        onChange={onChange as (value: MarketCode[]) => void}
        disabled={disabled}
        excludeMarkets={excludeMarkets}
        className={className}
      />
    );
  }

  const marketsByTier = getMarketsByTier();
  const availableMarkets = SUPPORTED_MARKETS.filter(
    (m) => !excludeMarkets.includes(m.code as MarketCode)
  );

  return (
    <Select
      value={value as MarketCode}
      onValueChange={onChange as (value: MarketCode) => void}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value ? formatMarket(value as string) : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Tier 1: English-speaking */}
        <SelectGroup>
          <SelectLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Tier 1 — English-Speaking
          </SelectLabel>
          {marketsByTier[1]
            .filter((m) => !excludeMarkets.includes(m.code as MarketCode))
            .map((market) => (
              <SelectItem key={market.code} value={market.code}>
                <span className="flex items-center gap-2">
                  <span>{market.flag}</span>
                  <span>{market.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {market.code.toUpperCase()}
                  </Badge>
                </span>
              </SelectItem>
            ))}
        </SelectGroup>

        {/* Tier 2: Major European */}
        <SelectGroup>
          <SelectLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-2">
            Tier 2 — Major European
          </SelectLabel>
          {marketsByTier[2]
            .filter((m) => !excludeMarkets.includes(m.code as MarketCode))
            .map((market) => (
              <SelectItem key={market.code} value={market.code}>
                <span className="flex items-center gap-2">
                  <span>{market.flag}</span>
                  <span>{market.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {market.code.toUpperCase()}
                  </Badge>
                </span>
              </SelectItem>
            ))}
        </SelectGroup>

        {/* Tier 3: Nordics + Others */}
        <SelectGroup>
          <SelectLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-2">
            Tier 3 — Nordics & Others
          </SelectLabel>
          {marketsByTier[3]
            .filter((m) => !excludeMarkets.includes(m.code as MarketCode))
            .map((market) => (
              <SelectItem key={market.code} value={market.code}>
                <span className="flex items-center gap-2">
                  <span>{market.flag}</span>
                  <span>{market.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {market.code.toUpperCase()}
                  </Badge>
                </span>
              </SelectItem>
            ))}
        </SelectGroup>

        {availableMarkets.length === 0 && (
          <div className="p-4 text-center text-sm text-zinc-500">
            All markets have been added
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

/**
 * Multi-select Market Selector
 * Used for adding multiple markets at once
 */
interface MultiMarketSelectorProps {
  value: MarketCode[];
  onChange: (value: MarketCode[]) => void;
  disabled?: boolean;
  excludeMarkets?: MarketCode[];
  className?: string;
}

const MultiMarketSelector: React.FC<MultiMarketSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  excludeMarkets = [],
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const marketsByTier = getMarketsByTier();

  // Filter markets by search query
  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) return marketsByTier;

    const query = searchQuery.toLowerCase();
    return {
      1: marketsByTier[1].filter(
        (m) =>
          m.label.toLowerCase().includes(query) ||
          m.code.toLowerCase().includes(query)
      ),
      2: marketsByTier[2].filter(
        (m) =>
          m.label.toLowerCase().includes(query) ||
          m.code.toLowerCase().includes(query)
      ),
      3: marketsByTier[3].filter(
        (m) =>
          m.label.toLowerCase().includes(query) ||
          m.code.toLowerCase().includes(query)
      ),
    };
  }, [searchQuery, marketsByTier]);

  const handleToggle = (marketCode: MarketCode) => {
    if (disabled) return;

    if (value.includes(marketCode)) {
      onChange(value.filter((m) => m !== marketCode));
    } else {
      onChange([...value, marketCode]);
    }
  };

  const handleSelectAll = (tier: 1 | 2 | 3) => {
    const tierMarkets = marketsByTier[tier]
      .filter((m) => !excludeMarkets.includes(m.code as MarketCode))
      .map((m) => m.code as MarketCode);

    const allSelected = tierMarkets.every((m) => value.includes(m));

    if (allSelected) {
      // Deselect all in tier
      onChange(value.filter((m) => !tierMarkets.includes(m)));
    } else {
      // Select all in tier
      const newValue = [...new Set([...value, ...tierMarkets])];
      onChange(newValue);
    }
  };

  const selectedCount = value.length;

  return (
    <div className={className}>
      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {/* Selected Count */}
      {selectedCount > 0 && (
        <div className="mb-3 p-2 bg-emerald-900/20 border border-emerald-400/20 rounded-lg">
          <p className="text-sm text-emerald-400 font-medium">
            {selectedCount} market{selectedCount !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}

      {/* Markets List */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {/* Tier 1 */}
        {filteredMarkets[1].length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Tier 1 — English-Speaking
              </Label>
              <button
                type="button"
                onClick={() => handleSelectAll(1)}
                className="text-xs text-emerald-400 hover:text-emerald-300"
                disabled={disabled}
              >
                {filteredMarkets[1].every((m) => value.includes(m.code as MarketCode))
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>
            <div className="space-y-2">
              {filteredMarkets[1]
                .filter((m) => !excludeMarkets.includes(m.code as MarketCode))
                .map((market) => (
                  <label
                    key={market.code}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={value.includes(market.code as MarketCode)}
                      onCheckedChange={() => handleToggle(market.code as MarketCode)}
                      disabled={disabled}
                    />
                    <span className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{market.flag}</span>
                      <span className="text-sm font-medium">{market.label}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {market.code.toUpperCase()}
                    </Badge>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Tier 2 */}
        {filteredMarkets[2].length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Tier 2 — Major European
              </Label>
              <button
                type="button"
                onClick={() => handleSelectAll(2)}
                className="text-xs text-emerald-400 hover:text-emerald-300"
                disabled={disabled}
              >
                {filteredMarkets[2].every((m) => value.includes(m.code as MarketCode))
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>
            <div className="space-y-2">
              {filteredMarkets[2]
                .filter((m) => !excludeMarkets.includes(m.code as MarketCode))
                .map((market) => (
                  <label
                    key={market.code}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={value.includes(market.code as MarketCode)}
                      onCheckedChange={() => handleToggle(market.code as MarketCode)}
                      disabled={disabled}
                    />
                    <span className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{market.flag}</span>
                      <span className="text-sm font-medium">{market.label}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {market.code.toUpperCase()}
                    </Badge>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Tier 3 */}
        {filteredMarkets[3].length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Tier 3 — Nordics & Others
              </Label>
              <button
                type="button"
                onClick={() => handleSelectAll(3)}
                className="text-xs text-emerald-400 hover:text-emerald-300"
                disabled={disabled}
              >
                {filteredMarkets[3].every((m) => value.includes(m.code as MarketCode))
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>
            <div className="space-y-2">
              {filteredMarkets[3]
                .filter((m) => !excludeMarkets.includes(m.code as MarketCode))
                .map((market) => (
                  <label
                    key={market.code}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={value.includes(market.code as MarketCode)}
                      onCheckedChange={() => handleToggle(market.code as MarketCode)}
                      disabled={disabled}
                    />
                    <span className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{market.flag}</span>
                      <span className="text-sm font-medium">{market.label}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {market.code.toUpperCase()}
                    </Badge>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredMarkets[1].length === 0 &&
          filteredMarkets[2].length === 0 &&
          filteredMarkets[3].length === 0 && (
            <div className="p-4 text-center text-sm text-zinc-500">
              No markets found matching "{searchQuery}"
            </div>
          )}
      </div>
    </div>
  );
};
