
import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Target, TrendingUp, FileText, Users, Zap } from 'lucide-react';
import { useUnifiedAso, AsoMode } from '@/context/UnifiedAsoContext';
import { ModeSelector } from './ModeSelector';
import { AppInputSection } from './AppInputSection';
import { UnifiedScoreOverview } from './UnifiedScoreOverview';
import { OverviewTab } from './OverviewTab';
import { MetadataTab } from './MetadataTab';
import { KeywordsTab } from './KeywordsTab';
import { CompetitorsTab } from './CompetitorsTab';
import { RecommendationsTab } from './RecommendationsTab';

interface UnifiedAsoInsightsProps {
  initialMode?: AsoMode;
  initialTab?: string;
}

export const UnifiedAsoInsights: React.FC<UnifiedAsoInsightsProps> = ({
  initialMode = 'parser',
  initialTab = 'overview'
}) => {
  const {
    currentMode,
    setCurrentMode,
    analysis,
    isLoading,
    hasData,
    importedApp
  } = useUnifiedAso();

  // Set initial mode and tab
  useEffect(() => {
    setCurrentMode(initialMode);
    analysis.setActiveTab(initialTab);
  }, [initialMode, initialTab, setCurrentMode, analysis]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Brain className="h-12 w-12 text-yodel-orange" />
          <h1 className="text-4xl font-bold text-white">ASO Insights</h1>
        </div>
        <p className="text-zinc-400 text-lg max-w-4xl mx-auto leading-relaxed">
          Comprehensive App Store Optimization analysis. Parse new apps or track existing ones 
          with unified keyword intelligence, competitive insights, and optimization recommendations.
        </p>
      </div>

      {/* Mode Selector */}
      <ModeSelector />

      {/* App Input Section */}
      <AppInputSection />

      {/* Show analysis content when we have data */}
      {hasData && (
        <>
          {/* Unified Score Overview */}
          <UnifiedScoreOverview />

          {/* Main Analysis Tabs */}
          <Tabs value={analysis.activeTab} onValueChange={analysis.setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5 bg-zinc-900 border-zinc-800">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>

            <TabsContent value="metadata">
              <MetadataTab />
            </TabsContent>

            <TabsContent value="keywords">
              <KeywordsTab />
            </TabsContent>

            <TabsContent value="competitors">
              <CompetitorsTab />
            </TabsContent>

            <TabsContent value="recommendations">
              <RecommendationsTab />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty state when no data */}
      {!hasData && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Metadata Optimization</h3>
              <p className="text-zinc-400 text-sm">
                AI-powered title, subtitle, and keyword optimization with real-time scoring.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Keyword Intelligence</h3>
              <p className="text-zinc-400 text-sm">
                Discover high-opportunity keywords, track rankings, and analyze search trends.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Competitive Analysis</h3>
              <p className="text-zinc-400 text-sm">
                Monitor competitors, identify keyword gaps, and track market opportunities.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
