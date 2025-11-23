
import React from 'react';
import { MainLayout } from '@/layouts';
import { AsoAiHubProvider } from '@/context/AsoAiHubContext';
import { WorkflowProvider } from '@/context/WorkflowContext';
import { AppAuditHub } from '@/components/AppAudit/AppAuditHub';
import { MonitoredAppsWidget } from '@/components/AppAudit/MonitoredAppsWidget';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useDataAccess } from '@/hooks/useDataAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { SuperAdminOrganizationSelector } from '@/components/SuperAdminOrganizationSelector';
import { Brain } from 'lucide-react';
import { featureEnabledForRole, PLATFORM_FEATURES, type UserRole } from '@/constants/features';
import { NotAuthorized } from '@/components/NotAuthorized';
import { useParams } from 'react-router-dom';

export interface AsoAiHubPageProps {
  mode?: 'live' | 'monitored';
}

const AsoAiHubPage: React.FC<AsoAiHubPageProps> = ({ mode = 'live' }) => {
  const { monitoredAppId } = useParams<{ monitoredAppId: string }>();
  const dataContext = useDataAccess();
  const { isSuperAdmin, isOrganizationAdmin, roles } = usePermissions();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    dataContext.organizationId
  );

  // Route-level access control - properly map user role
  const currentUserRole: UserRole = isSuperAdmin ? 'super_admin' :
    (isOrganizationAdmin ? 'org_admin' :
    (roles[0]?.toLowerCase().includes('aso') ? 'aso_manager' :
    (roles[0]?.toLowerCase().includes('analyst') ? 'analyst' : 'viewer')));

  const hasAccess = featureEnabledForRole(PLATFORM_FEATURES.ASO_AI_HUB, currentUserRole);

  if (!hasAccess) {
    return (
      <NotAuthorized
        title="ASO AI Hub Access Required"
        message="This feature requires organization admin access or higher. Contact your organization administrator for more information."
      />
    );
  }

  const handleOrgChange = (orgId: string | null) => {
    setSelectedOrgId(orgId);
  };

  // Get current user's organization
  const { data: userContext } = useQuery({
    queryKey: ['user-context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      return {
        organizationId: profile?.organization_id || null
      };
    },
  });

  return (
    <MainLayout>
      <WorkflowProvider>
        <AsoAiHubProvider>
          <div className="space-y-8">
            {/* Enhanced Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Brain className="h-12 w-12 text-yodel-orange" />
                <h1 className="text-4xl font-bold text-foreground">ASO AI Audit</h1>
              </div>
              <p className="text-zinc-400 text-lg max-w-4xl mx-auto leading-relaxed">
                Run a complete ASO audit using real Store data, metadata intelligence, and competitor signals.
              </p>
            </div>

            {/* Super Admin Organization Selector */}
            {dataContext.canAccessAllOrgs && (
              <SuperAdminOrganizationSelector
                selectedOrg={selectedOrgId}
                onOrgChange={handleOrgChange}
                className="mb-6"
              />
            )}

            {/* Monitored Apps Widget - Only show in live audit mode */}
            {mode === 'live' && (selectedOrgId || dataContext.organizationId) && (
              <MonitoredAppsWidget
                organizationId={(selectedOrgId || dataContext.organizationId) as string}
                maxApps={6}
              />
            )}

            {/* Main Audit Hub */}
            {(selectedOrgId || dataContext.organizationId) ? (
              <AppAuditHub
                organizationId={(selectedOrgId || dataContext.organizationId) as string}
                mode={mode}
                monitoredAppId={monitoredAppId}
              />
            ) : dataContext.canAccessAllOrgs ? (
              <div className="text-center py-12 bg-zinc-900/30 rounded-lg border border-zinc-800">
                <Brain className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Select an Organization</h3>
                <p className="text-zinc-400">Please select an organization from the dropdown above to start auditing apps</p>
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/30 rounded-lg border border-zinc-800">
                <Brain className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Authentication Required</h3>
                <p className="text-zinc-400">Please sign in to access the ASO AI Audit features</p>
              </div>
            )}
          </div>
        </AsoAiHubProvider>
      </WorkflowProvider>
    </MainLayout>
  );
};

export default AsoAiHubPage;
