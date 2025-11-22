/**
 * AI Creative Insights Panel Component
 *
 * Main orchestration component that displays AI-generated creative insights.
 * Handles loading, error, empty, and success states.
 *
 * Phase 3: AI Creative Insights Layer
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertCircle, Info } from 'lucide-react';
import { AiCreativeInsights } from '../services/aiCreativeInsightsService';
import { CreativeOpportunityList } from './CreativeOpportunityList';
import { CreativeTestPlanGenerator } from './CreativeTestPlanGenerator';
import { CreativeThemeNarrative } from './CreativeThemeNarrative';
import { Badge } from '@/components/ui/badge';

interface AiCreativeInsightsPanelProps {
  insights: AiCreativeInsights | null;
  isLoading: boolean;
  error: string | null;
  className?: string;
}

export function AiCreativeInsightsPanel({
  insights,
  isLoading,
  error,
  className = ''
}: AiCreativeInsightsPanelProps) {
  // Loading State
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="font-medium">Generating AI Creative Insights...</p>
              <p className="text-sm text-muted-foreground">
                Analyzing screenshots, themes, colors, and layouts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className={`border-destructive ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Insight Generation Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Empty State (no insights yet)
  if (!insights) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Creative Insights
          </CardTitle>
          <CardDescription>
            Generate AI-powered creative strategy insights
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Info className="h-12 w-12 text-muted-foreground/50" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                No insights generated yet
              </p>
              <p className="text-xs text-muted-foreground">
                Click "Generate AI Insights" to analyze creative strategy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success State - Display all insights
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Creative Insights
              </CardTitle>
              <CardDescription className="mt-2">
                AI-powered strategic analysis of creative assets
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="text-xs">
                Generated {new Date(insights.generated_at).toLocaleTimeString()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {insights.processing_time}ms
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Opportunities</p>
              <p className="text-2xl font-bold">{insights.opportunities.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Test Variants</p>
              <p className="text-2xl font-bold">{insights.test_plan.variants.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Weaknesses</p>
              <p className="text-2xl font-bold">{insights.weaknesses.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities */}
      <CreativeOpportunityList opportunities={insights.opportunities} />

      {/* Test Plan */}
      <CreativeTestPlanGenerator testPlan={insights.test_plan} />

      {/* Narrative & Theme Summary */}
      <CreativeThemeNarrative
        narratives={insights.narratives}
        themeSummary={insights.screenshot_theme_summary}
        weaknesses={insights.weaknesses}
      />
    </div>
  );
}
