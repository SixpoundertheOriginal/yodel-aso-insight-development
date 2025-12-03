/**
 * Draft LocalStorage Utilities
 *
 * Handles auto-save functionality for metadata drafts using browser localStorage.
 * Provides fast, client-side persistence that complements database storage.
 *
 * Storage Strategy:
 * - Auto-save every 2 seconds to localStorage (fast, no network)
 * - Manual "Save to Cloud" uses database (persistent, cross-device)
 * - On page load, check both sources and use newest
 *
 * Storage Keys:
 * - draft:{appId}:{draftType} - Main draft data
 * - draft:{appId}:{draftType}:timestamp - Last save timestamp
 * - draft:{appId}:{draftType}:label - Draft label (if any)
 */

import type { SaveDraftRequest } from '@/services/metadataDraftService';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type LocalDraftType = 'keywords' | 'single-locale' | 'multi-locale';

/**
 * LocalStorage draft record
 */
export interface LocalStorageDraft {
  appId: string;
  organizationId: string;
  draftType: LocalDraftType;
  draftLabel: string | null;
  draftData: any; // Same structure as SaveDraftRequest['draftData']
  savedAt: string; // ISO timestamp
}

// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_PREFIX = 'yodel_draft';
const TIMESTAMP_SUFFIX = 'timestamp';
const LABEL_SUFFIX = 'label';
const ORG_SUFFIX = 'org';

// ============================================================
// LOCAL STORAGE UTILITIES
// ============================================================

export class DraftStorage {
  /**
   * Save draft to localStorage (auto-save)
   *
   * @param appId - App Store ID
   * @param organizationId - Organization ID
   * @param draftType - Type of draft
   * @param draftData - Draft content
   * @param draftLabel - Optional label
   */
  static save(
    appId: string,
    organizationId: string,
    draftType: LocalDraftType,
    draftData: any,
    draftLabel?: string | null
  ): void {
    try {
      const key = this.getStorageKey(appId, draftType);
      const timestampKey = this.getTimestampKey(appId, draftType);
      const labelKey = this.getLabelKey(appId, draftType);
      const orgKey = this.getOrgKey(appId, draftType);
      const now = new Date().toISOString();

      // Save draft data
      localStorage.setItem(key, JSON.stringify(draftData));

      // Save timestamp
      localStorage.setItem(timestampKey, now);

      // Save organization ID
      localStorage.setItem(orgKey, organizationId);

      // Save label if provided
      if (draftLabel) {
        localStorage.setItem(labelKey, draftLabel);
      } else {
        localStorage.removeItem(labelKey);
      }

      console.log('[DRAFT-STORAGE] Saved to localStorage:', {
        appId,
        type: draftType,
        label: draftLabel,
        timestamp: now,
      });
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error saving to localStorage:', err);
      // localStorage might be full or disabled
    }
  }

  /**
   * Load draft from localStorage
   *
   * @param appId - App Store ID
   * @param draftType - Type of draft
   * @returns Draft record or null if not found
   */
  static load(appId: string, draftType: LocalDraftType): LocalStorageDraft | null {
    try {
      const key = this.getStorageKey(appId, draftType);
      const timestampKey = this.getTimestampKey(appId, draftType);
      const labelKey = this.getLabelKey(appId, draftType);
      const orgKey = this.getOrgKey(appId, draftType);

      const draftDataString = localStorage.getItem(key);
      const timestamp = localStorage.getItem(timestampKey);
      const label = localStorage.getItem(labelKey);
      const organizationId = localStorage.getItem(orgKey);

      if (!draftDataString || !timestamp || !organizationId) {
        console.log('[DRAFT-STORAGE] No draft found in localStorage:', { appId, draftType });
        return null;
      }

      const draftData = JSON.parse(draftDataString);

      console.log('[DRAFT-STORAGE] Loaded from localStorage:', {
        appId,
        type: draftType,
        label,
        timestamp,
      });

      return {
        appId,
        organizationId,
        draftType,
        draftLabel: label,
        draftData,
        savedAt: timestamp,
      };
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error loading from localStorage:', err);
      return null;
    }
  }

  /**
   * Get timestamp of last save
   *
   * @param appId - App Store ID
   * @param draftType - Type of draft
   * @returns ISO timestamp string or null if not found
   */
  static getTimestamp(appId: string, draftType: LocalDraftType): string | null {
    try {
      const timestampKey = this.getTimestampKey(appId, draftType);
      return localStorage.getItem(timestampKey);
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error getting timestamp:', err);
      return null;
    }
  }

  /**
   * Check if a draft exists in localStorage
   *
   * @param appId - App Store ID
   * @param draftType - Type of draft
   * @returns True if draft exists
   */
  static exists(appId: string, draftType: LocalDraftType): boolean {
    try {
      const key = this.getStorageKey(appId, draftType);
      return localStorage.getItem(key) !== null;
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error checking existence:', err);
      return false;
    }
  }

