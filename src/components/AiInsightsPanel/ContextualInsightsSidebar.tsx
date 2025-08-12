import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { CollapsedSidebar } from './CollapsedSidebar';
import { useEnhancedAsoInsights } from '@/hooks/useEnhancedAsoInsights';
import { useAsoData } from '@/context/AsoDataContext';
import { EnhancedInsightCard } from './EnhancedInsightCard';
import { ConversationalChat } from './ConversationalChat';
import { useConversationalChat } from '@/hooks/useConversationalChat';
import type { MetricsData, FilterContext } from '@/types/aso';
import { useTheme } from '@/hooks/useTheme';

interface ContextualInsightsSidebarProps {
  metricsData?: MetricsData;
  organizationId: string;
  isExpanded?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
}

export const ContextualInsightsSidebar: React.FC<ContextualInsightsSidebarProps> = ({
  metricsData,
  organizationId,
  isExpanded = true,
  onToggleExpanded
}) => {
  const queryClient = useQueryClient();
  const { filters } = useAsoData();
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(true);
  const expanded = onToggleExpanded ? isExpanded : internalExpanded;
  const setExpanded = onToggleExpanded || setInternalExpanded;
  const [isMobile, setIsMobile] = useState(false);
  // Initialize theme to ensure theme state is active
  useTheme();

  useEffect(() => {
    const saved = localStorage.getItem(`ai-sidebar-expanded-${organizationId}`);
    if (saved !== null && !onToggleExpanded) {
      setInternalExpanded(JSON.parse(saved));
    }
  }, [organizationId, onToggleExpanded]);

  useEffect(() => {
    if (!onToggleExpanded) {
      localStorage.setItem(`ai-sidebar-expanded-${organizationId}`, JSON.stringify(internalExpanded));
    }
  }, [internalExpanded, organizationId, onToggleExpanded]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !onToggleExpanded) {
        setInternalExpanded(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [onToggleExpanded]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setExpanded(!expanded);
      }
      if (e.key === 'Escape' && isMobile && expanded) {
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [expanded, isMobile, setExpanded]);

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
    generateComprehensiveInsights,
    refetchInsights
  } = useEnhancedAsoInsights(organizationId, metricsData as MetricsData, filterContext);

  const statusIndicators = useMemo(() => ({
    insightCount: insights?.length || 0,
    hasAlerts:
      insights?.some(
        (insight) => insight.priority === 'high' || insight.priority === 'critical'
      ) || false,
    hasChatActivity: false,
  }), [insights]);

// Conversational chat hook
const { generateChatResponse, isGenerating: isChatGenerating } = useConversationalChat({
  organizationId,
  metricsData: metricsData as MetricsData,
  filterContext
});

// Track when we should auto-generate insights after filters change
const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);

// Clear cache when filters change
useEffect(() => {
  queryClient.removeQueries(['enhanced-aso-insights', organizationId]);
  setShouldAutoGenerate(true);
}, [filters.dateRange, filters.trafficSources, filters.selectedApps, organizationId, queryClient]);

// Auto-generate insights once metrics are ready
useEffect(() => {
  if (shouldAutoGenerate && metricsData && !isLoading) {
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

  const sidebarContent = (
    <>
      {/* Header with Collapse Button */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-foreground">AI Insights</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="p-1 hover:bg-muted"
            title="Collapse sidebar (Ctrl+\\)"
            aria-label="Collapse AI insights sidebar"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Analyzing {getFilterSummary()}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto sidebar-content">
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
            <Collapsible open={isListExpanded} onOpenChange={setIsListExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto text-foreground">
                  <span className="text-sm font-medium">
                    {remainingInsights.length} more insights
                  </span>
                  {isListExpanded ? (
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

        {/* Conversational Chat */}
        <div className="px-4 pb-4">
          <ConversationalChat
            metricsData={metricsData as MetricsData}
            filterContext={filterContext}
            organizationId={organizationId}
            onGenerateInsight={generateChatResponse}
            isGenerating={isChatGenerating}
          />
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card">
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
    </>
  );

  if (!expanded) {
    return (
      <>
        <CollapsedSidebar
          onExpand={() => setExpanded(true)}
          {...statusIndicators}
          className={`transition-all duration-300 ease-in-out ${isMobile ? 'w-12' : 'w-15'}`}
        />
        {isMobile && (
          <Button
            onClick={() => setExpanded(true)}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg z-20"
            title="Open AI Insights"
            aria-label="Open AI Insights"
          >
            <Sparkles className="w-5 h-5" />
          </Button>
        )}
      </>
    );
  }

  if (expanded && isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-15 mobile-overlay"
          onClick={() => setExpanded(false)}
        />
        <div className="fixed inset-y-0 right-0 w-full max-w-sm z-20 transition-transform duration-300 sidebar-container" role="complementary" aria-label="AI Insights Panel">
          {sidebarContent}
        </div>
      </>
    );
  }

  return (
    <div className="w-80 h-screen bg-background/50 border-l border-border flex flex-col transition-all duration-300 ease-in-out sidebar-container" role="complementary" aria-label="AI Insights Panel">
      {sidebarContent}
    </div>
  );
};

export default ContextualInsightsSidebar;
