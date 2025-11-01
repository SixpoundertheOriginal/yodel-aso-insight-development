import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface SuperAdminContextType {
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  isSuperAdmin: boolean;
  isPlatformWideMode: boolean;
  isLoading: boolean;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  // Restore organization selection from localStorage for super admins
  useEffect(() => {
    if (isSuperAdmin && !permissionsLoading) {
      const saved = localStorage.getItem('super-admin-selected-org');
      if (saved && saved !== 'null') {
        setSelectedOrganizationId(saved);
      }
    }
  }, [isSuperAdmin, permissionsLoading]);

  // Save organization selection to localStorage
  useEffect(() => {
    if (isSuperAdmin) {
      localStorage.setItem('super-admin-selected-org', selectedOrganizationId || 'null');
    }
  }, [selectedOrganizationId, isSuperAdmin]);

  // Persist super admin status for theme control
  useEffect(() => {
    localStorage.setItem('is-super-admin', isSuperAdmin ? 'true' : 'false');
  }, [isSuperAdmin]);

  const isPlatformWideMode = isSuperAdmin && selectedOrganizationId === null;

  const handleSetSelectedOrganizationId = (orgId: string | null) => {
    console.log('🔍 [DEBUG] SuperAdmin context - setting organization:', { from: selectedOrganizationId, to: orgId });
    setSelectedOrganizationId(orgId);
  };

  const contextValue: SuperAdminContextType = {
    selectedOrganizationId,
    setSelectedOrganizationId: handleSetSelectedOrganizationId,
    isSuperAdmin,
    isPlatformWideMode,
    isLoading: permissionsLoading
  };

  return (
    <SuperAdminContext.Provider value={contextValue}>
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};