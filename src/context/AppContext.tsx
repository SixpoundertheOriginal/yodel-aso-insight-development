
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useSuperAdmin } from './SuperAdminContext';

interface App {
  id: string;
  app_name: string;
  platform: string;
  app_store_id?: string;
  bundle_id?: string;
  category?: string;
  developer_name?: string;
  app_icon_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AppContextType {
  apps: App[];
  selectedApp: App | null;
  setSelectedApp: (app: App | null) => void;
  isLoading: boolean;
  error: Error | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isSuperAdmin, selectedOrganizationId } = useSuperAdmin();
  const [selectedApp, setSelectedApp] = useState<App | null>(null);

  // Get user's organization apps with enhanced query
  const { data: apps = [], isLoading, error } = useQuery({
    queryKey: ['user-apps', user?.id, isSuperAdmin ? selectedOrganizationId : null],
    queryFn: async () => {
      if (!user) return [];

      // Platform super admin can view apps for selected organization
      if (isSuperAdmin) {
        if (!selectedOrganizationId) return [];
        const { data: orgApps, error } = await (supabase as any)
          .from('org_app_access')
          .select('*')
          .eq('organization_id', selectedOrganizationId)
          .is('detached_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        // Transform org_app_access to App format
        return (orgApps || []).map((orgApp: any) => ({
          id: orgApp.app_id,
          app_name: orgApp.app_id,
          platform: 'ios',
          is_active: true,
          created_at: orgApp.created_at,
          updated_at: orgApp.created_at
        }));
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data: orgApps, error } = await (supabase as any)
        .from('org_app_access')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .is('detached_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform org_app_access to App format
      return (orgApps || []).map((orgApp: any) => ({
        id: orgApp.app_id,
        app_name: orgApp.app_id,
        platform: 'ios',
        is_active: true,
        created_at: orgApp.created_at,
        updated_at: orgApp.created_at
      }));
    },
    enabled: !!user && (!isSuperAdmin || !!selectedOrganizationId),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-select first active app if none selected
  useEffect(() => {
    if (apps.length > 0 && !selectedApp) {
      const activeApps = apps.filter(app => app.is_active);
      const appToSelect = activeApps.length > 0 ? activeApps[0] : apps[0];
      setSelectedApp(appToSelect);
    }
    
    // If selected app is no longer in the list, clear selection
    if (selectedApp && !apps.find(app => app.id === selectedApp.id)) {
      setSelectedApp(null);
    }
  }, [apps, selectedApp]);

  const value = {
    apps,
    selectedApp,
    setSelectedApp,
    isLoading,
    error: error as Error | null
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
