import React, { useState } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  Plus, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { EnhancedInsightCard } from './EnhancedInsightCard';
import { EnhancedAsoInsight } from '@/hooks/useEnhancedAsoInsights';

interface InsightResultsProps {
  insights: EnhancedAsoInsight[];
  onRequestMore: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const InsightResults: React.FC<InsightResultsProps> = ({
  insights,
  onRequestMore,
  onRefresh,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxDisplayed = 3;
  
  const displayedInsights = isExpanded ? insights : insights.slice(0, maxDisplayed);
  const hasMoreInsights = insights.length > maxDisplayed;

  const highPriorityCount = insights.filter(i => i.priority === 'high').length;
  const userRequestedCount = insights.filter(i => i.is_user_requested).length;

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Insights Generated
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Analysis complete • {insights.length} insights found
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onRequestMore}
            >
              <Plus className="h-4 w-4 mr-1" />
              Request More
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            {insights.length} Total Insights
          </Badge>
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {highPriorityCount} High Priority
            </Badge>
          )}
          {userRequestedCount > 0 && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
              {userRequestedCount} User Requested
            </Badge>
          )}
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* High Priority Insights First */}
        {highPriorityCount > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-sm">High Priority Actions</h3>
            </div>
            <div className="grid gap-4">
              {insights
                .filter(insight => insight.priority === 'high')
                .slice(0, 2)
                .map((insight) => (
                  <EnhancedInsightCard key={insight.id} insight={insight} />
                ))
              }
            </div>
          </div>
        )}

        {/* All Insights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">All Insights</h3>
            {hasMoreInsights && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        View All ({insights.length})
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>

          <div className="grid gap-4">
            {displayedInsights.map((insight) => (
              <EnhancedInsightCard key={insight.id} insight={insight} />
            ))}
          </div>

          {hasMoreInsights && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid gap-4">
                  {insights.slice(maxDisplayed).map((insight) => (
                    <EnhancedInsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Call to Action */}
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Want more specific insights? Request targeted analysis for particular metrics or time periods.
          </p>
          <Button variant="outline" onClick={onRequestMore}>
            <Plus className="h-4 w-4 mr-2" />
            Request Specific Analysis
          </Button>
        </div>
      </CardContent>
    </>
  );
};