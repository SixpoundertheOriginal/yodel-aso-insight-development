
import React from 'react';
import { MainLayout } from '@/layouts';
import { AsoAiHubProvider } from '@/context/AsoAiHubContext';
import { WorkflowProvider } from '@/context/WorkflowContext';
import { AppAuditHub } from '@/components/AppAudit/AppAuditHub';
import { HeroSection } from '@/components/ui/design-system';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useDataAccess } from '@/hooks/useDataAccess';
import { SuperAdminOrganizationSelector } from '@/components/SuperAdminOrganizationSelector';
import { Brain } from 'lucide-react';
import { featureEnabledForRole, PLATFORM_FEATURES, type UserRole } from '@/constants/features';
import { NotAuthorized } from '@/components/NotAuthorized';

const AsoAiHubPage: React.FC = () => {
  const dataContext = useDataAccess();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    dataContext.organizationId
  );

  // Route-level access control
  const currentUserRole: UserRole = dataContext.canAccessAllOrgs ? 'super_admin' : 'viewer';
  const hasAccess = featureEnabledForRole(PLATFORM_FEATURES.ASO_AI_HUB, currentUserRole);
  
  if (!hasAccess) {
    return (
      <NotAuthorized 
        title="ASO AI Hub Access Required"
        message="This feature is currently available to platform administrators only. Contact support for more information."
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
                Comprehensive ASO analysis in minutes. Import your app to get actionable insights, 
                competitor analysis, and optimization recommendations.
              </p>
            </div>
            
            {/* Hero Section */}
            <HeroSection
              title="Comprehensive App Audit"
              subtitle="Complete ASO analysis in minutes"
              description="Import your app to get actionable insights, competitor analysis, and optimization recommendations. Perfect for getting started or quick health checks."
            />
            
            {/* Super Admin Organization Selector */}
            {dataContext.canAccessAllOrgs && (
              <SuperAdminOrganizationSelector
                selectedOrg={selectedOrgId}
                onOrgChange={handleOrgChange}
                className="mb-6"
              />
            )}
            
            {/* Main Audit Hub */}
            {(selectedOrgId || dataContext.organizationId || dataContext.canAccessAllOrgs) ? (
              <AppAuditHub organizationId={(selectedOrgId || dataContext.organizationId || '__platform__') as string} />
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
