/**
 * History Dialog Component
 *
 * Shows historical competitive analysis results
 * - Timeline of past analyses
 * - Competitor score trends
 * - Metadata change detection
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  monitoredAppId: string;
  organizationId: string;
}

interface CacheEntry {
  id: string;
  created_at: string;
  comparison_data: any;
  is_stale: boolean;
}

export const HistoryDialog: React.FC<HistoryDialogProps> = ({
  open,
  onClose,
  monitoredAppId,
  organizationId,
}) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CacheEntry[]>([]);

  useEffect(() => {
    if (open && monitoredAppId) {
      loadHistory();
    }
  }, [open, monitoredAppId]);

  const loadHistory = async () => {
    setLoading(true);

    try {
      // Query comparison cache for historical entries
      const { data, error } = await supabase
        .from('competitor_comparison_cache')
        .select('id, created_at, comparison_data, is_stale')
        .eq('target_app_id', monitoredAppId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[HistoryDialog] Error loading history:', error);
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('[HistoryDialog] Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-200 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            Analysis History
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Past competitive analysis results for this app
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No historical data available yet
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => {
              const data = entry.comparison_data;
              const prevEntry = history[index + 1];
              const prevData = prevEntry?.comparison_data;

              return (
                <Card key={entry.id} className="bg-zinc-800/40 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {formatDate(entry.created_at)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {data?.competitors?.length || 0} competitors analyzed
                        </p>
                      </div>
                      {entry.is_stale && (
                        <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                          Stale
                        </Badge>
                      )}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-2 bg-zinc-900/40 rounded border border-zinc-700/50">
                        <p className="text-xs text-zinc-500 mb-1">Missing Keywords</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-emerald-400">
                            {data?.gapAnalysis?.summary?.totalMissingKeywords || 0}
                          </p>
                          {prevData && (
                            <TrendIndicator
                              current={data?.gapAnalysis?.summary?.totalMissingKeywords || 0}
                              previous={prevData?.gapAnalysis?.summary?.totalMissingKeywords || 0}
                              inverse={true}
                            />
                          )}
                        </div>
                      </div>

                      <div className="p-2 bg-zinc-900/40 rounded border border-zinc-700/50">
                        <p className="text-xs text-zinc-500 mb-1">Missing Combos</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-blue-400">
                            {data?.gapAnalysis?.summary?.totalMissingCombos || 0}
                          </p>
                          {prevData && (
                            <TrendIndicator
                              current={data?.gapAnalysis?.summary?.totalMissingCombos || 0}
                              previous={prevData?.gapAnalysis?.summary?.totalMissingCombos || 0}
                              inverse={true}
                            />
                          )}
                        </div>
                      </div>

                      <div className="p-2 bg-zinc-900/40 rounded border border-zinc-700/50">
                        <p className="text-xs text-zinc-500 mb-1">Frequency Gaps</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-purple-400">
                            {data?.gapAnalysis?.summary?.totalFrequencyGaps || 0}
                          </p>
                          {prevData && (
                            <TrendIndicator
                              current={data?.gapAnalysis?.summary?.totalFrequencyGaps || 0}
                              previous={prevData?.gapAnalysis?.summary?.totalFrequencyGaps || 0}
                              inverse={true}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Trend indicator component
const TrendIndicator: React.FC<{ current: number; previous: number; inverse?: boolean }> = ({
  current,
  previous,
  inverse = false,
}) => {
  const diff = current - previous;
  if (diff === 0) {
    return <Minus className="h-3 w-3 text-zinc-500" />;
  }

  const isPositive = inverse ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-emerald-400' : 'text-red-400';

  return <Icon className={`h-3 w-3 ${color}`} />;
};
