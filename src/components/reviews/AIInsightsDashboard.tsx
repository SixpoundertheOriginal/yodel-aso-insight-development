/**
 * AI INSIGHTS DASHBOARD
 * 
 * Main dashboard component displaying enhanced review intelligence
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Users, Star } from 'lucide-react';
import { InsightCard } from './InsightCard';
import { PatternVisualization } from './PatternVisualization';
import { 
  EnhancedReviewItem, 
  ReviewIntelligence, 
  ActionableInsights, 
  InsightCard as InsightCardType,
  ReviewAnalytics 
} from '@/types/review-intelligence.types';

interface AIInsightsDashboardProps {
  reviews: EnhancedReviewItem[];
  intelligence: ReviewIntelligence;
  insights: ActionableInsights;
  analytics: ReviewAnalytics;
  onInsightAction?: (action: string, data?: any) => void;
}

export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({
  reviews,
  intelligence,
  insights,
  analytics,
  onInsightAction
}) => {
  // Generate dynamic insight cards
  const insightCards: InsightCardType[] = React.useMemo(() => {
    const cards: InsightCardType[] = [];

    // Critical Issues Card
    if (insights.priorityIssues.length > 0) {
      const criticalIssues = insights.priorityIssues.filter(issue => issue.urgency === 'immediate' || issue.urgency === 'high');
      cards.push({
        title: 'Critical Issues Detected',
        insight: `${criticalIssues.length} high-priority issues affecting user experience. Most critical: ${insights.priorityIssues[0]?.issue || 'None'}`,
        metrics: {
          primary: { 
            value: criticalIssues.length, 
            label: 'Critical Issues',
            trend: criticalIssues.length > 2 ? 'up' : undefined
          },
          secondary: [
            { 
              value: Math.round((insights.priorityIssues[0]?.affectedUsers || 0)), 
              label: 'Affected Users' 
            },
            { 
              value: Math.round((insights.priorityIssues[0]?.impact || 0) * 100), 
              label: 'Impact %' 
            }
          ]
        },
        actions: [
          { label: 'View Issue Details', action: 'view_priority_issues' },
          { label: 'Export Issue Report', action: 'export_issues' }
        ],
        urgency: criticalIssues.length > 2 ? 'high' : criticalIssues.length > 0 ? 'medium' : 'low'
      });
    }

    // Sentiment Overview Card
    const sentimentTrend = analytics.sentimentDistribution.positive > 60 ? 'up' : 
                          analytics.sentimentDistribution.negative > 30 ? 'down' : undefined;
    cards.push({
      title: 'Sentiment Overview',
      insight: `Overall sentiment is ${analytics.sentimentDistribution.positive > 60 ? 'positive' : analytics.sentimentDistribution.negative > 30 ? 'concerning' : 'mixed'}. ${Math.round(analytics.sentimentDistribution.positive)}% of reviews are positive.`,
      metrics: {
        primary: { 
          value: Math.round(analytics.sentimentDistribution.positive), 
          label: 'Positive Reviews %',
          trend: sentimentTrend
        },
        secondary: [
          { value: analytics.averageRating, label: 'Avg Rating' },
          { value: analytics.totalReviews, label: 'Total Reviews' }
        ]
      },
      actions: [
        { label: 'View Sentiment Details', action: 'view_sentiment' },
        { label: 'Filter Negative Reviews', action: 'filter_negative' }
      ],
      urgency: analytics.sentimentDistribution.negative > 30 ? 'high' : 'medium'
    });

    // Top Opportunities Card
    if (insights.improvements.length > 0) {
      const topOpportunity = insights.improvements[0];
      cards.push({
        title: 'Growth Opportunities',
        insight: `${insights.improvements.length} improvement opportunities identified. Top recommendation: ${topOpportunity.opportunity}`,
        metrics: {
          primary: { 
            value: Math.round(topOpportunity.roi), 
            label: 'ROI Score' 
          },
          secondary: [
            { value: Math.round(topOpportunity.userDemand * 100), label: 'User Demand %' },
            { value: insights.improvements.length, label: 'Total Opportunities' }
          ]
        },
        actions: [
          { label: 'View All Opportunities', action: 'view_opportunities' },
          { label: 'Prioritize Features', action: 'prioritize_features' }
        ],
        urgency: topOpportunity.businessImpact === 'high' ? 'high' : 'medium'
      });
    }

    // Theme Analysis Card
    if (intelligence.themes.length > 0) {
      const topTheme = intelligence.themes[0];
      cards.push({
        title: 'Theme Analysis',
        insight: `"${topTheme.theme}" is the most discussed topic with ${topTheme.frequency} mentions. Sentiment is ${topTheme.sentiment > 0 ? 'positive' : 'negative'}.`,
        metrics: {
          primary: { 
            value: intelligence.themes.length, 
            label: 'Themes Identified' 
          },
          secondary: [
            { value: topTheme.frequency, label: 'Top Theme Mentions' },
            { value: Math.round(Math.abs(topTheme.sentiment) * 100), label: 'Theme Sentiment %' }
          ]
        },
        actions: [
          { label: 'Explore Themes', action: 'view_themes' },
          { label: 'Theme Timeline', action: 'view_theme_timeline' }
        ],
        urgency: 'medium'
      });
    }

    return cards;
  }, [insights, analytics, intelligence]);

  const handleInsightAction = (action: string) => {
    onInsightAction?.(action, { reviews, intelligence, insights });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Review Intelligence</h2>
        </div>
        <Badge variant="secondary" className="text-xs">
          {reviews.length} Reviews Analyzed
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalReviews}</p>
                <p className="text-xs text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{analytics.criticalIssues}</p>
                <p className="text-xs text-muted-foreground">Critical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{Math.round(analytics.sentimentDistribution.positive)}%</p>
                <p className="text-xs text-muted-foreground">Positive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insightCards.map((card, index) => (
          <InsightCard 
            key={index} 
            insight={card} 
            onActionClick={handleInsightAction}
          />
        ))}
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <PatternVisualization intelligence={intelligence} reviews={reviews} />
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Priority Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.priorityIssues.map((issue, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Badge 
                      variant={issue.urgency === 'immediate' ? 'destructive' : 
                              issue.urgency === 'high' ? 'secondary' : 'outline'}
                      className="mt-1"
                    >
                      {issue.urgency}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{issue.issue}</p>
                      <p className="text-xs text-muted-foreground mt-1">{issue.recommendation}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Impact: {Math.round(issue.impact * 100)}%</span>
                        <span>Affected Users: ~{issue.affectedUsers}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Improvement Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.improvements.map((improvement, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Badge variant="outline" className="mt-1">
                      ROI: {Math.round(improvement.roi)}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{improvement.opportunity}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Demand: {Math.round(improvement.userDemand * 100)}%</span>
                        <span>Impact: {improvement.businessImpact}</span>
                        <span>Effort: {improvement.effort}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Trend Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.alerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Badge 
                      variant={alert.severity === 'critical' ? 'destructive' : 
                              alert.severity === 'warning' ? 'secondary' : 'outline'}
                      className="mt-1"
                    >
                      {alert.severity}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">Type: {alert.type.replace('_', ' ')}</p>
                      {alert.actionable && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 h-6 text-xs"
                          onClick={() => handleInsightAction(`alert_${alert.type}`)}
                        >
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};