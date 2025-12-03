/**
 * Draft Manager
 *
 * Main component for managing drafts in the Optimization Lab.
 * Shows draft status and provides save/load controls.
 *
 * Usage:
 * ```tsx
 * <DraftManager
 *   appId={appId}
 *   organizationId={organizationId}
 *   draftType="single-locale"
 *   onDraftLoaded={(draft) => { ... }}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, RefreshCw } from 'lucide-react';
import { useMetadataDraft } from '@/hooks/useMetadataDraft';
import { DraftStatusBadge } from './DraftStatusBadge';
import { DraftRestorePrompt } from './DraftRestorePrompt';
import type { DraftType } from '@/services/metadataDraftService';

export interface DraftManagerProps {
  appId: string;
  organizationId: string;
  draftType: DraftType;
  draftData: any | null; // Current draft data from parent component
  onDraftLoaded?: (data: any) => void; // Callback when draft is restored
  onDraftCleared?: () => void; // Callback when draft is cleared
  className?: string;
}

export const DraftManager: React.FC<DraftManagerProps> = ({
  appId,
  organizationId,
  draftType,
  draftData,
  onDraftLoaded,
  onDraftCleared,
  className = '',
}) => {
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [hasCheckedForDrafts, setHasCheckedForDrafts] = useState(false);

  const {
    draft,
    cloudDraft,
    localDraft,
    lastSaved,
    lastLocalSave,
    lastCloudSave,
    hasUnsavedChanges,
    isSaving,
    updateDraft,
    saveDraftToCloud,
    loadDraftFromCloud,
    loadDraftFromLocal,
    loadNewestDraft,
    clearDraft,
  } = useMetadataDraft({
    appId,
    organizationId,
    draftType,
    autoSaveEnabled: true,
    autoSaveDelay: 2000, // 2 seconds
  });

  // Check for existing drafts on mount
  useEffect(() => {
    if (!hasCheckedForDrafts) {
      loadNewestDraft().then(() => {
        setHasCheckedForDrafts(true);
        // Show restore prompt if drafts exist
        if (localDraft || cloudDraft) {
          setShowRestorePrompt(true);
        }
      });
    }
  }, [hasCheckedForDrafts, loadNewestDraft, localDraft, cloudDraft]);

  // Sync draft data from parent to hook (for auto-save)
  useEffect(() => {
    if (draftData && JSON.stringify(draftData) !== JSON.stringify(draft)) {
      updateDraft(draftData);
    }
  }, [draftData]);

  // Handle restore actions
  const handleRestoreLocal = () => {
    loadDraftFromLocal();
    if (localDraft && onDraftLoaded) {
      onDraftLoaded(localDraft.draftData);
    }
    setShowRestorePrompt(false);
  };

  const handleRestoreCloud = () => {
    loadDraftFromCloud();
    if (cloudDraft && onDraftLoaded) {
      onDraftLoaded(cloudDraft.draftData);
    }
    setShowRestorePrompt(false);
  };

  const handleDiscard = () => {
    clearDraft();
    if (onDraftCleared) {
      onDraftCleared();
    }
    setShowRestorePrompt(false);
  };

  const handleClosePrompt = () => {
    setShowRestorePrompt(false);
  };

  const handleSaveToCloud = async () => {
    await saveDraftToCloud();
  };

  const handleRefreshFromCloud = async () => {
    await loadDraftFromCloud();
    if (cloudDraft && onDraftLoaded) {
      onDraftLoaded(cloudDraft.draftData);
    }
  };

  // Determine if last save was to cloud
  const isCloudSaved = lastSaved === lastCloudSave;

  return (
    <div className={className}>
      {/* Restore Prompt (shows on page load if drafts exist) */}
      {showRestorePrompt && (
        <DraftRestorePrompt
          localDraft={localDraft}
          cloudDraft={cloudDraft}
          onRestoreLocal={handleRestoreLocal}
          onRestoreCloud={handleRestoreCloud}
          onDiscard={handleDiscard}
          onClose={handleClosePrompt}
        />
      )}

      {/* Draft Controls */}
      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <DraftStatusBadge
          lastSaved={lastSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isCloudSaved={isCloudSaved}
        />

        {/* Save to Cloud Button */}
        <Button
          onClick={handleSaveToCloud}
          disabled={isSaving || !draftData}
          size="sm"
          variant="outline"
          className="border-blue-400/40 text-blue-400 hover:text-blue-300 hover:border-blue-400/60 text-xs"
        >
          <Cloud className="h-3 w-3 mr-1" />
          {isSaving ? 'Saving...' : 'Save to Cloud'}
        </Button>

        {/* Refresh from Cloud Button (optional) */}
        {cloudDraft && (
          <Button
            onClick={handleRefreshFromCloud}
            size="sm"
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-300 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reload from Cloud
          </Button>
        )}
      </div>
    </div>
  );
};
