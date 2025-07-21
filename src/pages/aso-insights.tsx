
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { UnifiedAsoProvider } from '@/context/UnifiedAsoContext';
import { UnifiedAsoInsights } from '@/components/UnifiedAsoInsights/UnifiedAsoInsights';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AsoInsightsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') as 'parser' | 'tracking' || 'parser';
  const initialTab = searchParams.get('tab') || 'overview';

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

  if (!userContext?.organizationId) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-white mb-2">Authentication Required</h3>
          <p className="text-zinc-400">Please sign in to access ASO Insights</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <UnifiedAsoProvider organizationId={userContext.organizationId}>
        <UnifiedAsoInsights 
          initialMode={initialMode}
          initialTab={initialTab}
        />
      </UnifiedAsoProvider>
    </MainLayout>
  );
};

export default AsoInsightsPage;
