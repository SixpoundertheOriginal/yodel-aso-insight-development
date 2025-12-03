/**
 * useMetadataDraft Hook
 *
 * React hook for managing metadata drafts with hybrid storage:
 * - Auto-save to localStorage every 2 seconds (fast, no network)
 * - Manual save to database (persistent, cross-device)
 * - Load from both sources and use newest
 * - Merge conflict resolution
 *
 * Usage:
 * ```tsx
 * const {
 *   draft,
 *   saveDraftToCloud,
 *   loadDraftFromCloud,
 *   clearDraft,
 *   lastSaved,
 *   hasUnsavedChanges,
 *   isSaving,
 *   error,
 * } = useMetadataDraft(appId, organizationId, 'single-locale');
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MetadataDraftService, type DraftType, type MetadataDraft } from '@/services/metadataDraftService';
import { DraftStorage, compareTimestamps, type LocalStorageDraft } from '@/utils/draftStorage';
import { toast } from 'sonner';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface UseMetadataDraftOptions {
  appId: string;
  organizationId: string;
  draftType: DraftType;
  draftLabel?: string | null; // Optional label for named drafts
  autoSaveEnabled?: boolean; // Default: true
  autoSaveDelay?: number; // Default: 2000ms (2 seconds)
}

export interface UseMetadataDraftReturn {
  // Draft state
  draft: any | null; // Current draft data
  cloudDraft: MetadataDraft | null; // Draft from database (if loaded)
  localDraft: LocalStorageDraft | null; // Draft from localStorage (if loaded)

  // Timestamps
  lastSaved: string | null; // ISO timestamp of last save (local or cloud)
  lastLocalSave: string | null; // ISO timestamp of last localStorage save
  lastCloudSave: string | null; // ISO timestamp of last database save

  // Status flags
  hasUnsavedChanges: boolean; // True if draft differs from last save
  isSaving: boolean; // True during database save
  isLoading: boolean; // True during initial load
  error: string | null; // Error message if any

  // Actions
  updateDraft: (data: any) => void; // Update draft (triggers auto-save)
  saveDraftToCloud: () => Promise<boolean>; // Manual save to database
  loadDraftFromCloud: () => Promise<void>; // Load from database
  loadDraftFromLocal: () => void; // Load from localStorage
  loadNewestDraft: () => Promise<void>; // Load from both sources, use newest
  clearDraft: () => void; // Clear draft from both storages
  clearLocalDraft: () => void; // Clear only localStorage
  clearCloudDraft: () => Promise<boolean>; // Clear only database
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useMetadataDraft({
  appId,
  organizationId,
  draftType,
  draftLabel = null,
  autoSaveEnabled = true,
  autoSaveDelay = 2000,
}: UseMetadataDraftOptions): UseMetadataDraftReturn {
  // State
  const [draft, setDraft] = useState<any | null>(null);
  const [cloudDraft, setCloudDraft] = useState<MetadataDraft | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalStorageDraft | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastLocalSave, setLastLocalSave] = useState<string | null>(null);
  const [lastCloudSave, setLastCloudSave] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for auto-save debouncing
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDraftRef = useRef<any>(null);

  // ============================================================
  // LOAD OPERATIONS
  // ============================================================

  /**
   * Load draft from localStorage
   */
  const loadDraftFromLocal = useCallback(() => {
    console.log('[USE-DRAFT] Loading from localStorage...');
    const local = DraftStorage.load(appId, draftType);
    if (local) {
      setLocalDraft(local);
      setDraft(local.draftData);
      setLastLocalSave(local.savedAt);
      setLastSaved(local.savedAt);
      setHasUnsavedChanges(false);
      console.log('[USE-DRAFT] Loaded from localStorage:', local.savedAt);
    } else {
      console.log('[USE-DRAFT] No draft found in localStorage');
    }
  }, [appId, draftType]);

  /**
   * Load draft from database
   */
  const loadDraftFromCloud = useCallback(async () => {
    console.log('[USE-DRAFT] Loading from database...');
    setIsLoading(true);
    setError(null);

    try {
      const cloud = await MetadataDraftService.loadLatestDraft(appId, draftType, draftLabel);
      if (cloud) {
        setCloudDraft(cloud);
        setDraft(cloud.draftData);
        setLastCloudSave(cloud.updatedAt);
        setLastSaved(cloud.updatedAt);
        setHasUnsavedChanges(false);
        console.log('[USE-DRAFT] Loaded from database:', cloud.updatedAt);
      } else {
        console.log('[USE-DRAFT] No draft found in database');
      }
    } catch (err) {
      const errorMsg = 'Failed to load draft from database';
      console.error('[USE-DRAFT]', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [appId, draftType, draftLabel]);

  /**
   * Load from both sources and use the newest
   * If timestamps match, prefer cloud (more authoritative)
   */
  const loadNewestDraft = useCallback(async () => {
    console.log('[USE-DRAFT] Loading newest draft from both sources...');
    setIsLoading(true);
    setError(null);

    try {
      // Load from both sources in parallel
      const [cloud, local] = await Promise.all([
        MetadataDraftService.loadLatestDraft(appId, draftType, draftLabel),
        Promise.resolve(DraftStorage.load(appId, draftType)),
      ]);

      setCloudDraft(cloud);
      setLocalDraft(local);

      // Determine which is newest
      if (cloud && local) {
        const comparison = compareTimestamps(cloud.updatedAt, local.savedAt);
        if (comparison === 'first') {
          // Cloud is newer
          console.log('[USE-DRAFT] Using cloud draft (newer):', cloud.updatedAt);
          setDraft(cloud.draftData);
          setLastSaved(cloud.updatedAt);
          setLastCloudSave(cloud.updatedAt);
          setLastLocalSave(local.savedAt);
        } else {
          // Local is newer or equal (prefer cloud if equal)
          if (comparison === 'equal') {
            console.log('[USE-DRAFT] Using cloud draft (equal timestamps):', cloud.updatedAt);
            setDraft(cloud.draftData);
            setLastSaved(cloud.updatedAt);
          } else {
            console.log('[USE-DRAFT] Using local draft (newer):', local.savedAt);
            setDraft(local.draftData);
            setLastSaved(local.savedAt);
          }
          setLastCloudSave(cloud.updatedAt);
          setLastLocalSave(local.savedAt);
        }
        setHasUnsavedChanges(false);
      } else if (cloud) {
        // Only cloud exists
        console.log('[USE-DRAFT] Using cloud draft (only source):', cloud.updatedAt);
        setDraft(cloud.draftData);
        setLastSaved(cloud.updatedAt);
        setLastCloudSave(cloud.updatedAt);
        setHasUnsavedChanges(false);
      } else if (local) {
        // Only local exists
        console.log('[USE-DRAFT] Using local draft (only source):', local.savedAt);
        setDraft(local.draftData);
        setLastSaved(local.savedAt);
        setLastLocalSave(local.savedAt);
        setHasUnsavedChanges(false);
      } else {
        console.log('[USE-DRAFT] No draft found in either source');
      }
    } catch (err) {
      const errorMsg = 'Failed to load draft';
      console.error('[USE-DRAFT]', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [appId, draftType, draftLabel]);

  // ============================================================
  // SAVE OPERATIONS
  // ============================================================

  /**
   * Auto-save to localStorage (debounced)
   */
  const autoSaveToLocal = useCallback(
    (draftData: any) => {
      if (!autoSaveEnabled) return;

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('[USE-DRAFT] Auto-saving to localStorage...');
        DraftStorage.save(appId, organizationId, draftType, draftData, draftLabel);
        const timestamp = new Date().toISOString();
        setLastLocalSave(timestamp);
        setLastSaved(timestamp);
        setHasUnsavedChanges(false);
      }, autoSaveDelay);
    },
    [appId, organizationId, draftType, draftLabel, autoSaveEnabled, autoSaveDelay]
  );

  /**
   * Update draft (triggers auto-save)
   */
  const updateDraft = useCallback(
    (data: any) => {
      console.log('[USE-DRAFT] Draft updated');
      setDraft(data);
      setHasUnsavedChanges(true);
      previousDraftRef.current = data;

      // Trigger auto-save
      autoSaveToLocal(data);
    },
    [autoSaveToLocal]
  );

  /**
   * Manual save to database
   */
  const saveDraftToCloud = useCallback(async (): Promise<boolean> => {
    if (!draft) {
      console.warn('[USE-DRAFT] No draft to save');
      return false;
    }

    console.log('[USE-DRAFT] Saving to database...');
    setIsSaving(true);
    setError(null);

    try {
      const savedDraft = await MetadataDraftService.saveDraft({
        appId,
        organizationId,
        draftType,
        draftLabel,
        draftData: draft,
      });

      if (savedDraft) {
        setCloudDraft(savedDraft);
        setLastCloudSave(savedDraft.updatedAt);
        setLastSaved(savedDraft.updatedAt);
        setHasUnsavedChanges(false);
        console.log('[USE-DRAFT] Saved to database:', savedDraft.id);
        toast.success('Draft saved to cloud');
        return true;
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (err) {
      const errorMsg = 'Failed to save draft to cloud';
      console.error('[USE-DRAFT]', errorMsg, err);
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [draft, appId, organizationId, draftType, draftLabel]);

  // ============================================================
  // CLEAR OPERATIONS
  // ============================================================

  /**
   * Clear draft from localStorage only
   */
  const clearLocalDraft = useCallback(() => {
    console.log('[USE-DRAFT] Clearing local draft...');
    DraftStorage.clear(appId, draftType);
    setLocalDraft(null);
    setLastLocalSave(null);
    if (!cloudDraft) {
      setDraft(null);
      setLastSaved(null);
      setHasUnsavedChanges(false);
    }
  }, [appId, draftType, cloudDraft]);

  /**
   * Clear draft from database only
   */
  const clearCloudDraft = useCallback(async (): Promise<boolean> => {
    if (!cloudDraft) {
      console.warn('[USE-DRAFT] No cloud draft to clear');
      return false;
    }

    console.log('[USE-DRAFT] Clearing cloud draft...');
    const success = await MetadataDraftService.deleteDraft(cloudDraft.id);
    if (success) {
      setCloudDraft(null);
      setLastCloudSave(null);
      if (!localDraft) {
        setDraft(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
      }
      toast.success('Draft deleted from cloud');
      return true;
    } else {
      toast.error('Failed to delete draft from cloud');
      return false;
    }
  }, [cloudDraft, localDraft]);

  /**
   * Clear draft from both storages
   */
  const clearDraft = useCallback(() => {
    console.log('[USE-DRAFT] Clearing draft from all sources...');
    clearLocalDraft();
    if (cloudDraft) {
      clearCloudDraft();
    }
    setDraft(null);
    setLastSaved(null);
    setHasUnsavedChanges(false);
  }, [clearLocalDraft, clearCloudDraft, cloudDraft]);

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    // Cleanup auto-save timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Draft state
    draft,
    cloudDraft,
    localDraft,

    // Timestamps
    lastSaved,
    lastLocalSave,
    lastCloudSave,

    // Status flags
    hasUnsavedChanges,
    isSaving,
    isLoading,
    error,

    // Actions
    updateDraft,
    saveDraftToCloud,
    loadDraftFromCloud,
    loadDraftFromLocal,
    loadNewestDraft,
    clearDraft,
    clearLocalDraft,
    clearCloudDraft,
  };
}
