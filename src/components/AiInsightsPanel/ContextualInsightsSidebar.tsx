import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  Bookmark,
  Download,
  History
} from 'lucide-react';
import { CollapsedSidebar } from './CollapsedSidebar';
import { useEnhancedAsoInsights } from '@/hooks/useEnhancedAsoInsights';
import { useAsoData } from '@/context/AsoDataContext';
import { EnhancedInsightCard } from './EnhancedInsightCard';
import { ConversationalChat, ConversationalChatHandle } from './ConversationalChat';
import { useConversationalChat } from '@/hooks/useConversationalChat';
import type { MetricsData, FilterContext } from '@/types/aso';
import { useTheme } from '@/hooks/useTheme';
import { SuperAdminOrganizationSelector } from '@/components/SuperAdminOrganizationSelector';

export type SidebarState = 'collapsed' | 'normal' | 'expanded' | 'fullscreen';

interface ContextualInsightsSidebarProps {
  metricsData?: MetricsData;
  organizationId: string | null;
  state?: SidebarState;
  onStateChange?: (state: SidebarState) => void;
  isSuperAdmin?: boolean;
}

export const ContextualInsightsSidebar: React.FC<ContextualInsightsSidebarProps> = ({
  metricsData,
  organizationId,
  state = 'normal',
  onStateChange,
  isSuperAdmin = false
}) => {
  const queryClient = useQueryClient();
  const { filters } = useAsoData();
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [internalState, setInternalState] = useState<SidebarState>('normal');
  const sidebarState = onStateChange ? state : internalState;
  const setSidebarState: React.Dispatch<React.SetStateAction<SidebarState>> = onStateChange || setInternalState;
  const [isMobile, setIsMobile] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const chatRef = useRef<ConversationalChatHandle>(null);

  const handleSaveConversation = () => {
    chatRef.current?.saveConversation();
  };

  const handleExportConversation = () => {
    chatRef.current?.exportConversation();
  };

  const handleShowHistory = () => {
    chatRef.current?.showHistory();
  };
  // Initialize theme to ensure theme state is active
  useTheme();

  useEffect(() => {
    const saved = localStorage.getItem(`ai-sidebar-state-${organizationId}`);
    if (saved !== null && !onStateChange) {
      setInternalState(saved as SidebarState);
    }
  }, [organizationId, onStateChange]);

  useEffect(() => {
    if (!onStateChange) {
      localStorage.setItem(`ai-sidebar-state-${organizationId}`, internalState);
    }
  }, [internalState, organizationId, onStateChange]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !onStateChange) {
        setInternalState('collapsed');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [onStateChange]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setSidebarState(sidebarState === 'collapsed' ? 'normal' : 'collapsed');
      }
      if (e.key === 'Escape') {
        if (sidebarState === 'fullscreen') {
          setSidebarState('normal');
        } else if (isMobile && sidebarState !== 'collapsed') {
          setSidebarState('collapsed');
        }
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [sidebarState, isMobile, setSidebarState]);

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 320 && newWidth <= 800) {
          setChatPanelWidth(newWidth);
        }
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const getInsightFreshness = (insightCreatedAt: string) => {
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

// Enhanced insights hook - handle super admin without organization
  const {
    insights,
    isLoading,
    generateComprehensiveInsights,
    refetchInsights
  } = useEnhancedAsoInsights(organizationId, metricsData as MetricsData, filterContext, { isSuperAdmin });

  const statusIndicators = useMemo(() => ({
    insightCount: insights?.length || 0,
    hasAlerts: insights?.some((insight) => insight.priority === 'high') || false,
    hasChatActivity: false,
  }), [insights]);

// Conversational chat hook - only initialize when we have valid data
const { generateChatResponse, isGenerating: isChatGenerating } = useConversationalChat({
  organizationId: organizationId || '',
  metricsData: metricsData as MetricsData,
  filterContext: filterContext || {
    dateRange: { start: new Date().toISOString(), end: new Date().toISOString() },
    trafficSources: [],
    selectedApps: []
  }
});

// Track when we should auto-generate insights after filters change
const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);

