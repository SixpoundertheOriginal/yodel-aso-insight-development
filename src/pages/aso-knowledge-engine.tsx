
import React from 'react';
import { MainLayout } from '@/layouts';
import { AsoKnowledgeEngine } from '@/components/AsoAiHub/AsoKnowledgeEngine';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AsoKnowledgeEnginePage: React.FC = () => {
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
          <p className="text-zinc-400">Please sign in to access the ASO Knowledge Engine</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <AsoKnowledgeEngine organizationId={userContext.organizationId} />
    </MainLayout>
  );
};

export default AsoKnowledgeEnginePage;
