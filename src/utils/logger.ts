/**
 * Production-Ready Logging Utility
 *
 * Feature-flag controlled logging system for development and production environments.
 * Reduces console noise while maintaining debugging capabilities via environment variables.
 *
 * Usage:
 * - Development: Enable specific debug flags in .env
 * - Production: All debug logs disabled by default, only errors logged (without stack traces)
 *
 * Environment Variables:
 * - VITE_DEBUG_PERMISSIONS=true - Enable usePermissions logging
 * - VITE_DEBUG_SIDEBAR=true - Enable sidebar navigation logging
 * - VITE_DEBUG_DASHBOARD=true - Enable dashboard logging
 * - VITE_DEBUG_FEATURE_ACCESS=true - Enable feature access logging
 * - VITE_DEBUG_LEGACY=true - Enable legacy system logging
 * - VITE_DEBUG_BIGQUERY=true - Enable BigQuery data fetching logs
 * - VITE_DEBUG_FALLBACK=true - Enable fallback system logs
 * - VITE_DEBUG_CONTEXT=true - Enable React Context logs
 */

// Feature flags from environment
const DEBUG_FLAGS = {
  PERMISSIONS: import.meta.env.VITE_DEBUG_PERMISSIONS === 'true',
  SIDEBAR: import.meta.env.VITE_DEBUG_SIDEBAR === 'true',
  DASHBOARD: import.meta.env.VITE_DEBUG_DASHBOARD === 'true',
  FEATURE_ACCESS: import.meta.env.VITE_DEBUG_FEATURE_ACCESS === 'true',
  LEGACY: import.meta.env.VITE_DEBUG_LEGACY === 'true',
  BIGQUERY: import.meta.env.VITE_DEBUG_BIGQUERY === 'true',
  FALLBACK: import.meta.env.VITE_DEBUG_FALLBACK === 'true',
  CONTEXT: import.meta.env.VITE_DEBUG_CONTEXT === 'true',
};

/**
 * Global state for tracking one-time logs
 * Prevents repeated logging of the same message
 */
const loggedOnce = new Set<string>();

/**
 * Centralized logging utility
 */
export const logger = {
  /**
   * Log permissions-related messages
   * Only logs when VITE_DEBUG_PERMISSIONS=true
   */
  permissions: (message: string, data?: any) => {
    if (DEBUG_FLAGS.PERMISSIONS) {
      console.log(`[usePermissions] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log sidebar navigation messages
   * Only logs when VITE_DEBUG_SIDEBAR=true
   */
  sidebar: (message: string, data?: any) => {
    if (DEBUG_FLAGS.SIDEBAR) {
      console.log(`[Sidebar] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log dashboard-related messages
   * Only logs when VITE_DEBUG_DASHBOARD=true
   */
  dashboard: (message: string, data?: any) => {
    if (DEBUG_FLAGS.DASHBOARD) {
      console.log(`[Dashboard] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log feature access messages
   * Only logs when VITE_DEBUG_FEATURE_ACCESS=true
   */
  featureAccess: (message: string, data?: any) => {
    if (DEBUG_FLAGS.FEATURE_ACCESS) {
      console.log(`[FeatureAccess] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log legacy system messages
   * Only logs when VITE_DEBUG_LEGACY=true
   */
  legacy: (message: string, data?: any) => {
    if (DEBUG_FLAGS.LEGACY) {
      console.log(`[Legacy] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log BigQuery data fetching messages
   * Only logs when VITE_DEBUG_BIGQUERY=true
   */
  bigquery: (message: string, data?: any) => {
    if (DEBUG_FLAGS.BIGQUERY) {
      console.log(`[BigQueryData] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log fallback system messages
   * Only logs when VITE_DEBUG_FALLBACK=true
   */
  fallback: (message: string, data?: any) => {
    if (DEBUG_FLAGS.FALLBACK) {
      console.log(`[AsoFallback] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log React Context messages
   * Only logs when VITE_DEBUG_CONTEXT=true
   */
  context: (message: string, data?: any) => {
    if (DEBUG_FLAGS.CONTEXT) {
      console.log(`[Context] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Always log errors, but structure them appropriately
   * Production: Error message only (no stack traces)
   * Development: Full error details with stack traces
   *
   * @param context - Context identifier (e.g., "FeatureAccess", "Permissions")
   * @param message - Human-readable error message
   * @param error - Optional error object (only logged in development)
   */
  error: (context: string, message: string, error?: any) => {
    if (process.env.NODE_ENV === 'production') {
      // Production: Clean error message only, no sensitive data
      console.error(`[${context}] ${message}`);
    } else {
      // Development: Full error details for debugging
      if (error !== undefined) {
        console.error(`[${context}] ${message}`, error);
      } else {
        console.error(`[${context}] ${message}`);
      }
    }
  },

  /**
   * Log a message only once per session
   * Useful for avoiding repeated warnings or informational messages
   *
   * @param key - Unique identifier for this log message
   * @param message - The message to log
   * @param data - Optional data to include
   */
  once: (key: string, message: string, data?: any) => {
    if (!loggedOnce.has(key)) {
      if (data !== undefined) {
        console.log(message, data);
      } else {
        console.log(message);
      }
      loggedOnce.add(key);
    }
  },

  /**
   * Clear the one-time log registry
   * Useful for testing or forcing logs to appear again
   */
  clearOnce: () => {
    loggedOnce.clear();
  },

  /**
   * Get current debug flag status (for debugging the logger itself)
   */
  getDebugFlags: () => ({ ...DEBUG_FLAGS }),
};

/**
 * Helper function to truncate organization IDs for safe logging
 * Only logs first 8 characters to avoid exposing full UUIDs
 *
 * @param orgId - Full organization UUID
 * @returns Truncated ID (first 8 chars + "...")
 */
export const truncateOrgId = (orgId: string | null | undefined): string => {
  if (!orgId) return 'null';
  return `${orgId.slice(0, 8)}...`;
};

/**
 * Helper function to truncate email addresses for safe logging
 * Shows only first 3 chars + domain
 *
 * @param email - Email address
 * @returns Truncated email (e.g., "cli***@yodelmobile.com")
 */
export const truncateEmail = (email: string | null | undefined): string => {
  if (!email) return 'null';
  const parts = email.split('@');
  if (parts.length !== 2) return 'invalid';
  return `${parts[0].slice(0, 3)}***@${parts[1]}`;
};
