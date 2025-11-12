import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Clock, ThumbsUp, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GooglePlayMetricsProps {
  responseRate: number;           // 0-1
  avgResponseTimeHours: number;
  reviewsWithReplies: number;
  helpfulReviewsCount: number;
}

export const GooglePlayMetricsPanel: React.FC<GooglePlayMetricsProps> = ({
  responseRate,
  avgResponseTimeHours,
  reviewsWithReplies,
  helpfulReviewsCount
}) => {
  const responseRatePercent = (responseRate * 100).toFixed(1);
  const avgResponseTimeDays = (avgResponseTimeHours / 24).toFixed(1);

  // Calculate engagement score
  const engagementScore = calculateEngagementScore(responseRate, avgResponseTimeHours);
  const engagementColor = getEngagementColor(engagementScore);

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Developer Engagement (Google Play)
          <Badge variant={engagementColor} className="ml-auto">
            {engagementScore}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Response Rate</div>
            <div className="text-2xl font-bold text-blue-600">{responseRatePercent}%</div>
            <div className="text-xs text-muted-foreground">
              {reviewsWithReplies} reviews replied
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Avg Response Time
            </div>
            <div className="text-2xl font-bold text-blue-600">{avgResponseTimeDays}d</div>
            <div className="text-xs text-muted-foreground">
              {avgResponseTimeHours.toFixed(1)} hours
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              Helpful Reviews
            </div>
            <div className="text-2xl font-bold text-blue-600">{helpfulReviewsCount}</div>
            <div className="text-xs text-muted-foreground">
              5+ thumbs up
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Engagement Score
            </div>
            <div className="text-2xl font-bold text-blue-600">{engagementScore}</div>
            <div className="text-xs text-muted-foreground">
              {getEngagementDescription(engagementScore)}
            </div>
          </div>
        </div>

        {/* Insights */}
        {responseRate > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900">
            <div className="text-sm">
              <span className="font-medium">Insight: </span>
              <span className="text-muted-foreground">
                {getEngagementInsight(responseRate, avgResponseTimeHours)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper functions
function calculateEngagementScore(rate: number, hours: number): string {
  // High rate (>50%) + fast response (<24h) = A+
  // High rate + slow response = B
  // Low rate (<20%) = C or below
  if (rate > 0.5 && hours < 24) return 'A+';
  if (rate > 0.5 && hours < 72) return 'A';
  if (rate > 0.4 && hours < 48) return 'A-';
  if (rate > 0.3) return 'B';
  if (rate > 0.2) return 'C';
  if (rate > 0.1) return 'D';
  return 'F';
}

function getEngagementColor(score: string): "default" | "secondary" | "destructive" | "outline" {
  if (score.startsWith('A')) return 'default';
  if (score === 'B') return 'secondary';
  return 'destructive';
}

function getEngagementDescription(score: string): string {
  const descriptions: Record<string, string> = {
    'A+': 'Excellent engagement',
    'A': 'Very good engagement',
    'A-': 'Good engagement',
    'B': 'Moderate engagement',
    'C': 'Fair engagement',
    'D': 'Low engagement',
    'F': 'Poor engagement'
  };
  return descriptions[score] || 'No data';
}

function getEngagementInsight(rate: number, hours: number): string {
  if (rate > 0.5 && hours < 24) {
    return 'Developer is highly responsive, replying to over half of reviews within 24 hours. This builds strong user trust.';
  } else if (rate > 0.3 && hours < 72) {
    return 'Developer actively engages with users, responding to reviews within 3 days on average.';
  } else if (rate > 0.1) {
    return 'Developer occasionally responds to reviews. Consider increasing response rate to improve user satisfaction.';
  } else {
    return 'Developer rarely responds to reviews. Engaging with users could significantly improve app perception.';
  }
}
