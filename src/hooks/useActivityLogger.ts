/**
 * Activity Logger Hook
 *
 * Purpose: Log user actions to audit_logs for security monitoring
 * Usage: const { logActivity } = useActivityLogger();
 *        logActivity('view_app', 'app', appId, { filters });
 */

import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabaseCompat } from '@/lib/supabase-compat';

export interface ActivityLogOptions {
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  status?: 'success' | 'failure' | 'denied';
  errorMessage?: string;
}

export function useActivityLogger() {
  const { user } = useAuth();
  const { organizationId } = usePermissions();

  /**
   * Log an activity to the audit log
   */
  const logActivity = useCallback(
    async (options: ActivityLogOptions) => {
      if (!user) {
        console.warn('[ACTIVITY] No user found, skipping log');
        return;
      }

      try {
        await supabaseCompat.rpcAny('log_audit_event', {
          p_user_id: user.id,
          p_organization_id: organizationId,
          p_user_email: user.email || null,
          p_action: options.action,
          p_resource_type: options.resourceType || null,
          p_resource_id: options.resourceId || null,
          p_details: options.details || {},
          p_status: options.status || 'success',
          p_error_message: options.errorMessage || null,
        });

        console.log('[ACTIVITY] Logged:', options.action);
      } catch (err) {
        console.error('[ACTIVITY] Failed to log activity:', err);
      }
    },
    [user, organizationId]
  );

  /**
   * Convenience methods for common actions
   */
  const logPageView = useCallback(
    (path: string, details?: Record<string, any>) => {
      logActivity({
        action: 'page_view',
        resourceType: 'page',
        details: {
          path,
          ...details,
        },
      });
    },
    [logActivity]
  );

  const logAppView = useCallback(
    (appId: string, details?: Record<string, any>) => {
      logActivity({
        action: 'view_app',
        resourceType: 'app',
        resourceId: appId,
        details,
      });
    },
    [logActivity]
  );

  const logAppCreate = useCallback(
    (appId: string, details?: Record<string, any>) => {
      logActivity({
        action: 'create_app',
        resourceType: 'app',
        resourceId: appId,
        details,
      });
    },
    [logActivity]
  );

  const logAppUpdate = useCallback(
    (appId: string, details?: Record<string, any>) => {
      logActivity({
        action: 'update_app',
        resourceType: 'app',
        resourceId: appId,
        details,
      });
    },
    [logActivity]
  );

  const logAppDelete = useCallback(
    (appId: string, details?: Record<string, any>) => {
      logActivity({
        action: 'delete_app',
        resourceType: 'app',
        resourceId: appId,
        details,
      });
    },
    [logActivity]
  );

  const logExport = useCallback(
    (resourceType: string, resourceId?: string, details?: Record<string, any>) => {
      logActivity({
        action: 'export_data',
        resourceType,
        resourceId,
        details,
      });
    },
    [logActivity]
  );

  const logSearch = useCallback(
    (query: string, results: number, details?: Record<string, any>) => {
      logActivity({
        action: 'search',
        resourceType: 'search',
        details: {
          query,
          results_count: results,
          ...details,
        },
      });
    },
    [logActivity]
  );

  return {
    logActivity,
    logPageView,
    logAppView,
    logAppCreate,
    logAppUpdate,
    logAppDelete,
    logExport,
    logSearch,
  };
}
