/**
 * Draft Restore Prompt
 *
 * Shows a banner when drafts are detected on page load.
 * Allows user to choose which draft to restore (local vs cloud)
 * or discard all drafts.
 *
 * Appears at the top of the Optimization Lab when drafts exist.
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Cloud, HardDrive, X } from 'lucide-react';
import { formatTimeAgo, compareTimestamps } from '@/utils/draftStorage';
import type { LocalStorageDraft } from '@/utils/draftStorage';
import type { MetadataDraft } from '@/services/metadataDraftService';

export interface DraftRestorePromptProps {
  localDraft: LocalStorageDraft | null;
  cloudDraft: MetadataDraft | null;
  onRestoreLocal: () => void;
  onRestoreCloud: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export const DraftRestorePrompt: React.FC<DraftRestorePromptProps> = ({
  localDraft,
  cloudDraft,
  onRestoreLocal,
  onRestoreCloud,
  onDiscard,
  onClose,
}) => {
  // If no drafts, don't show
  if (!localDraft && !cloudDraft) {
    return null;
  }

  // Determine which draft is newer
  const comparison =
    localDraft && cloudDraft
      ? compareTimestamps(cloudDraft.updatedAt, localDraft.savedAt)
      : null;

  const newerDraft = comparison === 'first' ? 'cloud' : comparison === 'second' ? 'local' : 'equal';

  return (
    <Alert className="border-amber-400/30 bg-amber-500/10 mb-6">
      <AlertCircle className="h-4 w-4 text-amber-400" />
      <AlertDescription className="ml-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-200 mb-2">
              You have unsaved work from a previous session
            </p>

            {/* Draft info */}
            <div className="space-y-2 text-xs text-amber-300/80">
              {localDraft && (
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3 w-3" />
                  <span>
                    Local draft: {formatTimeAgo(localDraft.savedAt)}
                    {newerDraft === 'local' && (
                      <span className="ml-2 text-emerald-400 font-medium">(newer)</span>
                    )}
                  </span>
                </div>
              )}
              {cloudDraft && (
                <div className="flex items-center gap-2">
                  <Cloud className="h-3 w-3" />
                  <span>
                    Cloud draft: {formatTimeAgo(cloudDraft.updatedAt)}
                    {newerDraft === 'cloud' && (
                      <span className="ml-2 text-emerald-400 font-medium">(newer)</span>
                    )}
                  </span>
                </div>
              )}
              {newerDraft === 'equal' && (
                <p className="text-amber-400 italic">Both drafts have the same timestamp</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4">
              {localDraft && (
                <Button
                  onClick={onRestoreLocal}
                  size="sm"
                  variant="outline"
                  className="border-amber-400/40 text-amber-300 hover:text-amber-200 hover:border-amber-400/60 text-xs"
                >
                  <HardDrive className="h-3 w-3 mr-1" />
                  Restore Local
                </Button>
              )}
              {cloudDraft && (
                <Button
                  onClick={onRestoreCloud}
                  size="sm"
                  variant="outline"
                  className="border-amber-400/40 text-amber-300 hover:text-amber-200 hover:border-amber-400/60 text-xs"
                >
                  <Cloud className="h-3 w-3 mr-1" />
                  Restore Cloud
                </Button>
              )}
              <Button
                onClick={onDiscard}
                size="sm"
                variant="ghost"
                className="text-zinc-400 hover:text-zinc-300 text-xs"
              >
                Discard All
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="text-amber-400 hover:text-amber-300 ml-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
