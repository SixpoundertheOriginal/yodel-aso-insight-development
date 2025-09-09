import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { systemApi } from '@/lib/admin-api';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrgContextType {
  currentOrgId: string | null;
  currentOrg: Organization | null;
  availableOrgs: Organization[];
  switchOrg: (orgId: string) => void;
  isLoading: boolean;
  isSuperAdmin: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgContextProvider');
  }
  return context;
};

interface OrgContextProviderProps {
  children: ReactNode;
}

export const OrgContextProvider: React.FC<OrgContextProviderProps> = ({ children }) => {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    localStorage.getItem('currentOrgId')
  );
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Load user info and available organizations
  useEffect(() => {
    loadUserData();
  }, []);

  // Update current org when currentOrgId changes
  useEffect(() => {
    if (currentOrgId && availableOrgs.length > 0) {
      const org = availableOrgs.find(o => o.id === currentOrgId);
      setCurrentOrg(org || null);
      if (org) {
        localStorage.setItem('currentOrgId', currentOrgId);
      }
    } else if (availableOrgs.length > 0 && !currentOrgId) {
      // Auto-select first org if none selected
      const firstOrg = availableOrgs[0];
      setCurrentOrgId(firstOrg.id);
      setCurrentOrg(firstOrg);
      localStorage.setItem('currentOrgId', firstOrg.id);
    }
  }, [currentOrgId, availableOrgs]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Get user info and permissions
      const whoami = await systemApi.whoami();
      setIsSuperAdmin(whoami.is_super_admin || false);
      
      // For super admin, we might get all orgs differently
      // For now, use the orgs from whoami response
      if (whoami.organizations) {
        setAvailableOrgs(whoami.organizations);
      } else if (whoami.organization) {
        // Single org user
        setAvailableOrgs([whoami.organization]);
      }
      
    } catch (error) {
      console.error('Failed to load user data:', error);
      setAvailableOrgs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrg = (orgId: string) => {
    const org = availableOrgs.find(o => o.id === orgId);
    if (org) {
      setCurrentOrgId(orgId);
      setCurrentOrg(org);
      localStorage.setItem('currentOrgId', orgId);
    }
  };

  const value: OrgContextType = {
    currentOrgId,
    currentOrg,
    availableOrgs,
    switchOrg,
    isLoading,
    isSuperAdmin,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
};