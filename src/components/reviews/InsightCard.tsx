/**
 * AI-POWERED INSIGHT CARD COMPONENT
 * 
 * Displays actionable insights with metrics and recommendations
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Info, AlertCircle } from 'lucide-react';
import { InsightCard as InsightCardType } from '@/types/review-intelligence.types';

interface InsightCardProps {
  insight: InsightCardType;
  onActionClick?: (action: string) => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onActionClick }) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-info bg-info/10 border-info/20';
      default: return 'text-muted-foreground bg-muted/50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down') => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-success" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-destructive" />;
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold line-clamp-2">
            {insight.title}
          </CardTitle>
          <Badge 
            variant="secondary"
            className={`ml-2 flex items-center gap-1 ${getUrgencyColor(insight.urgency)}`}
          >
            {getUrgencyIcon(insight.urgency)}
            <span className="capitalize text-xs">{insight.urgency}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI-Generated Insight */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {insight.insight}
        </p>

        {/* Primary Metric */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{insight.metrics.primary.value}</span>
              {getTrendIcon(insight.metrics.primary.trend)}
            </div>
            <p className="text-xs text-muted-foreground">{insight.metrics.primary.label}</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        {insight.metrics.secondary.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {insight.metrics.secondary.slice(0, 2).map((metric, index) => (
              <div key={index} className="text-center p-2 bg-background border rounded">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-semibold">{metric.value}</span>
                  {getTrendIcon(metric.trend)}
                </div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {insight.actions.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {insight.actions.slice(0, 2).map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => onActionClick?.(action.action)}
                className="w-full justify-between text-xs h-8"
              >
                <span>{action.label}</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};