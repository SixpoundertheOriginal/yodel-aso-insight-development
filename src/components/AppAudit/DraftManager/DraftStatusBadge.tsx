/**
 * Draft Status Badge
 *
 * Shows the current draft save status:
 * - "Auto-saved X ago" (green)
 * - "Unsaved changes" (amber)
 * - "Saving..." (blue)
 * - "Saved to cloud" (emerald)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Cloud, Loader2 } from 'lucide-react';
import { formatTimeAgo } from '@/utils/draftStorage';

export interface DraftStatusBadgeProps {
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isCloudSaved: boolean; // True if last save was to cloud
}

export const DraftStatusBadge: React.FC<DraftStatusBadgeProps> = ({
  lastSaved,
  hasUnsavedChanges,
  isSaving,
  isCloudSaved,
}) => {
  // Saving state
  if (isSaving) {
    return (
      <Badge variant="outline" className="border-blue-400 text-blue-400 text-[10px]">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Saving to cloud...
      </Badge>
    );
  }

  // Unsaved changes
  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-400 text-[10px]">
        <AlertCircle className="h-3 w-3 mr-1" />
        Unsaved changes
      </Badge>
    );
  }

  // Saved to cloud
  if (isCloudSaved && lastSaved) {
    return (
      <Badge variant="outline" className="border-emerald-400 text-emerald-400 text-[10px]">
        <Cloud className="h-3 w-3 mr-1" />
        Saved to cloud {formatTimeAgo(lastSaved)}
      </Badge>
    );
  }

  // Auto-saved locally
  if (lastSaved) {
    return (
      <Badge variant="outline" className="border-green-400 text-green-400 text-[10px]">
        <CheckCircle className="h-3 w-3 mr-1" />
        Auto-saved {formatTimeAgo(lastSaved)}
      </Badge>
    );
  }

  // No draft yet
  return (
    <Badge variant="outline" className="border-zinc-600 text-zinc-500 text-[10px]">
      <Clock className="h-3 w-3 mr-1" />
      No draft
    </Badge>
  );
};
