
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/lib/utils/debug';

interface BigQueryAppContextType {
  selectedApps: string[];
  setSelectedApps: (apps: string[]) => void;
  availableApps: string[];
  loading: boolean;
}

const BigQueryAppContext = createContext<BigQueryAppContextType | undefined>(undefined);

const BigQueryAppProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only log provider mount in verbose debug mode
  debugLog.verbose('[BigQueryAppContext] Provider mounted');
  
  // ✅ ENHANCED: State management with performance optimization
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ FIXED: Load user's actual approved apps instead of hardcoded values
  useEffect(() => {
    const loadApprovedApps = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          debugLog.verbose('[BigQueryAppContext] No user found, using fallback');
          setAvailableApps(['Mixbook']);
          setSelectedApps(['Mixbook']);
          setLoading(false);
          return;
        }

        // Get user's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          debugLog.verbose('[BigQueryAppContext] No organization found, using fallback');
          setAvailableApps(['Mixbook']);
          setSelectedApps(['Mixbook']);
          setLoading(false);
          return;
        }

        // Get approved BigQuery apps for organization
        const { data: approvedApps, error } = await supabase
          .from('organization_apps')
          .select('app_identifier')
          .eq('organization_id', profile.organization_id)
          .eq('data_source', 'bigquery')
          .eq('approval_status', 'approved');

        if (error) {
          console.error('[BigQueryAppContext] Error loading approved BigQuery apps:', error);
          setAvailableApps(['Mixbook']);
          setSelectedApps(['Mixbook']);
          setLoading(false);
          return;
        }

        const appIdentifiers = approvedApps?.map((app: any) => app.app_identifier) || [];
        
        debugLog.verbose('[BigQueryAppContext] Loaded approved apps:', {
          organizationId: profile.organization_id,
          approvedAppsCount: appIdentifiers.length
        });

        if (appIdentifiers.length > 0) {
          setAvailableApps(appIdentifiers);
          setSelectedApps(appIdentifiers); // Select all by default
        } else {
          setAvailableApps(['Mixbook']);
          setSelectedApps(['Mixbook']);
        }

      } catch (err) {
        console.error('[BigQueryAppContext] Error in loadApprovedApps:', err);
        setAvailableApps(['Mixbook']);
        setSelectedApps(['Mixbook']);
      } finally {
        setLoading(false);
      }
    };

    loadApprovedApps();
  }, []);

  // ✅ ENHANCED: Memoized app selection handler to prevent unnecessary re-renders
  const handleSetSelectedApps = useCallback((apps: string[]) => {
    debugLog.verbose('[BigQueryAppContext] App selection changing:', {
      from: selectedApps.length,
      to: apps.length
    });
    setSelectedApps(apps);
  }, [selectedApps.length]);

  // ✅ ENHANCED: Memoized context value to prevent cascading re-renders
  const contextValue = useMemo(() => ({
    selectedApps,
    setSelectedApps: handleSetSelectedApps,
    availableApps,
    loading
  }), [selectedApps, handleSetSelectedApps, availableApps, loading]);

  return (
    <BigQueryAppContext.Provider value={contextValue}>
      {children}
    </BigQueryAppContext.Provider>
  );
};

// ✅ ENHANCED: Wrap provider with React.memo for performance optimization
export const BigQueryAppProvider = React.memo(BigQueryAppProviderComponent);

export const useBigQueryAppSelection = () => {
  const context = useContext(BigQueryAppContext);
  if (context === undefined) {
    throw new Error('useBigQueryAppSelection must be used within a BigQueryAppProvider');
  }
  return context;
};
