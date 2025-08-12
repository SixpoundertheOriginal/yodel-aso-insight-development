import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { useEnhancedAsoInsights } from '@/hooks/useEnhancedAsoInsights';
import { useAsoData } from '@/context/AsoDataContext';
import { InsightRequestCards } from './InsightRequestCards';
import { EnhancedInsightCard } from './EnhancedInsightCard';
import type { MetricsData, FilterContext, EnhancedAsoInsight } from '@/types/aso';
import { useTheme } from '@/hooks/useTheme';

interface ContextualInsightsSidebarProps {
  metricsData?: any; // accept any and cast internally for the hook
  organizationId: string;
}

export const ContextualInsightsSidebar: React.FC<ContextualInsightsSidebarProps> = ({
  metricsData,
  organizationId
}) => {
  const queryClient = useQueryClient();
  const { filters } = useAsoData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRequestCards, setShowRequestCards] = useState(false);
  // Initialize theme to ensure theme state is active
  useTheme();

  const getInsightFreshness = (insightCreatedAt: string, currentFilters: any) => {
    if (!insightCreatedAt) return { status: 'unknown', message: 'No timestamp' };

    const insightAge = Date.now() - new Date(insightCreatedAt).getTime();
    const isOld = insightAge > 5 * 60 * 1000; // 5 minutes

    return {
      status: isOld ? 'stale' : 'fresh',
      message: isOld
        ? `Generated ${Math.round(insightAge / 60000)} minutes ago - may not reflect current filters`
        : 'Current analysis'
    };
  };

// Create filter context (memoized to avoid recreation on each render)
const filterContext = useMemo((): FilterContext => ({
  dateRange: {
    start: filters.dateRange.from?.toISOString?.() || new Date().toISOString(),
    end: filters.dateRange.to?.toISOString?.() || new Date().toISOString(),
  },
  trafficSources: filters.trafficSources,
  selectedApps: filters.selectedApps,
}), [filters.dateRange, filters.trafficSources, filters.selectedApps]);

// Enhanced insights hook
const {
  insights,
  isLoading,
  error,
  generateComprehensiveInsights,
  generateConversionAnalysis,
  generateImpressionTrends,
  generateTrafficSourceAnalysis,
  generateKeywordOptimization,
  generateSeasonalAnalysis,
  refetchInsights
} = useEnhancedAsoInsights(organizationId, metricsData as MetricsData, filterContext);

// Track when we should auto-generate insights after filters change
const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);

// Clear cache when filters change
useEffect(() => {
  console.log('🐛 Filters changed, clearing insights cache');
  queryClient.removeQueries(['enhanced-aso-insights', organizationId]);
  setShouldAutoGenerate(true);
}, [filters.dateRange, filters.trafficSources, filters.selectedApps, organizationId, queryClient]);

// Auto-generate insights once metrics are ready
useEffect(() => {
  if (shouldAutoGenerate && metricsData && !isLoading) {
    console.log('🐛 Auto-generating insights for new filters');
    setShouldAutoGenerate(false);
    generateComprehensiveInsights();
  }
}, [shouldAutoGenerate, metricsData, isLoading, generateComprehensiveInsights]);

  // Get primary insight (highest priority)
  const primaryInsight = insights?.[0];
  const remainingInsights = insights?.slice(1) || [];

  // Filter context summary for display
  const getFilterSummary = () => {
    const parts: string[] = [];
    if (filterContext.trafficSources.length > 0 && filterContext.trafficSources.length < 8) {
      parts.push(`${filterContext.trafficSources.length} traffic source(s)`);
    }
    if (filterContext.selectedApps.length === 1) {
      parts.push('single app');
    }
    return parts.length > 0 ? parts.join(', ') : 'all data';
  };

  const hasInsights = insights && insights.length > 0;
  const needsGeneration = !hasInsights && !isLoading;

  const hasFiltersChanged = useMemo(() => {
    // Compare current filters with last insight generation
    // This would need to track last generation context
    return !hasInsights && !isLoading;
  }, [hasInsights, isLoading]);

  return (
    <div className="w-80 min-h-screen bg-background/50 border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-foreground">AI Insights</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Analyzing {getFilterSummary()}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Filter Change Alert */}
        {hasFiltersChanged && (
          <div className="p-4">
            <Card className="border-warning bg-warning/10">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-warning-foreground font-medium">
                      Insights need updating
                    </p>
                    <p className="text-xs text-warning-foreground/80 mt-1">
                      Generate insights for: {filterContext.trafficSources.join(', ') || 'all sources'} ({filterContext.dateRange.start} to {filterContext.dateRange.end})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Generating insights...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analyzing your current data view
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Primary Insight */}
        {primaryInsight && (
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                Key Finding
              </Badge>
              <div className="text-xs text-muted-foreground">
                {getInsightFreshness(primaryInsight.created_at, filterContext).message}
              </div>
            </div>
            <EnhancedInsightCard
              insight={primaryInsight}
              compact={true}
            />
          </div>
        )}

        {/* Expandable Additional Insights */}
        {remainingInsights.length > 0 && (
          <div className="px-4 pb-4">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto text-foreground">
                  <span className="text-sm font-medium">
                    {remainingInsights.length} more insights
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {remainingInsights.map((insight) => (
                  <EnhancedInsightCard
                    key={insight.id}
                    insight={insight}
                    compact={true}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

{/* Quick Request Cards */}
<div className="px-4 pb-4">
  <Collapsible open={showRequestCards} onOpenChange={setShowRequestCards}>
    <CollapsibleTrigger asChild>
      <Button variant="outline" className="w-full justify-between">
        <span className="text-sm">Request Specific Analysis</span>
        {showRequestCards ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-3">
      <InsightRequestCards 
        onRequestInsight={(type) => {
          switch (type) {
            case 'cvr_analysis':
              generateConversionAnalysis();
              break;
            case 'impression_trends':
              generateImpressionTrends();
              break;
            case 'traffic_source_performance':
              generateTrafficSourceAnalysis();
              break;
            case 'keyword_optimization':
              generateKeywordOptimization();
              break;
            case 'seasonal_pattern':
              generateSeasonalAnalysis();
              break;
            default:
              generateComprehensiveInsights();
          }
        }}
        isLoading={isLoading}
        layout="compact"
      />
    </CollapsibleContent>
  </Collapsible>
</div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-border bg-card">
        <div className="space-y-2">
{needsGeneration ? (
  <Button
    onClick={() => generateComprehensiveInsights()}
    disabled={isLoading || !metricsData}
    className="w-full"
  >
    <Sparkles className="w-4 h-4 mr-2" />
    Generate Insights
  </Button>
) : (
  <Button
    onClick={() => refetchInsights()}
    disabled={isLoading}
    variant="outline"
    className="w-full"
  >
    <TrendingUp className="w-4 h-4 mr-2" />
    Refresh Analysis
  </Button>
)}
          
          {hasInsights && (
            <Button 
              onClick={() => generateComprehensiveInsights()}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className="w-full text-xs"
            >
              Generate New Analysis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextualInsightsSidebar;
