import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Zap } from 'lucide-react';
import { InsightRequestCards } from './InsightRequestCards';
import { InsightLoadingState } from './InsightLoadingState';
import { InsightResults } from './InsightResults';
import { HeroSection, YodelButton } from '@/components/ui/design-system';
import { useEnhancedAsoInsights } from '@/hooks/useEnhancedAsoInsights';
import { useAsoData } from '@/context/AsoDataContext';

interface ManualInsightsPanelProps {
  className?: string;
  organizationId: string;
}

export const ManualInsightsPanel: React.FC<ManualInsightsPanelProps> = ({
  className = '',
  organizationId
}) => {
  const { data: dashboardData } = useAsoData();
  const [showChoices, setShowChoices] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  
  const {
    insights,
    isLoading,
    isGenerating,
    generateConversionAnalysis,
    generateImpressionTrends,
    generateTrafficSourceAnalysis,
    generateKeywordOptimization,
    generateSeasonalAnalysis,
    generateComprehensiveInsights,
    hasInsightType
  } = useEnhancedAsoInsights({
    organizationId,
    metricsData: dashboardData,
    enabled: true
  });

  const handleRequestInsight = async (type: string) => {
    setCurrentAction(type);
    
    try {
      switch (type) {
        case 'cvr_analysis':
          await generateConversionAnalysis();
          break;
        case 'impression_trends':
          await generateImpressionTrends();
          break;
        case 'traffic_source_performance':
          await generateTrafficSourceAnalysis();
          break;
        case 'keyword_optimization':
          await generateKeywordOptimization();
          break;
        case 'seasonal_pattern':
          await generateSeasonalAnalysis();
          break;
        case 'comprehensive':
          await generateComprehensiveInsights();
          break;
      }
    } catch (error) {
      console.error('Failed to generate insight:', error);
    } finally {
      setCurrentAction('');
    }
  };

  const handleGenerateAll = async () => {
    setCurrentAction('comprehensive');
    await handleRequestInsight('comprehensive');
  };

  const handleShowChoices = () => {
    setShowChoices(true);
  };

  // Loading state during insight generation
  if (isGenerating && currentAction) {
    return (
      <Card className={`bg-gradient-to-br from-background to-muted/20 border ${className}`}>
        <InsightLoadingState actionType={currentAction} />
      </Card>
    );
  }

  // Results state - show insights if available
  if (insights.length > 0 && !showChoices) {
    return (
      <Card className={`bg-gradient-to-br from-background via-background to-primary/5 border ${className}`}>
        <InsightResults 
          insights={insights}
          onRequestMore={() => setShowChoices(true)}
          onRefresh={handleGenerateAll}
          isLoading={isLoading}
        />
      </Card>
    );
  }

  // Choice cards state
  if (showChoices) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="bg-gradient-to-br from-primary/5 to-background border">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Choose Your AI Analysis</CardTitle>
            <p className="text-muted-foreground">
              Select specific areas for deep AI-powered insights and recommendations
            </p>
          </CardHeader>
        </Card>

        <InsightRequestCards
          onRequestInsight={handleRequestInsight}
          isGenerating={isGenerating}
          hasInsightType={hasInsightType}
        />

        <div className="flex justify-center gap-4">
          <YodelButton 
            variant="primary" 
            size="lg"
            onClick={handleGenerateAll}
            disabled={isGenerating}
            leftIcon={<Zap className="h-5 w-5" />}
          >
            Generate All Insights
          </YodelButton>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => setShowChoices(false)}
          >
            Back to Results
          </Button>
        </div>
      </div>
    );
  }

  // Initial empty state - hero section
  return (
    <Card className={`bg-gradient-to-br from-primary/5 via-background to-secondary/5 border ${className}`}>
      <CardContent className="p-0">
        <HeroSection
          title="AI-Powered ASO Insights"
          subtitle="Unlock Strategic Recommendations"
          description="Get comprehensive analysis of your app's performance with AI-driven insights, optimization recommendations, and actionable strategies tailored to your data."
          primaryAction={{
            text: "Generate AI Insights",
            onClick: handleShowChoices
          }}
          secondaryAction={{
            text: "Quick Analysis",
            onClick: handleGenerateAll
          }}
          className="text-center"
        />
        
        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Smart Analysis</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes your metrics to find hidden patterns and opportunities
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Actionable Insights</h3>
              <p className="text-sm text-muted-foreground">
                Get specific recommendations you can implement immediately
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Fast Generation</h3>
              <p className="text-sm text-muted-foreground">
                Most insights generated in under 30 seconds
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};