import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PremiumCard, PremiumCardContent } from '@/components/ui/design-system/PremiumCard';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Maximize2,
  Minimize2,
  Bookmark,
  Download,
  History
} from 'lucide-react';
import { CollapsedSidebar } from './CollapsedSidebar';
import { useAsoData } from '@/context/AsoDataContext';
import { ConversationalChat, ConversationalChatHandle } from './ConversationalChat';
import { useConversationalChat } from '@/hooks/useConversationalChat';
import type { MetricsData, FilterContext } from '@/types/aso';
import { useTheme } from '@/hooks/useTheme';
import { SuperAdminOrganizationSelector } from '@/components/SuperAdminOrganizationSelector';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';

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
  const { filters } = useAsoData();
  const { isDemoOrg } = useDemoOrgDetection();
  const [internalState, setInternalState] = useState<SidebarState>('collapsed');
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


// Create filter context (memoized to avoid recreation on each render)
const filterContext = useMemo((): FilterContext => ({
  dateRange: {
    start: filters.dateRange.from?.toISOString?.() || new Date().toISOString(),
    end: filters.dateRange.to?.toISOString?.() || new Date().toISOString(),
  },
  trafficSources: filters.trafficSources,
  selectedApps: filters.selectedApps,
}), [filters.dateRange, filters.trafficSources, filters.selectedApps]);

  const statusIndicators = useMemo(() => ({
    insightCount: 0,
    hasAlerts: false,
    hasChatActivity: false,
  }), []);

// Conversational chat hook - only initialize when we have valid data
const { generateChatResponse, isGenerating: isChatGenerating } = useConversationalChat({
  organizationId: organizationId || '',
  metricsData: metricsData as MetricsData,
  filterContext: filterContext || {
    dateRange: { start: new Date().toISOString(), end: new Date().toISOString() },
    trafficSources: [],
    selectedApps: []
  },
  isDemoMode: isDemoOrg || metricsData?.meta?.isDemo
});


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
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-foreground">AI Chat</h3>
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
              aria-label={sidebarState === 'expanded' ? 'Shrink AI chat sidebar' : 'Expand AI chat sidebar'}
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
              aria-label={sidebarState === 'fullscreen' ? 'Exit fullscreen mode' : 'Expand AI chat fullscreen'}
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
              aria-label="Collapse AI chat sidebar"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto sidebar-content ${sidebarState === 'fullscreen' ? 'flex flex-col' : ''}`}> 




        {/* Conversational Chat */}
        <div
          className={`px-4 pb-4 ${
            sidebarState === 'fullscreen' ? 'flex flex-col flex-1 min-h-0' : ''
          }`}
        >
          <PremiumCard 
            variant="glass" 
            intensity="strong" 
            glowColor="orange"
            className="h-full flex flex-col backdrop-blur-xl border-orange-500/20 bg-zinc-900/80"
          >
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
            <PremiumCardContent className="flex-1 p-0 flex flex-col">
              <ConversationalChat
                ref={chatRef}
                metricsData={metricsData as MetricsData}
                filterContext={filterContext}
                organizationId={organizationId}
                onGenerateInsight={generateChatResponse}
                isGenerating={isChatGenerating}
                className="flex-1"
                isDemoMode={isDemoOrg || metricsData?.meta?.isDemo}
              />
            </PremiumCardContent>
          </PremiumCard>
        </div>
      </div>

    </>
  );

  // Super admin without organization - show organization selector
  if (isSuperAdmin && !organizationId) {
    return (
      <div className="h-screen bg-background/50 border-l border-border flex flex-col items-center justify-center p-6">
        <SuperAdminOrganizationSelector 
          className="w-full max-w-md" 
          onOrgChange={() => {}} // Placeholder - will be handled by parent context
        />
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
            title="Open AI Chat"
            aria-label="Open AI Chat"
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
          className="fixed top-16 left-0 right-0 bottom-0 z-30 bg-black/50"
          onClick={() => setSidebarState('normal')}
        />
        <div className="fixed top-16 left-0 right-0 bottom-0 z-35 flex items-center justify-center">
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
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-15 mobile-overlay"
          onClick={() => setSidebarState('collapsed')}
        />
        <div className="fixed top-16 right-0 bottom-0 w-full max-w-sm z-20 transition-transform duration-300 sidebar-container" role="complementary" aria-label="AI Chat Panel">
          {sidebarContent}
        </div>
      </>
    );
  }

  return (
    <div
      className="h-screen pt-16 bg-background/50 border-l border-border flex flex-col transition-all duration-300 ease-in-out sidebar-container relative"
      style={{ width: `${chatPanelWidth}px` }}
      role="complementary"
      aria-label="AI Chat Panel"
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
