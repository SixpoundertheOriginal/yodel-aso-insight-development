import React, { useMemo } from 'react';
import { ResponsiveGrid, PremiumTypography } from '@/components/ui/premium';
import { Sparkles, Bot } from 'lucide-react';
import { AiInsightCard } from './AiInsightCard';
import { generateDemoInsights } from './DemoInsightsGenerator';
import { useEnhancedAsoInsights } from '@/hooks/useEnhancedAsoInsights';
import type { MetricsData, FilterContext } from '@/types/aso';

interface DashboardAiInsightsProps {
  metricsData: MetricsData | null;
  organizationId: string;
  isDemoMode?: boolean;
  filterContext?: FilterContext;
  isSuperAdmin?: boolean;
  onViewDetails?: (insight: any) => void;
}

export const DashboardAiInsights: React.FC<DashboardAiInsightsProps> = ({
  metricsData,
  organizationId,
  isDemoMode = false,
  filterContext,
  isSuperAdmin = false,
  onViewDetails
}) => {
  // Generate demo insights or use real insights
  const demoInsights = useMemo(() => {
    return isDemoMode ? generateDemoInsights(metricsData) : [];
  }, [isDemoMode, metricsData]);

  // Get real AI insights (will be empty if not enabled or in demo mode)
  const { insights: realInsights, isLoading } = useEnhancedAsoInsights(
    isDemoMode ? null : organizationId, 
    metricsData || undefined,
    filterContext,
    { 
      isSuperAdmin,
      enabled: !isDemoMode // Only enabled when not in demo mode
    }
  );

  // Use demo insights in demo mode, otherwise use real insights
  const insights = isDemoMode ? demoInsights : realInsights;

  // Show loading state only for real insights
  if (!isDemoMode && isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <PremiumTypography.SectionTitle gradient="orange">
            AI-Powered Insights
          </PremiumTypography.SectionTitle>
        </div>
        
        <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} gap="lg">
          {[1, 2, 3].map((index) => (
            <div 
              key={index}
              className="h-80 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse"
            />
          ))}
        </ResponsiveGrid>
      </div>
    );
  }

  // Don't render if no insights available
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <PremiumTypography.SectionTitle gradient="orange">
          AI-Powered Insights
        </PremiumTypography.SectionTitle>
        
        {isDemoMode && (
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Demo Mode</span>
          </div>
        )}
      </div>

      {/* Insights Grid */}
      <ResponsiveGrid 
        cols={{ default: 1, md: 2, lg: 3 }} 
        gap="lg"
        animated
      >
        {insights.slice(0, 3).map((insight) => (
          <AiInsightCard
            key={insight.id}
            insight={insight}
            onViewDetails={onViewDetails}
            isDemoMode={isDemoMode}
          />
        ))}
      </ResponsiveGrid>

      {/* Additional insights indicator */}
      {insights.length > 3 && (
        <div className="text-center">
          <PremiumTypography.Caption className="text-zinc-400">
            +{insights.length - 3} more insights available in detailed analysis
          </PremiumTypography.Caption>
        </div>
      )}
    </div>
  );
};