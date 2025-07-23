
import { useMemo, useState, useEffect } from 'react';
import { useComparisonData } from './useComparisonData';
import { useAsoData } from '../context/AsoDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Insight, InsightType, InsightPriority } from '../components/InsightCard';

interface InsightGenerationConfig {
  anomalyThreshold: number;
  trendThreshold: number;
  maxInsights: number;
  enableAI: boolean;
}

const defaultConfig: InsightGenerationConfig = {
  anomalyThreshold: 30,
  trendThreshold: 15,
  maxInsights: 5,
  enableAI: true
};

interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

export const useAsoInsights = (config: Partial<InsightGenerationConfig> = {}) => {
  const { data, loading } = useAsoData();
  const periodComparison = useComparisonData('period');
  const finalConfig = { ...defaultConfig, ...config };
  
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Generate rule-based insights (existing logic)
  const ruleBasedInsights = useMemo((): Insight[] => {
    if (!data || loading || !periodComparison.current || !periodComparison.previous) {
      return [];
    }

    const generatedInsights: Insight[] = [];
    const { summary } = data;

    // Performance Anomaly Detection
    if (Math.abs(summary.impressions.delta) > finalConfig.anomalyThreshold) {
      const isPositive = summary.impressions.delta > 0;
      generatedInsights.push({
        id: `anomaly-impressions-${Date.now()}`,
        type: 'anomaly',
        priority: Math.abs(summary.impressions.delta) > 50 ? 'high' : 'medium',
        title: `Impressions ${isPositive ? 'Spike' : 'Drop'} Detected`,
        description: `Impressions ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(summary.impressions.delta).toFixed(1)}% vs previous period`,
        metric: 'Impressions Change',
        value: summary.impressions.delta,
        confidence: 95,
        actionable: true
      });
    }

    // Downloads anomaly
    if (Math.abs(summary.downloads.delta) > finalConfig.anomalyThreshold) {
      const isPositive = summary.downloads.delta > 0;
      generatedInsights.push({
        id: `anomaly-downloads-${Date.now()}`,
        type: 'anomaly',
        priority: Math.abs(summary.downloads.delta) > 50 ? 'high' : 'medium',
        title: `Download ${isPositive ? 'Surge' : 'Decline'} Alert`,
        description: `Downloads ${isPositive ? 'spiked' : 'dropped'} ${Math.abs(summary.downloads.delta).toFixed(1)}% vs previous period`,
        metric: 'Downloads Change',
        value: summary.downloads.delta,
        confidence: 92,
        actionable: true
      });
    }

    return generatedInsights.slice(0, finalConfig.maxInsights);
  }, [data, loading, periodComparison.current, periodComparison.previous, finalConfig]);

  // Fetch AI insights when data changes significantly
  useEffect(() => {
    const shouldFetchAI = finalConfig.enableAI && 
                         data?.summary && 
                         !loading && 
                         (ruleBasedInsights.length > 0 || Math.abs(data.summary.impressions.delta) > 10);

    if (shouldFetchAI) {
      fetchAIInsights();
    }
  }, [data?.summary, loading, ruleBasedInsights.length, finalConfig.enableAI]);

  const fetchAIInsights = async () => {
    if (!data?.summary || aiLoading) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }

      const response = await supabase.functions.invoke('ai-insights-generator', {
        body: {
          metricsData: data.summary,
          organizationId: profile.organization_id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setAiInsights(response.data.insights || []);
    } catch (error) {
      console.error('AI Insights fetch error:', error);
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Convert AI insights to common format
  const convertedAIInsights: Insight[] = useMemo(() => {
    return aiInsights.map(ai => ({
      id: ai.id,
      type: ai.type,
      priority: ai.priority,
      title: ai.title,
      description: ai.description,
      confidence: ai.confidence,
      actionable: ai.actionable
    }));
  }, [aiInsights]);

  // Combine AI and rule-based insights
  const combinedInsights = useMemo(() => {
    if (finalConfig.enableAI && convertedAIInsights.length > 0) {
      // Prioritize AI insights, supplement with rule-based
      const combined = [...convertedAIInsights];
      
      // Add rule-based insights that aren't covered by AI
      ruleBasedInsights.forEach(rule => {
        if (!combined.some(ai => ai.type === rule.type && ai.title.includes(rule.title.slice(0, 10)))) {
          combined.push(rule);
        }
      });
      
      return combined.slice(0, finalConfig.maxInsights);
    }
    
    return ruleBasedInsights;
  }, [convertedAIInsights, ruleBasedInsights, finalConfig]);

  const isLoadingInsights = loading || aiLoading;
  const hasInsights = combinedInsights.length > 0;

  return {
    insights: combinedInsights,
    loading: isLoadingInsights,
    hasInsights,
    aiEnabled: finalConfig.enableAI,
    aiError,
    refreshAIInsights: fetchAIInsights
  };
};
