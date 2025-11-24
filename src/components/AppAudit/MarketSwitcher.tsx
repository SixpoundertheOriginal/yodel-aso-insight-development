/**
 * Market Switcher Component
 *
 * Dropdown selector for switching between markets when viewing audit data.
 * Only shown in monitored mode when an app has multiple markets.
 *
 * Features:
 * - Displays all monitored markets for current app
 * - Shows flag emoji + market name
 * - Highlights currently selected market
 * - Updates URL parameter on market change
 * - Persists selection in session storage
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';
import { formatMarket, getFlagEmoji, type MarketCode } from '@/config/markets';

interface MarketSwitcherProps {
  markets: Array<{
    market_code: string;
    is_active: boolean;
    last_fetched_at: string | null;
  }>;
  selectedMarket: MarketCode;
  onMarketChange: (market: MarketCode) => void;
  className?: string;
}

export const MarketSwitcher: React.FC<MarketSwitcherProps> = ({
  markets,
  selectedMarket,
  onMarketChange,
  className,
}) => {
  // Don't render if only one market
  if (markets.length <= 1) {
    return null;
  }

  // Sort markets: active first, then by market code
  const sortedMarkets = [...markets].sort((a, b) => {
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }
    return a.market_code.localeCompare(b.market_code);
  });

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Globe className="h-4 w-4 text-zinc-400" />
      <Select value={selectedMarket} onValueChange={onMarketChange}>
        <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700 text-foreground">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{getFlagEmoji(selectedMarket)}</span>
              <span>{formatMarket(selectedMarket)}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          {sortedMarkets.map((market) => (
            <SelectItem
              key={market.market_code}
              value={market.market_code}
              className="text-foreground hover:bg-zinc-700"
            >
              <div className="flex items-center justify-between w-full gap-3">
                <span className="flex items-center gap-2">
                  <span>{getFlagEmoji(market.market_code)}</span>
                  <span>{formatMarket(market.market_code)}</span>
                </span>
                {!market.is_active && (
                  <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-500">
                    Inactive
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-zinc-500">
        {markets.length} {markets.length === 1 ? 'market' : 'markets'}
      </span>
    </div>
  );
};
