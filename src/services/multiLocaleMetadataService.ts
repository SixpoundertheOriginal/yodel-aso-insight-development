/**
 * Service for saving/loading multi-locale metadata
 */

import { supabase } from '@/integrations/supabase/client';
import type { MultiLocaleIndexation } from '@/types/multiLocaleMetadata';

export class MultiLocaleMetadataService {
  /**
   * Save multi-locale metadata to database
   */
  static async saveMultiLocaleMetadata(
    appId: string,
    organizationId: string,
    data: MultiLocaleIndexation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[MULTI-LOCALE-SERVICE] Saving metadata for app:', appId);

      const { error } = await supabase
        .from('monitored_apps')
        .update({
          multi_locale_metadata: data,
          updated_at: new Date().toISOString(),
        })
        .eq('app_id', appId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      console.log('[MULTI-LOCALE-SERVICE] ✓ Metadata saved successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[MULTI-LOCALE-SERVICE] ✗ Save error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load multi-locale metadata from database
   */
  static async loadMultiLocaleMetadata(
    appId: string,
    organizationId: string
  ): Promise<{ data: MultiLocaleIndexation | null; error?: string }> {
    try {
      console.log('[MULTI-LOCALE-SERVICE] Loading metadata for app:', appId);

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('multi_locale_metadata')
        .eq('app_id', appId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      console.log('[MULTI-LOCALE-SERVICE] ✓ Metadata loaded');
      return { data: data?.multi_locale_metadata || null };
    } catch (error: any) {
      console.error('[MULTI-LOCALE-SERVICE] ✗ Load error:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Delete multi-locale metadata
   */
  static async deleteMultiLocaleMetadata(
    appId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[MULTI-LOCALE-SERVICE] Deleting metadata for app:', appId);

      const { error } = await supabase
        .from('monitored_apps')
        .update({
          multi_locale_metadata: null,
        })
        .eq('app_id', appId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      console.log('[MULTI-LOCALE-SERVICE] ✓ Metadata deleted');
      return { success: true };
    } catch (error: any) {
      console.error('[MULTI-LOCALE-SERVICE] ✗ Delete error:', error);
      return { success: false, error: error.message };
    }
  }
}
