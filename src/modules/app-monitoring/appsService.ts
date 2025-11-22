/**
 * Apps Service
 *
 * Manages monitored apps with audit support.
 * Handles CRUD operations for monitored_apps table with audit-specific fields.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MonitoredAppWithAudit } from './types';

/**
 * Input for creating/updating monitored app
 */
export interface UpsertMonitoredAppInput {
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  app_name: string;
  bundle_id?: string | null;
  app_icon_url?: string | null;
  developer_name?: string | null;
  category?: string | null;
  primary_country: string;
  monitor_type?: 'reviews' | 'ratings' | 'both' | 'audit';
  locale?: string;
  audit_enabled?: boolean;
  tags?: string[] | null;
  notes?: string | null;
}

/**
 * Update for audit-specific fields
 */
export interface UpdateAuditFieldsInput {
  latest_audit_score?: number | null;
  latest_audit_at?: string | null;
  metadata_last_refreshed_at?: string | null;
}

/**
 * Gets a monitored app by lookup parameters.
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param app_id - App ID (iTunes ID or Package ID)
 * @param platform - Platform
 * @returns Monitored app or null
 */
export async function getMonitoredApp(
  supabase: SupabaseClient,
  organization_id: string,
  app_id: string,
  platform: 'ios' | 'android'
): Promise<MonitoredAppWithAudit | null> {
  const { data, error } = await supabase
    .from('monitored_apps')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .eq('platform', platform)
    .maybeSingle();

  if (error) {
    console.error('[appsService] Error fetching monitored app:', error);
    throw new Error(`Failed to fetch monitored app: ${error.message}`);
  }

  return data as MonitoredAppWithAudit | null;
}

/**
 * Creates or updates a monitored app.
 * Uses upsert with unique constraint on (organization_id, app_id, platform).
 *
 * @param supabase - Supabase client
 * @param input - Monitored app data
 * @returns Created/updated monitored app
 */
export async function upsertMonitoredApp(
  supabase: SupabaseClient,
  input: UpsertMonitoredAppInput
): Promise<MonitoredAppWithAudit> {
  const {
    organization_id,
    app_id,
    platform,
    app_name,
    bundle_id,
    app_icon_url,
    developer_name,
    category,
    primary_country,
    monitor_type = 'audit',
    locale = 'us',
    audit_enabled = true,
    tags,
    notes
  } = input;

  const payload = {
    organization_id,
    app_id,
    platform,
    app_name,
    bundle_id: bundle_id || null,
    app_icon_url: app_icon_url || null,
    developer_name: developer_name || null,
    category: category || null,
    primary_country,
    monitor_type,
    locale,
    audit_enabled,
    tags: tags || null,
    notes: notes || null
  };

  const { data, error } = await supabase
    .from('monitored_apps')
    .upsert(payload, {
      onConflict: 'organization_id,app_id,platform',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('[appsService] Error upserting monitored app:', error);
    throw new Error(`Failed to upsert monitored app: ${error.message}`);
  }

  return data as MonitoredAppWithAudit;
}

/**
 * Updates audit-specific fields for a monitored app.
 * Used after generating an audit snapshot.
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param app_id - App ID
 * @param platform - Platform
 * @param updates - Audit field updates
 * @returns Updated monitored app
 */
export async function updateAuditFields(
  supabase: SupabaseClient,
  organization_id: string,
  app_id: string,
  platform: 'ios' | 'android',
  updates: UpdateAuditFieldsInput
): Promise<MonitoredAppWithAudit> {
  const { data, error } = await supabase
    .from('monitored_apps')
    .update(updates)
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .eq('platform', platform)
    .select()
    .single();

  if (error) {
    console.error('[appsService] Error updating audit fields:', error);
    throw new Error(`Failed to update audit fields: ${error.message}`);
  }

  return data as MonitoredAppWithAudit;
}

/**
 * Gets all monitored apps for an organization with audit enabled.
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param limit - Max results (default: 100)
 * @returns Array of monitored apps with audit enabled
 */
export async function listAuditEnabledApps(
  supabase: SupabaseClient,
  organization_id: string,
  limit: number = 100
): Promise<MonitoredAppWithAudit[]> {
  const { data, error } = await supabase
    .from('monitored_apps')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('audit_enabled', true)
    .order('latest_audit_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('[appsService] Error listing audit-enabled apps:', error);
    throw new Error(`Failed to list audit-enabled apps: ${error.message}`);
  }

  return (data || []) as MonitoredAppWithAudit[];
}

/**
 * Gets all monitored apps for an organization (all types).
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param limit - Max results (default: 100)
 * @returns Array of all monitored apps
 */
export async function listMonitoredApps(
  supabase: SupabaseClient,
  organization_id: string,
  limit: number = 100
): Promise<MonitoredAppWithAudit[]> {
  const { data, error } = await supabase
    .from('monitored_apps')
    .select('*')
    .eq('organization_id', organization_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[appsService] Error listing monitored apps:', error);
    throw new Error(`Failed to list monitored apps: ${error.message}`);
  }

  return (data || []) as MonitoredAppWithAudit[];
}

/**
 * Deletes a monitored app.
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param app_id - App ID
 * @param platform - Platform
 * @returns True if deleted, false if not found
 */
export async function deleteMonitoredApp(
  supabase: SupabaseClient,
  organization_id: string,
  app_id: string,
  platform: 'ios' | 'android'
): Promise<boolean> {
  const { error, count } = await supabase
    .from('monitored_apps')
    .delete({ count: 'exact' })
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .eq('platform', platform);

  if (error) {
    console.error('[appsService] Error deleting monitored app:', error);
    throw new Error(`Failed to delete monitored app: ${error.message}`);
  }

  return (count || 0) > 0;
}

/**
 * Enables or disables audit for a monitored app.
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param app_id - App ID
 * @param platform - Platform
 * @param enabled - Enable/disable audit
 * @returns Updated monitored app
 */
export async function toggleAudit(
  supabase: SupabaseClient,
  organization_id: string,
  app_id: string,
  platform: 'ios' | 'android',
  enabled: boolean
): Promise<MonitoredAppWithAudit> {
  const { data, error } = await supabase
    .from('monitored_apps')
    .update({ audit_enabled: enabled })
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .eq('platform', platform)
    .select()
    .single();

  if (error) {
    console.error('[appsService] Error toggling audit:', error);
    throw new Error(`Failed to toggle audit: ${error.message}`);
  }

  return data as MonitoredAppWithAudit;
}