// Clear cache when filters change
useEffect(() => {
  queryClient.removeQueries({ queryKey: ['enhanced-aso-insights', organizationId] });
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

  const toggleFullscreen = () => {
    setSidebarState(current =>
      current === 'fullscreen' ? 'normal' : 'fullscreen'
    );
  };

  const sidebarContent = (
    <>
      {/* Header with Collapse Button */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-foreground">AI Insights</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newState = sidebarState === 'expanded' ? 'normal' : 'expanded';
                setSidebarState(newState);
                setChatPanelWidth(newState === 'expanded' ? 600 : 384);
              }}
              className="p-1 hover:bg-muted"
              title={sidebarState === 'expanded' ? 'Shrink sidebar' : 'Expand sidebar'}
              aria-label={sidebarState === 'expanded' ? 'Shrink AI insights sidebar' : 'Expand AI insights sidebar'}
            >
              {sidebarState === 'expanded' ? (
                <ChevronsRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronsLeft className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="p-1 hover:bg-muted"
              title={sidebarState === 'fullscreen' ? 'Exit fullscreen' : 'Expand fullscreen'}
              aria-label={sidebarState === 'fullscreen' ? 'Exit fullscreen mode' : 'Expand AI insights fullscreen'}
            >
              {sidebarState === 'fullscreen' ? (
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarState('collapsed')}
              className="p-1 hover:bg-muted"
              title="Collapse sidebar (Ctrl+\\)"
              aria-label="Collapse AI insights sidebar"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Analyzing {getFilterSummary()}
        </p>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto sidebar-content ${sidebarState === 'fullscreen' ? 'flex flex-col' : ''}`}> 
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
                {getInsightFreshness(primaryInsight.created_at).message}
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
        <div
          className={`px-4 pb-4 ${
            sidebarState === 'fullscreen' ? 'flex flex-col flex-1 min-h-0' : ''
          }`}
        >
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between gap-2 p-3 border-b">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Ask Your Marketing Expert</h3>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  AI
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveConversation}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Save conversation"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportConversation}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Export conversation"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleShowHistory}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Conversation history"
                >
                  <History className="h-4 w-4" />
                </button>
              </div>
            </div>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ConversationalChat
                ref={chatRef}
                metricsData={metricsData as MetricsData}
                filterContext={filterContext}
                organizationId={organizationId}
                onGenerateInsight={generateChatResponse}
                isGenerating={isChatGenerating}
                className="flex-1"
              />
            </CardContent>
          </Card>
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

  // Super admin without organization - show organization selector
  if (isSuperAdmin && !organizationId) {
    return (
      <div className="h-screen bg-background/50 border-l border-border flex flex-col items-center justify-center p-6">
        <SuperAdminOrganizationSelector className="w-full max-w-md" />
      </div>
    );
  }

  if (sidebarState === 'collapsed') {
    return (
      <>
        <CollapsedSidebar
          onExpand={() => setSidebarState('normal')}
          {...statusIndicators}
          className={`transition-all duration-300 ease-in-out ${isMobile ? 'w-12' : 'w-15'}`}
        />
        {isMobile && (
          <Button
            onClick={() => setSidebarState('normal')}
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

  if (sidebarState === 'fullscreen') {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarState('normal')}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-background dark:bg-gray-900 w-3/4 h-3/4 mx-auto my-auto rounded-lg shadow-2xl overflow-hidden flex flex-col">
            {sidebarContent}
          </div>
        </div>
      </>
    );
  }

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-15 mobile-overlay"
          onClick={() => setSidebarState('collapsed')}
        />
        <div className="fixed inset-y-0 right-0 w-full max-w-sm z-20 transition-transform duration-300 sidebar-container" role="complementary" aria-label="AI Insights Panel">
          {sidebarContent}
        </div>
      </>
    );
  }

  return (
    <div
      className="h-screen bg-background/50 border-l border-border flex flex-col transition-all duration-300 ease-in-out sidebar-container relative"
      style={{ width: `${chatPanelWidth}px` }}
      role="complementary"
      aria-label="AI Insights Panel"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-orange-500 cursor-col-resize z-10"
        onMouseDown={handleResizeStart}
        title="Drag to resize AI chat panel"
      />
      {sidebarContent}
    </div>
  );
};

export default ContextualInsightsSidebar;
