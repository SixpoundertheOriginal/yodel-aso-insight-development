import { useState, useEffect, useCallback } from 'react';

/**
 * Recent Apps Hook
 *
 * Manages a list of recently selected apps in localStorage.
 * Stores up to 5 most recent apps per organization with FIFO eviction.
 *
 * Usage:
 * ```tsx
 * const { recentApps, addRecentApp } = useRecentApps(organizationId);
 *
 * // When user selects an app:
 * addRecentApp('Mixbook');
 *
 * // Show recent apps in UI:
 * {recentApps.map(appId => <AppOption key={appId} appId={appId} />)}
 * ```
 *
 * Features:
 * - Per-organization storage (agency support)
 * - FIFO eviction (max 5 apps)
 * - Deduplication (moving existing app to front)
 * - Automatic localStorage sync
 */

const MAX_RECENT_APPS = 5;

function getStorageKey(organizationId: string): string {
  return `recent_selected_apps_${organizationId}`;
}

function loadRecentApps(organizationId: string): string[] {
  try {
    const key = getStorageKey(organizationId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    // Validate all items are strings
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch (error) {
    console.error('[RECENT-APPS] Failed to load from localStorage:', error);
    return [];
  }
}

function saveRecentApps(organizationId: string, apps: string[]): void {
  try {
    const key = getStorageKey(organizationId);
    localStorage.setItem(key, JSON.stringify(apps));
  } catch (error) {
    console.error('[RECENT-APPS] Failed to save to localStorage:', error);
  }
}

export function useRecentApps(organizationId: string) {
  const [recentApps, setRecentApps] = useState<string[]>(() =>
    loadRecentApps(organizationId)
  );

  // Sync with localStorage when organizationId changes
  useEffect(() => {
    setRecentApps(loadRecentApps(organizationId));
  }, [organizationId]);

  const addRecentApp = useCallback(
    (appId: string) => {
      setRecentApps((prev) => {
        // Remove if already exists (we'll add it to front)
        const filtered = prev.filter((id) => id !== appId);

        // Add to front
        const updated = [appId, ...filtered];

        // Keep only MAX_RECENT_APPS
        const trimmed = updated.slice(0, MAX_RECENT_APPS);

        // Persist to localStorage
        saveRecentApps(organizationId, trimmed);

        console.log(`[RECENT-APPS] Added "${appId}" for org ${organizationId.substring(0, 8)}...`);
        console.log(`  Recent apps: [${trimmed.join(', ')}]`);

        return trimmed;
      });
    },
    [organizationId]
  );

  const clearRecentApps = useCallback(() => {
    setRecentApps([]);
    try {
      const key = getStorageKey(organizationId);
      localStorage.removeItem(key);
      console.log(`[RECENT-APPS] Cleared for org ${organizationId.substring(0, 8)}...`);
    } catch (error) {
      console.error('[RECENT-APPS] Failed to clear localStorage:', error);
    }
  }, [organizationId]);

  return {
    recentApps,
    addRecentApp,
    clearRecentApps
  };
}
