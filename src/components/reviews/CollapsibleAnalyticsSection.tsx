/**
 * COLLAPSIBLE ANALYTICS SECTION
 * 
 * Wraps the AI Insights Dashboard in a collapsible container
 * that can be hidden when there's no meaningful data
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Brain, BarChart3, TrendingUp } from 'lucide-react';
import { AIInsightsDashboard } from './AIInsightsDashboard';
import { 
  EnhancedReviewItem, 
  ReviewIntelligence, 
  ActionableInsights, 
  ReviewAnalytics 
} from '@/types/review-intelligence.types';

interface CollapsibleAnalyticsSectionProps {
  reviews: EnhancedReviewItem[];
  intelligence: ReviewIntelligence | null;
  insights: ActionableInsights | null;
  analytics: ReviewAnalytics | null;
  onInsightAction?: (action: string, data?: any) => void;
}

export const CollapsibleAnalyticsSection: React.FC<CollapsibleAnalyticsSectionProps> = ({
  reviews,
  intelligence,
  insights,
  analytics,
  onInsightAction
}) => {
  // Determine if we have meaningful data to show
  const dataAvailability = useMemo(() => {
    const hasReviews = reviews && reviews.length > 0;
    const hasIntelligence = intelligence && intelligence.themes && intelligence.themes.length > 0;
    const hasInsights = insights && (
      (insights.priorityIssues && insights.priorityIssues.length > 0) ||
      (insights.improvements && insights.improvements.length > 0) ||
      (insights.alerts && insights.alerts.length > 0)
    );
    const hasAnalytics = analytics && analytics.totalReviews > 0;

    const meaningfulData = hasReviews && hasIntelligence && hasInsights && hasAnalytics;
    
    return {
      hasReviews,
      hasIntelligence,
      hasInsights,
      hasAnalytics,
      meaningfulData,
      dataScore: [hasReviews, hasIntelligence, hasInsights, hasAnalytics].filter(Boolean).length
    };
  }, [reviews, intelligence, insights, analytics]);

  // Start collapsed if no meaningful data
  const [isOpen, setIsOpen] = useState(dataAvailability.meaningfulData);

  // Don't render anything if no reviews at all
  if (!reviews || reviews.length === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (dataAvailability.meaningfulData) return 'text-success-foreground';
    if (dataAvailability.dataScore >= 2) return 'text-warning-foreground';
    return 'text-muted-foreground';
  };

  const getStatusText = () => {
    if (dataAvailability.meaningfulData) return 'Complete Analysis';
    if (dataAvailability.dataScore >= 2) return 'Partial Analysis';
    return 'Processing...';
  };

  return (
    <Card className="border-l-4 border-l-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">AI Review Analytics</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {reviews.length} Reviews
                  </Badge>
                  <span className={`text-xs ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>
            </div>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Preview stats when collapsed */}
          {!isOpen && dataAvailability.meaningfulData && (
            <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                <span>{analytics?.totalReviews || 0} analyzed</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{Math.round(analytics?.sentimentDistribution?.positive || 0)}% positive</span>
              </div>
              {insights?.priorityIssues && insights.priorityIssues.length > 0 && (
                <div className="text-warning-foreground">
                  {insights.priorityIssues.length} issues found
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CollapsibleContent className="animate-accordion-down">
          <CardContent className="pt-0">
            {dataAvailability.meaningfulData ? (
              <AIInsightsDashboard
                reviews={reviews}
                intelligence={intelligence!}
                insights={insights!}
                analytics={analytics!}
                onInsightAction={onInsightAction}
              />
            ) : (
              <div className="space-y-4">
                {/* Show what data we have and what's missing */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Analysis Status
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Review Data:</span>
                      <span className={dataAvailability.hasReviews ? 'text-success-foreground' : 'text-muted-foreground'}>
                        {dataAvailability.hasReviews ? `✓ ${reviews.length} reviews` : '○ No reviews'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Theme Intelligence:</span>
                      <span className={dataAvailability.hasIntelligence ? 'text-success-foreground' : 'text-muted-foreground'}>
                        {dataAvailability.hasIntelligence ? 
                          `✓ ${intelligence?.themes?.length || 0} themes` : '○ Processing...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actionable Insights:</span>
                      <span className={dataAvailability.hasInsights ? 'text-success-foreground' : 'text-muted-foreground'}>
                        {dataAvailability.hasInsights ? 
                          `✓ ${(insights?.priorityIssues?.length || 0) + (insights?.improvements?.length || 0)} insights` : 
                          '○ Processing...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Analytics Summary:</span>
                      <span className={dataAvailability.hasAnalytics ? 'text-success-foreground' : 'text-muted-foreground'}>
                        {dataAvailability.hasAnalytics ? 
                          `✓ ${analytics?.totalReviews || 0} analyzed` : '○ Processing...'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    {dataAvailability.dataScore < 4 ? 
                      'AI analysis is still processing. Check back in a few moments for complete insights.' :
                      'Analysis complete! Expand to view detailed insights.'
                    }
                  </div>
                </div>

                {/* Show partial data if available */}
                {analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{analytics.totalReviews}</p>
                          <p className="text-xs text-muted-foreground">Reviews Analyzed</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">Average Rating</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{Math.round(analytics.sentimentDistribution.positive)}%</p>
                          <p className="text-xs text-muted-foreground">Positive</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{analytics.criticalIssues || 0}</p>
                          <p className="text-xs text-muted-foreground">Critical Issues</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};