  /**
   * Clear draft from localStorage
   *
   * @param appId - App Store ID
   * @param draftType - Type of draft
   */
  static clear(appId: string, draftType: LocalDraftType): void {
    try {
      const key = this.getStorageKey(appId, draftType);
      const timestampKey = this.getTimestampKey(appId, draftType);
      const labelKey = this.getLabelKey(appId, draftType);
      const orgKey = this.getOrgKey(appId, draftType);

      localStorage.removeItem(key);
      localStorage.removeItem(timestampKey);
      localStorage.removeItem(labelKey);
      localStorage.removeItem(orgKey);

      console.log('[DRAFT-STORAGE] Cleared from localStorage:', { appId, draftType });
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error clearing localStorage:', err);
    }
  }

  /**
   * Clear all drafts for a specific app
   *
   * @param appId - App Store ID
   */
  static clearAllForApp(appId: string): void {
    try {
      const types: LocalDraftType[] = ['keywords', 'single-locale', 'multi-locale'];
      types.forEach((type) => this.clear(appId, type));
      console.log('[DRAFT-STORAGE] Cleared all drafts for app:', appId);
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error clearing all drafts:', err);
    }
  }

  /**
   * List all draft keys in localStorage (for debugging)
   *
   * @returns Array of storage keys
   */
  static listAllDrafts(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error listing drafts:', err);
      return [];
    }
  }

  /**
   * Get storage usage info (for debugging)
   *
   * @returns Object with storage info
   */
  static getStorageInfo(): { totalKeys: number; draftKeys: number; sizeEstimate: string } {
    try {
      const totalKeys = localStorage.length;
      const draftKeys = this.listAllDrafts().length;

      // Estimate size
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          totalSize += key.length + (value?.length || 0);
        }
      }

      const sizeEstimate = `${(totalSize / 1024).toFixed(2)} KB`;

      return { totalKeys, draftKeys, sizeEstimate };
    } catch (err) {
      console.error('[DRAFT-STORAGE] Error getting storage info:', err);
      return { totalKeys: 0, draftKeys: 0, sizeEstimate: '0 KB' };
    }
  }

  /**
   * Convert LocalStorageDraft to SaveDraftRequest format
   *
   * @param localDraft - Draft from localStorage
   * @returns SaveDraftRequest for database service
   */
  static toSaveDraftRequest(localDraft: LocalStorageDraft): SaveDraftRequest {
    return {
      appId: localDraft.appId,
      organizationId: localDraft.organizationId,
      draftType: localDraft.draftType,
      draftLabel: localDraft.draftLabel,
      draftData: localDraft.draftData,
    };
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Get storage key for draft data
   */
  private static getStorageKey(appId: string, draftType: LocalDraftType): string {
    return `${STORAGE_PREFIX}:${appId}:${draftType}`;
  }

  /**
   * Get storage key for timestamp
   */
  private static getTimestampKey(appId: string, draftType: LocalDraftType): string {
    return `${STORAGE_PREFIX}:${appId}:${draftType}:${TIMESTAMP_SUFFIX}`;
  }

  /**
   * Get storage key for label
   */
  private static getLabelKey(appId: string, draftType: LocalDraftType): string {
    return `${STORAGE_PREFIX}:${appId}:${draftType}:${LABEL_SUFFIX}`;
  }

  /**
   * Get storage key for organization ID
   */
  private static getOrgKey(appId: string, draftType: LocalDraftType): string {
    return `${STORAGE_PREFIX}:${appId}:${draftType}:${ORG_SUFFIX}`;
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Compare two timestamps and return the newer one
 *
 * @param timestamp1 - ISO timestamp string
 * @param timestamp2 - ISO timestamp string
 * @returns 'first' | 'second' | 'equal'
 */
export function compareTimestamps(
  timestamp1: string,
  timestamp2: string
): 'first' | 'second' | 'equal' {
  const date1 = new Date(timestamp1).getTime();
  const date2 = new Date(timestamp2).getTime();

  if (date1 > date2) return 'first';
  if (date2 > date1) return 'second';
  return 'equal';
}

/**
 * Format timestamp for display (e.g., "2 minutes ago")
 *
 * @param timestamp - ISO timestamp string
 * @returns Human-readable time string
 */
export function formatTimeAgo(timestamp: string): string {
  try {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour === 1) return '1 hour ago';
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay === 1) return '1 day ago';
    return `${diffDay} days ago`;
  } catch (err) {
    return 'unknown';
  }
}

/**
 * Check if localStorage is available (not disabled/full)
 *
 * @returns True if localStorage is usable
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__yodel_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    console.warn('[DRAFT-STORAGE] localStorage is not available:', err);
    return false;
  }
}
