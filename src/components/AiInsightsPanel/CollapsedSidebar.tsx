import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  Sparkles,
  MessageCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface CollapsedSidebarProps {
  onExpand: () => void;
  insightCount: number;
  hasAlerts: boolean;
  hasChatActivity: boolean;
  className?: string;
}

export const CollapsedSidebar: React.FC<CollapsedSidebarProps> = ({
  onExpand,
  insightCount,
  hasAlerts,
  hasChatActivity,
  className = ''
}) => {
  return (
    <div
      className={`w-15 h-screen pt-16 bg-background/50 border-l border-border flex flex-col items-center py-4 sidebar-container ${className}`}
      role="complementary"
      aria-label="AI Insights Panel (Collapsed)"
    >
      {/* Expand Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExpand}
        className="mb-4 p-2 hover:bg-muted"
        title="Expand AI Insights"
        aria-label="Expand AI insights sidebar"
      >
        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
      </Button>

      {/* Enhanced Status Indicators with Tooltips */}
      <div className="flex flex-col gap-3 items-center">
        {/* Insight Count with Hover */}
        {insightCount > 0 && (
          <div
            className="relative group cursor-pointer"
            onClick={onExpand}
            title={`${insightCount} insights available - Click to expand`}
          >
            <Badge
              variant="secondary"
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium group-hover:scale-110 transition-transform"
            >
              {insightCount > 9 ? '9+' : insightCount}
            </Badge>
          </div>
        )}

        {/* Alert with Pulse */}
        {hasAlerts && (
          <div
            className="relative cursor-pointer group"
            onClick={onExpand}
            title="Performance alert - Click to view"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full status-indicator" />
          </div>
        )}

        {/* Chat Activity */}
        {hasChatActivity && (
          <div
            className="relative cursor-pointer group"
            onClick={onExpand}
            title="AI chat available - Click to start conversation"
          >
            <MessageCircle className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
        )}
      </div>

      {/* Premium AI Chat Teaser at Bottom */}
      <div className="mt-auto mb-2 flex flex-col items-center gap-1">
        <button
          onClick={onExpand}
          className="relative group w-12 h-12 rounded-full bg-gradient-to-br from-yodel-orange to-orange-600 shadow-lg ring-2 ring-orange-500/40 hover:ring-orange-400/60 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-400"
          title="Open AI Chat"
          aria-label="Open AI Chat"
        >
          {/* Subtle pulse halo */}
          <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping pointer-events-none"></span>
          {/* Icon layer */}
          <span className="relative inline-flex items-center justify-center w-full h-full text-background">
            <Sparkles className="w-6 h-6 drop-shadow-[0_0_6px_rgba(0,0,0,0.35)]" />
          </span>
        </button>
        <div className="text-[10px] font-medium tracking-wide text-orange-400 select-none" aria-hidden>
          AI Chat
        </div>
      </div>
    </div>
  );
};

export default CollapsedSidebar;
