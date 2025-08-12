import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MetricsData, FilterContext, EnhancedAsoInsight } from '@/types/aso';
export type { EnhancedAsoInsight } from '@/types/aso';

export const useEnhancedAsoInsights = (
  organizationId: string,
  metricsData?: MetricsData,
  filterContext?: FilterContext
) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const ready = true;

  // Fetch existing insights from database
  const {
    data: existingInsights = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['enhanced-aso-insights', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map(insight => ({
        id: insight.id,
        title: insight.title,
        description: insight.content,
        type: insight.insight_type,
        priority: insight.priority,
        confidence: insight.confidence_score || 0,
        actionable_recommendations: insight.actionable_recommendations || [],
        metrics_impact: {
          impressions: 'See detailed analysis',
          downloads: 'See detailed analysis',
          conversion_rate: 'See detailed analysis'
        },
        related_kpis: insight.related_kpis || [],
        is_user_requested: insight.is_user_requested,
        created_at: insight.created_at
      })) as EnhancedAsoInsight[];
    },
    enabled: !!organizationId && ready,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Generate AI insights for specific analysis type
  const generateInsight = useCallback(async (
    insightType: string, 
    userRequested: boolean = true
  ): Promise<EnhancedAsoInsight[]> => {
    if (!metricsData || !organizationId) {
      throw new Error('Missing metrics data or organization ID');
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights-generator', {
        body: {
          metricsData,
          organizationId,
          insightType,
          userRequested,
          filterContext
        }
      });

      if (error) throw error;

      const insights = data.insights || [];
      
      // Refetch to get updated list
      await refetch();
      
      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Insight Generation Failed",
        description: "Unable to generate insights. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [metricsData, organizationId, refetch, toast]);

  // Generate comprehensive insights automatically
  const generateComprehensiveInsights = useCallback(async () => {
    return generateInsight('comprehensive', false);
  }, [generateInsight]);

  // Generate specific KPI insights
  const generateConversionAnalysis = useCallback(async () => {
    return generateInsight('cvr_analysis', true);
  }, [generateInsight]);

  const generateImpressionTrends = useCallback(async () => {
    return generateInsight('impression_trends', true);
  }, [generateInsight]);

  const generateTrafficSourceAnalysis = useCallback(async () => {
    return generateInsight('traffic_source_performance', true);
  }, [generateInsight]);

  const generateKeywordOptimization = useCallback(async () => {
    return generateInsight('keyword_optimization', true);
  }, [generateInsight]);

  const generateSeasonalAnalysis = useCallback(async () => {
    return generateInsight('seasonal_pattern', true);
  }, [generateInsight]);

  // Helper to check if specific insight type exists
  const hasInsightType = useCallback((type: string) => {
    return existingInsights.some(insight => insight.type === type);
  }, [existingInsights]);

  // Get high priority insights
  const highPriorityInsights = existingInsights.filter(
    insight => insight.priority === 'high'
  );

  // Get user requested insights
  const userRequestedInsights = existingInsights.filter(
    insight => insight.is_user_requested
  );

  return {
    // Data
    insights: existingInsights,
    highPriorityInsights,
    userRequestedInsights,

    // State
    isLoading,
    isGenerating,
    error,

    // Actions
    generateConversionAnalysis,
    generateImpressionTrends,
    generateTrafficSourceAnalysis,
    generateKeywordOptimization,
    generateSeasonalAnalysis,
    generateComprehensiveInsights,
    refetchInsights: refetch,

    // Utilities
    hasInsightType
  };
};