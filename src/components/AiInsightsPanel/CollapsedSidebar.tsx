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
      className={`w-15 h-screen bg-background/50 border-l border-border flex flex-col items-center py-4 sidebar-container ${className}`}
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

      {/* AI Icon at Bottom */}
      <div className="mt-auto">
        <Sparkles className="w-5 h-5 text-purple-600/70" />
      </div>
    </div>
  );
};

export default CollapsedSidebar;

