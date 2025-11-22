/**
 * Creative Insights Panel Component
 *
 * Displays AI-generated creative insights and recommendations.
 *
 * Phase 0: Placeholder implementation (21.11.2025)
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CreativeInsight } from '../types';

interface CreativeInsightsPanelProps {
  insights: CreativeInsight[];
  onInsightClick?: (insight: CreativeInsight) => void;
}

const priorityColors = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
} as const;

const categoryLabels = {
  messaging: 'Messaging',
  design: 'Design',
  layout: 'Layout',
  cta: 'Call-to-Action',
  'social-proof': 'Social Proof',
  features: 'Features',
};

export function CreativeInsightsPanel({ insights, onInsightClick }: CreativeInsightsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Creative Insights</CardTitle>
        <CardDescription>AI-generated recommendations for creative optimization</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No insights available</p>
            <p className="text-sm mt-2">
              Phase 0: Will display AI-generated creative insights here
            </p>
            <p className="text-sm mt-1">
              Phase 4: Insights will analyze messaging, design, and creative strategy
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="border rounded-lg p-4 cursor-pointer hover:border-primary"
                onClick={() => onInsightClick?.(insight)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityColors[insight.priority]}>
                      {insight.priority}
                    </Badge>
                    <Badge variant="outline">
                      {categoryLabels[insight.category]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(insight.generatedAt).toLocaleDateString()}
                  </p>
                </div>

                <h3 className="font-semibold mb-1">{insight.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>

                {insight.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Recommendations:</p>
                    {insight.recommendations.slice(0, 2).map((rec, index) => (
                      <p key={index} className="text-xs text-muted-foreground pl-3">
                        • {rec}
                      </p>
                    ))}
                    {insight.recommendations.length > 2 && (
                      <p className="text-xs text-muted-foreground pl-3">
                        +{insight.recommendations.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
