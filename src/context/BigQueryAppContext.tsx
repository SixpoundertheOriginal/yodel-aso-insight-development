
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BigQueryAppContextType {
  selectedApps: string[];
  setSelectedApps: (apps: string[]) => void;
  availableApps: string[];
  loading: boolean;
}

const BigQueryAppContext = createContext<BigQueryAppContextType | undefined>(undefined);

export const BigQueryAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[BigQueryAppContext] Provider mounted');
  }
  
  // ✅ PHASE 3: Enhanced state management with loading
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[BigQueryAppContext] No user found, using fallback');
          }
          setAvailableApps(['TUI']);
          setSelectedApps(['TUI']);
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[BigQueryAppContext] No organization found, using fallback');
          }
          setAvailableApps(['TUI']);
          setSelectedApps(['TUI']);
          setLoading(false);
          return;
        }

        // Get approved apps for organization using RPC
        const { data: approvedApps, error } = await supabase
          .rpc('get_approved_apps', { p_organization_id: profile.organization_id });

        if (error) {
          console.error('[BigQueryAppContext] Error loading approved apps:', error);
          setAvailableApps(['TUI']);
          setSelectedApps(['TUI']);
          setLoading(false);
          return;
        }

        const appIdentifiers = approvedApps?.map((app: any) => app.app_identifier) || [];
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[BigQueryAppContext] Loaded approved apps:', {
            organizationId: profile.organization_id,
            approvedAppsCount: appIdentifiers.length
          });
        }

        if (appIdentifiers.length > 0) {
          setAvailableApps(appIdentifiers);
          setSelectedApps(appIdentifiers); // Select all by default
        } else {
          setAvailableApps(['TUI']);
          setSelectedApps(['TUI']);
        }

      } catch (err) {
        console.error('[BigQueryAppContext] Error in loadApprovedApps:', err);
        setAvailableApps(['TUI']);
        setSelectedApps(['TUI']);
      } finally {
        setLoading(false);
      }
    };

    loadApprovedApps();
  }, []);

  // App selection handler
  const handleSetSelectedApps = (apps: string[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[BigQueryAppContext] App selection changing:', {
        from: selectedApps.length,
        to: apps.length
      });
    }
    setSelectedApps(apps);
  };

  return (
    <BigQueryAppContext.Provider value={{ 
      selectedApps, 
      setSelectedApps: handleSetSelectedApps,
      availableApps,
      loading
    }}>
      {children}
    </BigQueryAppContext.Provider>
  );
};

export const useBigQueryAppSelection = () => {
  const context = useContext(BigQueryAppContext);
  if (context === undefined) {
    throw new Error('useBigQueryAppSelection must be used within a BigQueryAppProvider');
  }
  return context;
};
