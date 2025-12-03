/**
 * Metadata Draft Service
 *
 * Handles CRUD operations for metadata drafts stored in Supabase database.
 * Supports three draft types: keywords, single-locale, multi-locale
 *
 * Features:
 * - Save drafts to database (manual "Save to Cloud")
 * - Load drafts from database
 * - List all drafts for a user + app
 * - Delete drafts
 * - Check for existing drafts (for restore prompts)
 */

import { supabase } from '@/integrations/supabase/client';
import type { LocaleMetadata, MultiLocaleIndexation } from '@/types/multiLocaleMetadata';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type { MetadataDeltas, TextDiff } from '@/components/AppAudit/MetadataOptimizationPanel/types';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type DraftType = 'keywords' | 'single-locale' | 'multi-locale';

/**
 * Base draft metadata (common fields)
 */
export interface BaseDraft {
  id: string;
  userId: string;
  organizationId: string;
  appId: string;
  draftType: DraftType;
  draftLabel: string | null; // User-provided name (e.g., "Holiday Campaign")
  createdAt: string;
  updatedAt: string;
}

/**
 * Keywords-only draft
 */
export interface KeywordsDraft extends BaseDraft {
  draftType: 'keywords';
  draftData: {
    keywords: string; // Raw keywords input
    confirmedKeywords: string; // Confirmed/parsed keywords
  };
}

/**
 * Single-Locale Optimization draft
 */
export interface SingleLocaleDraft extends BaseDraft {
  draftType: 'single-locale';
  draftData: {
    title: string;
    subtitle: string;
    keywords: string;
    auditResult?: UnifiedMetadataAuditResult; // Optional: for historical comparison
    deltas?: MetadataDeltas; // Optional: comparison deltas
    textDiff?: TextDiff; // Optional: diff view data
  };
}

/**
 * Multi-Locale Indexation draft
 */
export interface MultiLocaleDraft extends BaseDraft {
  draftType: 'multi-locale';
  draftData: {
    locales: LocaleMetadata[]; // All 10 locales
    multiLocaleResult?: MultiLocaleIndexation; // Optional: full audit result
  };
}

/**
 * Union type for all draft types
 */
export type MetadataDraft = KeywordsDraft | SingleLocaleDraft | MultiLocaleDraft;

/**
 * Draft save request (without ID/timestamps)
 */
export interface SaveDraftRequest {
  appId: string;
  organizationId: string;
  draftType: DraftType;
  draftLabel?: string | null;
  draftData: KeywordsDraft['draftData'] | SingleLocaleDraft['draftData'] | MultiLocaleDraft['draftData'];
}

/**
 * Draft list response
 */
export interface DraftSummary {
  id: string;
  draftType: DraftType;
  draftLabel: string | null;
  updatedAt: string;
  createdAt: string;
}

// ============================================================
// METADATA DRAFT SERVICE
// ============================================================

