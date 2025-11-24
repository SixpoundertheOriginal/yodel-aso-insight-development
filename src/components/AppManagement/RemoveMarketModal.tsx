/**
 * Remove Market Modal
 *
 * Allows users to remove markets from monitored apps.
 * Shows warning about CASCADE deletion of audit history.
 *
 * Flow:
 * 1. Display currently monitored markets
 * 2. Select market(s) to remove
 * 3. Show warning about audit history deletion
 * 4. Confirm and delete (CASCADE removes linked audits)
 *
 * Features:
 * - Multi-select for batch removal
 * - Audit snapshot count per market
 * - Warning about irreversible action
 * - Prevents removing the last market
 * - Confirmation checkbox for safety
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMarketManagement, type MonitoredAppMarket } from '@/hooks/useMarketManagement';
import { formatMarket, type MarketCode } from '@/config/markets';
import { supabase } from '@/integrations/supabase/client';

interface RemoveMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: {
    id: string;
    app_name: string;
  };
  markets: MonitoredAppMarket[];
  onMarketRemoved?: () => void; // Callback to refresh app list
}

interface MarketWithAuditCount extends MonitoredAppMarket {
  auditCount?: number;
}

export const RemoveMarketModal: React.FC<RemoveMarketModalProps> = ({
  isOpen,
  onClose,
  app,
  markets,
  onMarketRemoved,
}) => {
  const { toast } = useToast();
  const { removeMarket, isLoading, error, clearError } = useMarketManagement();

  const [selectedMarkets, setSelectedMarkets] = useState<MarketCode[]>([]);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [marketsWithCounts, setMarketsWithCounts] = useState<MarketWithAuditCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMarkets([]);
      setConfirmChecked(false);
      clearError();
    }
  }, [isOpen, clearError]);

  // Load audit counts for each market when modal opens
  useEffect(() => {
    if (isOpen && markets.length > 0) {
      loadAuditCounts();
    }
  }, [isOpen, markets]);

  // Show error toast if error occurs
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to remove market',
        description: error,
      });
    }
  }, [error, toast]);

  const loadAuditCounts = async () => {
    setLoadingCounts(true);
    try {
      const countsPromises = markets.map(async (market) => {
        const { count, error } = await supabase
          .from('aso_audit_snapshots')
          .select('id', { count: 'exact', head: true })
          .eq('monitored_app_market_id', market.id);

        return {
          ...market,
          auditCount: error ? 0 : (count || 0),
        };
      });

      const marketsWithCountsResult = await Promise.all(countsPromises);
      setMarketsWithCounts(marketsWithCountsResult);
    } catch (err) {
      console.error('Failed to load audit counts:', err);
      setMarketsWithCounts(markets.map((m) => ({ ...m, auditCount: 0 })));
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleToggleMarket = (marketCode: MarketCode) => {
    if (selectedMarkets.includes(marketCode)) {
      setSelectedMarkets(selectedMarkets.filter((m) => m !== marketCode));
    } else {
      setSelectedMarkets([...selectedMarkets, marketCode]);
    }
  };

  const handleRemoveMarkets = async () => {
    if (selectedMarkets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No markets selected',
        description: 'Please select at least one market to remove',
      });
      return;
    }

    if (!confirmChecked) {
      toast({
        variant: 'destructive',
        title: 'Confirmation required',
        description: 'Please check the confirmation box to proceed',
      });
      return;
    }

    // Prevent removing all markets
    if (selectedMarkets.length === markets.length) {
      toast({
        variant: 'destructive',
        title: 'Cannot remove all markets',
        description: 'Apps must have at least one market. Add a new market before removing the last one.',
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const marketCode of selectedMarkets) {
      const success = await removeMarket(app.id, marketCode);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: 'Markets removed',
        description: `Successfully removed ${successCount} market${successCount !== 1 ? 's' : ''}${
          failCount > 0 ? ` (${failCount} failed)` : ''
        }`,
      });

      // Refresh app list if callback provided
      onMarketRemoved?.();

      // Close modal
      onClose();
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to remove markets',
        description: 'All removal attempts failed. Please try again.',
      });
    }
  };

  const totalAuditSnapshots = marketsWithCounts
    .filter((m) => selectedMarkets.includes(m.market_code as MarketCode))
    .reduce((sum, m) => sum + (m.auditCount || 0), 0);

  const cannotRemoveAll = selectedMarkets.length === markets.length && markets.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-red-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Remove Markets
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Remove markets from <span className="font-medium text-foreground">{app.app_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Alert */}
          <Alert className="bg-red-900/20 border-red-400/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-sm text-zinc-300 ml-2">
              <strong className="text-red-400">Warning:</strong> Removing a market will permanently delete all audit
              snapshots and historical data for that market. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Markets List */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">
              Select markets to remove ({markets.length} total)
            </Label>

            {loadingCounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                <span className="ml-2 text-sm text-zinc-400">Loading audit counts...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {marketsWithCounts.map((market) => (
                  <label
                    key={market.market_code}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMarkets.includes(market.market_code as MarketCode)
                        ? 'bg-red-900/20 border-red-400/30'
                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    <Checkbox
                      checked={selectedMarkets.includes(market.market_code as MarketCode)}
                      onCheckedChange={() => handleToggleMarket(market.market_code as MarketCode)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-base">{formatMarket(market.market_code)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {market.auditCount !== undefined && market.auditCount > 0 && (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">
                          {market.auditCount} {market.auditCount === 1 ? 'audit' : 'audits'}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          market.is_active
                            ? 'border-emerald-400/30 text-emerald-400 text-xs'
                            : 'border-zinc-600 text-zinc-400 text-xs'
                        }
                      >
                        {market.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Deletion Impact Summary */}
          {selectedMarkets.length > 0 && (
            <Alert className="bg-zinc-800/50 border-zinc-700">
              <AlertDescription className="text-sm text-zinc-300">
                <strong className="text-foreground">Deletion impact:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>
                    {selectedMarkets.length} market{selectedMarkets.length !== 1 ? 's' : ''} will be removed
                  </li>
                  <li>
                    {totalAuditSnapshots} audit snapshot{totalAuditSnapshots !== 1 ? 's' : ''} will be permanently
                    deleted
                  </li>
                  <li>All historical data for these markets will be lost</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Cannot Remove All Warning */}
          {cannotRemoveAll && (
            <Alert className="bg-amber-900/20 border-amber-400/30">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-sm text-zinc-300 ml-2">
                <strong className="text-amber-400">Cannot remove all markets:</strong> Apps must have at least one
                market. Please add a new market before removing the last one.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation Checkbox */}
          {selectedMarkets.length > 0 && !cannotRemoveAll && (
            <label className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 cursor-pointer">
              <Checkbox checked={confirmChecked} onCheckedChange={(checked) => setConfirmChecked(!!checked)} />
              <span className="text-sm text-zinc-300">
                I understand that this action is <strong className="text-red-400">permanent and irreversible</strong>,
                and all audit history for the selected markets will be deleted.
              </span>
            </label>
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
            onClick={handleRemoveMarkets}
            disabled={isLoading || selectedMarkets.length === 0 || !confirmChecked || cannotRemoveAll}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove {selectedMarkets.length > 0 ? `(${selectedMarkets.length})` : 'Markets'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
