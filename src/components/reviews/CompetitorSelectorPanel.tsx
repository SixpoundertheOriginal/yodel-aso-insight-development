/**
 * COMPETITOR SELECTOR PANEL
 *
 * Interactive panel to toggle competitor visibility on charts
 * Syncs with useCompetitorChartFilters store
 */

import React from 'react';
import { Eye, EyeOff, Crown, Filter, HelpCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCompetitorChartFilters } from '@/hooks/useCompetitorChartFilters';

interface CompetitorSelectorPanelProps {
  className?: string;
  compact?: boolean;
}

export const CompetitorSelectorPanel: React.FC<CompetitorSelectorPanelProps> = ({
  className,
  compact = false,
}) => {
  const {
    competitors,
    toggleCompetitor,
    showAllCompetitors,
    hideAllCompetitors,
    resetToTopN,
    getVisibleCompetitors,
  } = useCompetitorChartFilters();

  const visibleCompetitors = getVisibleCompetitors();
  const visibleCount = visibleCompetitors.length;
  const totalCount = competitors.length;

  // Separate primary app from competitors
  const primaryApp = competitors.find((c) => c.isPrimary);
  const competitorApps = competitors.filter((c) => !c.isPrimary);

  if (competitors.length === 0) {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Chart Visibility</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Toggle competitors on/off to declutter charts. Your primary app is always visible.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Badge variant="outline" className="text-xs">
            {visibleCount} of {totalCount} visible
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Actions */}
        {!compact && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={showAllCompetitors}
              className="flex-1 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Show All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={hideAllCompetitors}
              className="flex-1 text-xs"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Hide All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => resetToTopN(3)}
              className="flex-1 text-xs"
            >
              Top 3
            </Button>
          </div>
        )}

        {/* Primary App */}
        {primaryApp && (
          <div className="pb-3 border-b">
            <div className="flex items-center gap-3">
              <img
                src={primaryApp.appIcon}
                alt={primaryApp.appName}
                className="h-10 w-10 rounded-lg border"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">
                    {primaryApp.appName}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Crown className="h-3.5 w-3.5 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Your primary app (always visible)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">Primary App</p>
              </div>
              <Switch
                checked={true}
                disabled={true}
                className="opacity-50"
              />
            </div>
          </div>
        )}

        {/* Competitor Apps */}
        <div className="space-y-3">
          {competitorApps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No competitors added yet
            </p>
          ) : (
            competitorApps.map((competitor) => (
              <div
                key={competitor.appId}
                className={cn(
                  'flex items-center gap-3 transition-opacity',
                  !competitor.isVisible && 'opacity-40'
                )}
              >
                <img
                  src={competitor.appIcon}
                  alt={competitor.appName}
                  className="h-10 w-10 rounded-lg border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {competitor.appName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {competitor.isVisible ? 'Visible on charts' : 'Hidden from charts'}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          checked={competitor.isVisible}
                          onCheckedChange={() => toggleCompetitor(competitor.appId)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {competitor.isVisible ? 'Hide' : 'Show'} {competitor.appName} on charts
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))
          )}
        </div>

        {/* Visibility Summary */}
        {!compact && competitorApps.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {visibleCount === totalCount && (
                <>All apps are visible on charts</>
              )}
              {visibleCount === 1 && (
                <>Only your primary app is visible. Toggle competitors to compare.</>
              )}
              {visibleCount > 1 && visibleCount < totalCount && (
                <>
                  {visibleCount - 1} competitor{visibleCount - 1 !== 1 ? 's' : ''} visible for comparison
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
