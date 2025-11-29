/**
 * Competitor List Component
 *
 * Displays saved competitors with management options:
 * - Remove competitor (delete relationship)
 * - Mark as favorite/primary (update priority)
 * - View last analyzed date
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Star, StarOff, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedCompetitor {
  relationshipId: string;
  appStoreId: string;
  name: string;
  iconUrl: string | null;
  developer: string | null;
  priority: number;
  lastComparedAt: string | null;
}

interface CompetitorListProps {
  competitors: SavedCompetitor[];
  monitoredAppId: string;
  organizationId: string;
  onCompetitorRemoved: (appStoreId: string) => void;
  onCompetitorPriorityChanged: (appStoreId: string, newPriority: number) => void;
}

export const CompetitorList: React.FC<CompetitorListProps> = ({
  competitors,
  monitoredAppId,
  organizationId,
  onCompetitorRemoved,
  onCompetitorPriorityChanged,
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<SavedCompetitor | null>(null);
  const [togglingPriorityId, setTogglingPriorityId] = useState<string | null>(null);

  // Handler: Remove competitor
  const handleRemoveCompetitor = async (competitor: SavedCompetitor) => {
    setRemovingId(competitor.relationshipId);

    try {
      console.log('[CompetitorList] Removing competitor:', competitor.name);

      // Delete relationship from app_competitors
      const { error: deleteError } = await supabase
        .from('app_competitors')
        .delete()
        .eq('id', competitor.relationshipId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Invalidate cache for this target app
      const { error: cacheError } = await supabase.rpc('invalidate_comparison_cache', {
        p_target_app_id: monitoredAppId,
      });

      if (cacheError) {
        console.warn('[CompetitorList] Failed to invalidate cache:', cacheError);
        // Don't fail the entire operation
      }

      toast.success(`Removed ${competitor.name} from competitors`);

      // Notify parent to update state and re-run analysis
      onCompetitorRemoved(competitor.appStoreId);
    } catch (error: any) {
      console.error('[CompetitorList] Error removing competitor:', error);
      toast.error(`Failed to remove competitor: ${error.message}`);
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  // Handler: Toggle favorite/primary status
  const handleTogglePriority = async (competitor: SavedCompetitor) => {
    setTogglingPriorityId(competitor.relationshipId);

    try {
      const newPriority = competitor.priority === 1 ? 2 : 1;

      console.log('[CompetitorList] Toggling priority for:', competitor.name, 'to', newPriority);

      // Update priority in app_competitors
      const { error: updateError } = await supabase
        .from('app_competitors')
        .update({ priority: newPriority })
        .eq('id', competitor.relationshipId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const action = newPriority === 1 ? 'marked as primary' : 'unmarked as primary';
      toast.success(`${competitor.name} ${action}`);

      // Notify parent to update state
      onCompetitorPriorityChanged(competitor.appStoreId, newPriority);
    } catch (error: any) {
      console.error('[CompetitorList] Error updating priority:', error);
      toast.error(`Failed to update priority: ${error.message}`);
    } finally {
      setTogglingPriorityId(null);
    }
  };

  if (competitors.length === 0) {
    return null;
  }

  // Sort by priority (primary first), then by name
  const sortedCompetitors = [...competitors].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority; // 1 before 2
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            Saved Competitors ({competitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedCompetitors.map((competitor) => (
              <div
                key={competitor.relationshipId}
                className="flex items-center gap-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                {/* App Icon */}
                {competitor.iconUrl ? (
                  <img
                    src={competitor.iconUrl}
                    alt={competitor.name}
                    className="h-10 w-10 rounded-lg"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-500 text-xs">
                    ?
                  </div>
                )}

                {/* App Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {competitor.name}
                    </p>
                    {competitor.priority === 1 && (
                      <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  {competitor.developer && (
                    <p className="text-xs text-zinc-500 truncate">{competitor.developer}</p>
                  )}
                  {competitor.lastComparedAt && (
                    <p className="text-xs text-zinc-600">
                      Last analyzed: {new Date(competitor.lastComparedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePriority(competitor)}
                    disabled={togglingPriorityId === competitor.relationshipId}
                    className="text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800"
                    title={competitor.priority === 1 ? "Unmark as primary" : "Mark as primary"}
                  >
                    {competitor.priority === 1 ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRemove(competitor)}
                    disabled={removingId === competitor.relationshipId}
                    className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                    title="Remove competitor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-200">Remove Competitor?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to remove <strong className="text-zinc-200">{confirmRemove?.name}</strong> from your competitors list?
              <br />
              <br />
              This will delete the relationship and invalidate cached comparison results. You can always add them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && handleRemoveCompetitor(confirmRemove)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
