/**
 * Add Market Modal
 *
 * Allows users to add additional markets to existing monitored apps.
 * Shows currently monitored markets and lets user select a new one.
 *
 * Flow:
 * 1. Display currently monitored markets (read-only)
 * 2. Select new market from available options
 * 3. Fetch fresh metadata from App Store
 * 4. Create monitored_app_markets entry
 *
 * Features:
 * - Excludes already-added markets from selector
 * - Shows warning about fetching fresh data
 * - Loading state during API calls
 * - Error handling with toast notifications
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarketSelector } from './MarketSelector';
import { useMarketManagement } from '@/hooks/useMarketManagement';
import { formatMarket, type MarketCode } from '@/config/markets';

interface AddMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: {
    id: string;
    app_name: string;
    organization_id: string;
  };
  existingMarkets: MarketCode[];
  onMarketAdded?: () => void; // Callback to refresh app list
}

export const AddMarketModal: React.FC<AddMarketModalProps> = ({
  isOpen,
  onClose,
  app,
  existingMarkets,
  onMarketAdded,
}) => {
  const { toast } = useToast();
  const { addMarket, isLoading, error, clearError } = useMarketManagement();

  const [selectedMarket, setSelectedMarket] = useState<MarketCode | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMarket(null);
      clearError();
    }
  }, [isOpen, clearError]);

  // Show error toast if error occurs
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add market',
        description: error,
      });
    }
  }, [error, toast]);

  const handleAddMarket = async () => {
    if (!selectedMarket) {
      toast({
        variant: 'destructive',
        title: 'No market selected',
        description: 'Please select a market to add',
      });
      return;
    }

    const success = await addMarket(app.id, selectedMarket, app.organization_id);

    if (success) {
      toast({
        title: 'Market added successfully',
        description: `${formatMarket(selectedMarket)} is now being monitored`,
      });

      // Refresh app list if callback provided
      onMarketAdded?.();

      // Close modal
      onClose();
    }
  };

  const availableMarketsCount = 15 - existingMarkets.length; // Total markets - already added

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Market</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add a new market to monitor for <span className="font-medium text-foreground">{app.app_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Currently Monitored Markets */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Currently monitoring ({existingMarkets.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {existingMarkets.length > 0 ? (
                existingMarkets.map((market) => (
                  <Badge
                    key={market}
                    variant="outline"
                    className="bg-emerald-900/20 border-emerald-400/30 text-emerald-400 px-3 py-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {formatMarket(market)}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No markets yet</p>
              )}
            </div>
          </div>

          {/* Market Selector */}
          {availableMarketsCount > 0 ? (
            <div>
              <Label htmlFor="market-select" className="text-sm font-medium text-foreground mb-2 block">
                Select new market
              </Label>
              <MarketSelector
                value={selectedMarket || ('' as MarketCode)}
                onChange={(value) => setSelectedMarket(value as MarketCode)}
                mode="single"
                excludeMarkets={existingMarkets}
                placeholder="Choose a market to add..."
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500 mt-2">
                {availableMarketsCount} {availableMarketsCount === 1 ? 'market' : 'markets'} available to add
              </p>
            </div>
          ) : (
            <Alert className="bg-zinc-800/50 border-zinc-700">
              <AlertDescription className="text-sm text-zinc-400">
                All 15 supported markets are already being monitored for this app.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning Alert */}
          {selectedMarket && (
            <Alert className="bg-amber-900/20 border-amber-400/30">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-sm text-zinc-300 ml-2">
                <strong className="text-amber-400">Fresh metadata fetch:</strong> This will fetch the latest app data
                from the {formatMarket(selectedMarket)} App Store and create a new audit baseline for this market.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddMarket}
            disabled={isLoading || !selectedMarket || availableMarketsCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Market...
              </>
            ) : (
              <>Add {selectedMarket ? formatMarket(selectedMarket) : 'Market'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