export class MetadataDraftService {
  /**
   * Save a draft to the database (manual "Save to Cloud")
   *
   * Uses upsert logic: if a draft with the same (user, app, type, label) exists,
   * it will be updated; otherwise, a new draft is created.
   *
   * @param request - Draft save request
   * @returns Saved draft with ID and timestamps
   */
  static async saveDraft(request: SaveDraftRequest): Promise<MetadataDraft | null> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[DRAFT-SERVICE] Error getting user:', userError);
        return null;
      }

      // Prepare draft record
      const draftRecord = {
        user_id: user.id,
        organization_id: request.organizationId,
        app_id: request.appId,
        draft_type: request.draftType,
        draft_label: request.draftLabel || null,
        draft_data: request.draftData,
      };

      console.log('[DRAFT-SERVICE] Saving draft:', {
        appId: request.appId,
        type: request.draftType,
        label: request.draftLabel,
      });

      // Upsert draft (update if exists, insert if not)
      const { data, error } = await supabase
        .from('metadata_drafts')
        .upsert(draftRecord, {
          onConflict: 'user_id,app_id,draft_type,draft_label',
        })
        .select()
        .single();

      if (error) {
        console.error('[DRAFT-SERVICE] Error saving draft:', error);
        return null;
      }

      console.log('[DRAFT-SERVICE] Draft saved successfully:', data.id);

      // Map database record to MetadataDraft
      return this.mapDatabaseRecordToDraft(data);
    } catch (err) {
      console.error('[DRAFT-SERVICE] Unexpected error saving draft:', err);
      return null;
    }
  }

  /**
   * Load a specific draft by ID
   *
   * @param draftId - Draft UUID
   * @returns Draft record or null if not found
   */
  static async loadDraft(draftId: string): Promise<MetadataDraft | null> {
    try {
      console.log('[DRAFT-SERVICE] Loading draft:', draftId);

      const { data, error } = await supabase
        .from('metadata_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) {
        console.error('[DRAFT-SERVICE] Error loading draft:', error);
        return null;
      }

      if (!data) {
        console.warn('[DRAFT-SERVICE] Draft not found:', draftId);
        return null;
      }

      return this.mapDatabaseRecordToDraft(data);
    } catch (err) {
      console.error('[DRAFT-SERVICE] Unexpected error loading draft:', err);
      return null;
    }
  }

  /**
   * Load the most recent draft for a specific app + type
   *
   * @param appId - App Store ID
   * @param draftType - Type of draft
   * @param draftLabel - Optional label filter (for named drafts)
   * @returns Most recent draft or null if not found
   */
  static async loadLatestDraft(
    appId: string,
    draftType: DraftType,
    draftLabel?: string | null
  ): Promise<MetadataDraft | null> {
    try {
      console.log('[DRAFT-SERVICE] Loading latest draft:', { appId, draftType, draftLabel });

      let query = supabase
        .from('metadata_drafts')
        .select('*')
        .eq('app_id', appId)
        .eq('draft_type', draftType)
        .order('updated_at', { ascending: false })
        .limit(1);

      // Filter by label if provided
      if (draftLabel !== undefined) {
        if (draftLabel === null) {
          query = query.is('draft_label', null);
        } else {
          query = query.eq('draft_label', draftLabel);
        }
      }

      const { data, error } = await query.single();

      if (error) {
        // Not found is expected, don't log as error
        if (error.code === 'PGRST116') {
          console.log('[DRAFT-SERVICE] No draft found for:', { appId, draftType, draftLabel });
          return null;
        }
        console.error('[DRAFT-SERVICE] Error loading latest draft:', error);
        return null;
      }

      return this.mapDatabaseRecordToDraft(data);
    } catch (err) {
      console.error('[DRAFT-SERVICE] Unexpected error loading latest draft:', err);
      return null;
    }
  }

  /**
   * List all drafts for a specific app (current user only)
   *
   * @param appId - App Store ID
   * @returns Array of draft summaries (sorted by most recent first)
   */
  static async listDraftsForApp(appId: string): Promise<DraftSummary[]> {
    try {
      console.log('[DRAFT-SERVICE] Listing drafts for app:', appId);

      const { data, error } = await supabase
        .from('metadata_drafts')
        .select('id, draft_type, draft_label, created_at, updated_at')
        .eq('app_id', appId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[DRAFT-SERVICE] Error listing drafts:', error);
        return [];
      }

      return data.map((record) => ({
        id: record.id,
        draftType: record.draft_type as DraftType,
        draftLabel: record.draft_label,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      }));
    } catch (err) {
      console.error('[DRAFT-SERVICE] Unexpected error listing drafts:', err);
      return [];
    }
  }

  /**
   * Delete a draft by ID
   *
   * @param draftId - Draft UUID
   * @returns True if deleted successfully, false otherwise
   */
  static async deleteDraft(draftId: string): Promise<boolean> {
    try {
      console.log('[DRAFT-SERVICE] Deleting draft:', draftId);

      const { error } = await supabase
        .from('metadata_drafts')
        .delete()
        .eq('id', draftId);

      if (error) {
        console.error('[DRAFT-SERVICE] Error deleting draft:', error);
        return false;
      }

      console.log('[DRAFT-SERVICE] Draft deleted successfully:', draftId);
      return true;
    } catch (err) {
      console.error('[DRAFT-SERVICE] Unexpected error deleting draft:', err);
      return false;
    }
  }

  /**
   * Check if user has any recent drafts for an app (within last 24 hours)
   *
   * Useful for showing "You have unsaved work" prompts
   *
   * @param appId - App Store ID
   * @returns True if recent drafts exist
   */
  static async hasRecentDrafts(appId: string): Promise<boolean> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('metadata_drafts')
        .select('id')
        .eq('app_id', appId)
        .gte('updated_at', twentyFourHoursAgo)
        .limit(1);

      if (error) {
        console.error('[DRAFT-SERVICE] Error checking recent drafts:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (err) {
      console.error('[DRAFT-SERVICE] Unexpected error checking recent drafts:', err);
      return false;
    }
  }

  /**
   * Delete all drafts for a specific app (useful for cleanup)
   *
   * @param appId - App Store ID
   * @returns Number of drafts deleted
   */
  static async deleteAllDraftsForApp(appId: string): Promise<number> {
    try {
      console.log('[DRAFT-SERVICE] Deleting all drafts for app:', appId);

      // First, count how many will be deleted
      const { count } = await supabase
        .from('metadata_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('app_id', appId);

      // Then delete them
      const { error } = await supabase
        .from('metadata_drafts')
        .delete()
        .eq('app_id', appId);

      if (error) {
        console.error('[DRAFT-SERVICE] Error deleting all drafts:', error);
        return 0;
      }

      console.log('[DRAFT-SERVICE] Deleted drafts:', count || 0);
      return count || 0;
    } catch (err) {
      console.error('[DRAFT-SERVICE] Unexpected error deleting all drafts:', err);
      return 0;
    }
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Map database record to typed MetadataDraft
   */
  private static mapDatabaseRecordToDraft(record: any): MetadataDraft {
    return {
      id: record.id,
      userId: record.user_id,
      organizationId: record.organization_id,
      appId: record.app_id,
      draftType: record.draft_type as DraftType,
      draftLabel: record.draft_label,
      draftData: record.draft_data,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    } as MetadataDraft;
  }
}
