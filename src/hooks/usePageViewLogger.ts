/**
 * Page View Logger Hook
 *
 * Purpose: Automatically log page views for analytics
 * Usage: Place in MainLayout or App component:
 *        usePageViewLogger();
 *
 * Note: This is opt-in. Only logs if enabled in settings.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useActivityLogger } from './useActivityLogger';
import { useAuth } from '@/context/AuthContext';

export interface PageViewLoggerOptions {
  /**
   * Enable page view logging (default: false)
   * Set to true to track all page views
   */
  enabled?: boolean;

  /**
   * Paths to exclude from logging (regex patterns)
   * Default: ['/auth/*', '/api/*']
   */
  excludePaths?: string[];

  /**
   * Debounce time in ms to avoid logging rapid navigation
   * Default: 1000 (1 second)
   */
  debounceMs?: number;
}

const DEFAULT_EXCLUDE_PATHS = [
  '^/auth/',     // Auth pages
  '^/api/',      // API routes
  '^/_/',        // Internal routes
];

export function usePageViewLogger(options: PageViewLoggerOptions = {}) {
  const {
    enabled = false, // Disabled by default
    excludePaths = DEFAULT_EXCLUDE_PATHS,
    debounceMs = 1000,
  } = options;

  const location = useLocation();
  const { user } = useAuth();
  const { logPageView } = useActivityLogger();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    // Skip if not enabled or no user
    if (!enabled || !user) return;

    const currentPath = location.pathname;

    // Skip if same as last path (prevent duplicates)
    if (currentPath === lastPathRef.current) return;

    // Check if path should be excluded
    const shouldExclude = excludePaths.some((pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(currentPath);
    });

    if (shouldExclude) {
      console.log('[PAGE-VIEW] Skipped (excluded):', currentPath);
      return;
    }

    // Debounce page view logging
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      logPageView(currentPath, {
        search: location.search,
        hash: location.hash,
        referrer: document.referrer,
      });
      lastPathRef.current = currentPath;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, location.search, location.hash, enabled, user, excludePaths, debounceMs, logPageView]);
}
