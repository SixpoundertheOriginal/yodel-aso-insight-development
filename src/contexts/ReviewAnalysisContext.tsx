/**
 * REVIEW ANALYSIS SHARED STATE
 *
 * Provides shared state between Reviews page and Theme Analysis page.
 * This ensures consistent app selection and seamless navigation between pages.
 *
 * SECURITY:
 * - State is validated against monitored apps on load
 * - localStorage is used for persistence but validated on every access
 * - Only monitored apps can be set as selected
 *
 * PERFORMANCE:
 * - In-memory state during session (fast)
 * - localStorage persistence for UX (survives refresh)
 * - React Query integration for data fetching
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SelectedApp {
  appId: string;
  appStoreId: string;
  name: string;
  developer: string;
  icon: string;
  country: string;
  rating: number;
  reviewCount: number;
  category: string;
  monitoredAppId: string; // The ID from monitored_apps table
  lastSelectedAt: number; // Timestamp for staleness check
}

interface ReviewAnalysisContextValue {
  selectedApp: SelectedApp | null;
  setSelectedApp: (app: SelectedApp | null) => void;
  clearSelectedApp: () => void;
  isAppMonitored: (appStoreId: string, country: string) => boolean;
  monitoredApps: any[];
  isLoadingMonitoredApps: boolean;
}

const ReviewAnalysisContext = createContext<ReviewAnalysisContextValue | null>(null);

const STORAGE_KEY = 'yodel_review_analysis_selected_app';
const STALENESS_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

interface ReviewAnalysisProviderProps {
  children: React.ReactNode;
  organizationId: string | null;
}

export function ReviewAnalysisProvider({ children, organizationId }: ReviewAnalysisProviderProps) {
  const [selectedApp, setSelectedAppState] = useState<SelectedApp | null>(null);

  // Fetch monitored apps
  const { data: monitoredApps = [], isLoading: isLoadingMonitoredApps } = useQuery({
    queryKey: ['monitored-apps', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Validate stored app against monitored apps
  const validateStoredApp = useCallback((storedApp: SelectedApp): boolean => {
    // Check staleness
    const now = Date.now();
    if (now - storedApp.lastSelectedAt > STALENESS_THRESHOLD) {
      logger.info('[ReviewAnalysisContext] Stored app is stale, clearing');
      return false;
    }

    // Check if app is still monitored
    const isStillMonitored = monitoredApps.some(
      app =>
        app.app_store_id === storedApp.appStoreId &&
        app.primary_country === storedApp.country &&
        app.id === storedApp.monitoredAppId
    );

    if (!isStillMonitored) {
      logger.info('[ReviewAnalysisContext] Stored app is no longer monitored, clearing');
      return false;
    }

    return true;
  }, [monitoredApps]);

  // Load from localStorage on mount (with validation)
  useEffect(() => {
    if (!organizationId || monitoredApps.length === 0) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedApp: SelectedApp = JSON.parse(stored);

        // Validate before setting
        if (validateStoredApp(parsedApp)) {
          logger.info('[ReviewAnalysisContext] Loaded valid stored app', {
            appName: parsedApp.name,
            appId: parsedApp.appStoreId
          });
          setSelectedAppState(parsedApp);
        } else {
          // Invalid - clear from storage
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      logger.error('[ReviewAnalysisContext] Failed to load stored app', { error });
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [organizationId, monitoredApps, validateStoredApp]);

  // Save to localStorage when selected app changes
  useEffect(() => {
    if (selectedApp) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedApp));
        logger.info('[ReviewAnalysisContext] Saved selected app to storage', {
          appName: selectedApp.name
        });
      } catch (error) {
        logger.error('[ReviewAnalysisContext] Failed to save selected app', { error });
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedApp]);

  // Set selected app with validation
  const setSelectedApp = useCallback((app: SelectedApp | null) => {
    if (!app) {
      setSelectedAppState(null);
      return;
    }

    // Validate that app is monitored
    const monitoredApp = monitoredApps.find(
      ma =>
        ma.app_store_id === app.appStoreId &&
        ma.primary_country === app.country
    );

    if (!monitoredApp) {
      logger.warn('[ReviewAnalysisContext] Attempted to select non-monitored app', {
        appId: app.appStoreId,
        country: app.country
      });
      return;
    }

    // Set with current timestamp
    const appWithTimestamp: SelectedApp = {
      ...app,
      monitoredAppId: monitoredApp.id,
      lastSelectedAt: Date.now()
    };

    logger.info('[ReviewAnalysisContext] Selected app', {
      appName: app.name,
      monitoredAppId: monitoredApp.id
    });

    setSelectedAppState(appWithTimestamp);
  }, [monitoredApps]);

  // Clear selected app
  const clearSelectedApp = useCallback(() => {
    logger.info('[ReviewAnalysisContext] Clearing selected app');
    setSelectedAppState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check if app is monitored
  const isAppMonitored = useCallback((appStoreId: string, country: string): boolean => {
    return monitoredApps.some(
      app =>
        app.app_store_id === appStoreId &&
        app.primary_country === country
    );
  }, [monitoredApps]);

  const value: ReviewAnalysisContextValue = {
    selectedApp,
    setSelectedApp,
    clearSelectedApp,
    isAppMonitored,
    monitoredApps,
    isLoadingMonitoredApps
  };

  return (
    <ReviewAnalysisContext.Provider value={value}>
      {children}
    </ReviewAnalysisContext.Provider>
  );
}

// Hook to use the context
export function useReviewAnalysis() {
  const context = useContext(ReviewAnalysisContext);

  if (!context) {
    throw new Error('useReviewAnalysis must be used within ReviewAnalysisProvider');
  }

  return context;
}
