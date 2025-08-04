import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/layouts';
import { AppAuditHub } from '@/components/AppAudit/AppAuditHub';
import { UnifiedKeywordIntelligence } from '@/components/KeywordIntelligence/UnifiedKeywordIntelligence';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

const ASOUnifiedPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'audit' | 'keywords'>('audit');
  const [scrapedAppData, setScrapedAppData] = useState<any>(null);

  // Handle scraped data from AppAuditHub
  const handleAppScraped = (metadata: any) => {
    setScrapedAppData(metadata);
    // Auto-switch to keywords tab after successful scrape for better UX
    setActiveMode('keywords');
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

  if (!userContext?.organizationId) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-foreground mb-2">Authentication Required</h3>
          <p className="text-zinc-400">Please sign in to access ASO Intelligence features</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        {/* Simple header with mode toggle */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">ASO Intelligence Hub</h1>
          <p className="text-zinc-400 mt-2">
            Comprehensive app analysis combining audit insights and keyword intelligence
          </p>
        </div>

        {/* Mode selector using existing UI components */}
        <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'audit' | 'keywords')}>
          <TabsList className="mb-6">
            <TabsTrigger value="audit">🔍 Comprehensive Audit</TabsTrigger>
            <TabsTrigger value="keywords">📊 Keyword Intelligence</TabsTrigger>
          </TabsList>

          <TabsContent value="audit">
            {/* AppAuditHub with callback to share scraped data */}
            <AppAuditHub 
              organizationId={userContext.organizationId}
              onAppScraped={handleAppScraped}
            />
          </TabsContent>

          <TabsContent value="keywords">
            {/* UnifiedKeywordIntelligence with scraped data support */}
            <UnifiedKeywordIntelligence 
              organizationId={userContext.organizationId}
              scrapedAppData={scrapedAppData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ASOUnifiedPage;