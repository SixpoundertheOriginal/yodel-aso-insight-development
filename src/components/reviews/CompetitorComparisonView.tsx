import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Download, Target, TrendingUp, AlertTriangle,
  Shield, Loader2, CheckCircle2
} from 'lucide-react';
import { CompetitorSelectionDialog } from './CompetitorSelectionDialog';
import { CompetitiveIntelligencePanel } from './CompetitiveIntelligencePanel';
import { useCompetitorComparison } from '@/hooks/useCompetitorComparison';
import type { CompetitiveIntelligence } from '@/services/competitor-review-intelligence.service';
import { competitorComparisonExportService } from '@/services/competitor-comparison-export.service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ComparisonConfig {
  primaryAppId: string;
  primaryAppName: string;
  primaryAppIcon: string;
  primaryAppRating: number;
  primaryAppReviewCount: number;
  competitorAppIds: string[];
  competitorAppNames: string[];
  competitorAppIcons: string[];
  competitorAppRatings: number[];
  competitorAppReviewCounts: number[];
  country: string;
}

interface CompetitorComparisonViewProps {
  organizationId: string;
  onExit: () => void;
  preSelectedAppId?: string;
  preSelectedCountry?: string;
}

export const CompetitorComparisonView: React.FC<CompetitorComparisonViewProps> = ({
  organizationId,
  onExit,
  preSelectedAppId,
  preSelectedCountry
}) => {
  const [comparisonConfig, setComparisonConfig] = useState<ComparisonConfig | null>(null);
  const [showSelection, setShowSelection] = useState(true);

  const { data: intelligence, isLoading, error } = useCompetitorComparison(comparisonConfig);

  const handleStartComparison = (config: ComparisonConfig) => {
    setComparisonConfig(config);
    setShowSelection(false);
  };

  const handleReset = () => {
    setComparisonConfig(null);
    setShowSelection(true);
  };

  const handleExport = () => {
    if (!intelligence) {
      toast.error('No data to export');
      return;
    }

    try {
      const filename = `competitive-analysis-${comparisonConfig?.primaryAppName || 'report'}`;
      competitorComparisonExportService.exportToCSV(intelligence, filename);
      toast.success('Report exported successfully!');
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  // Selection Dialog
  if (showSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
        <div className="max-w-6xl mx-auto">
          <CompetitorSelectionDialog
            organizationId={organizationId}
            onCancel={onExit}
            onConfirm={handleStartComparison}
            preSelectedAppId={preSelectedAppId}
            preSelectedCountry={preSelectedCountry}
          />
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="p-4 rounded-full bg-gradient-to-br from-orange-500 to-red-600">
                  <Target className="h-8 w-8 text-white animate-pulse" />
                </div>
                <Loader2 className="absolute -top-1 -right-1 h-6 w-6 text-orange-500 animate-spin" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Analyzing Competitors...</h3>
                <p className="text-muted-foreground">
                  Fetching reviews and running AI analysis for {(comparisonConfig?.competitorAppIds.length || 0) + 1} apps
                </p>
              </div>

              <div className="w-full max-w-md space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{comparisonConfig?.primaryAppName}</span>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <Progress value={100} className="h-2" />
                </div>

                {comparisonConfig?.competitorAppNames.map((name, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                This may take 30-60 seconds depending on review volume
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !intelligence) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="p-4 rounded-full bg-red-500/10">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Analysis Failed</h3>
                <p className="text-muted-foreground">
                  {error instanceof Error ? error.message : 'Failed to analyze competitors'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>
                  Try Again
                </Button>
                <Button onClick={onExit}>
                  Back to Reviews
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main Comparison View
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onExit}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reviews
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Competitive Analysis</h1>
              <p className="text-sm text-muted-foreground">
                {comparisonConfig?.primaryAppName} vs {comparisonConfig?.competitorAppNames.length} competitor{comparisonConfig && comparisonConfig.competitorAppNames.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Target className="h-4 w-4 mr-2" />
              Change Apps
            </Button>
            <Button size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Executive Summary Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-5 blur-3xl bg-gradient-to-br from-orange-500 to-red-600" />

          <div className="relative p-6">
            <h2 className="text-xl font-bold mb-4">Executive Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Overall Assessment */}
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Overall Position</div>
                  <div className="text-2xl font-bold">{intelligence.summary.overallPosition}</div>
                </div>

                <div className="space-y-2">
                  {[intelligence.summary.keyInsight].map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Priority Actions */}
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">Priority Actions</div>
                {[intelligence.summary.topPriority].map((action, idx) => (
                  <Card key={idx} className="p-3 bg-orange-500/5 border-orange-500/20">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="text-xs font-bold">#{idx + 1}</Badge>
                      <div className="text-sm">{action}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Benchmark Metrics Bar */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Key Benchmarks</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* Average Rating */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Avg Rating
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">
                  {intelligence.metrics.avgRating.yours.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  vs {intelligence.metrics.avgRating.average.toFixed(1)}
                </div>
              </div>
              <div className={cn(
                "text-xs font-medium",
                intelligence.metrics.avgRating.yours > intelligence.metrics.avgRating.average
                  ? "text-success"
                  : "text-destructive"
              )}>
                {intelligence.metrics.avgRating.yours > intelligence.metrics.avgRating.average
                  ? `+${(intelligence.metrics.avgRating.yours - intelligence.metrics.avgRating.average).toFixed(1)} better`
                  : `${(intelligence.metrics.avgRating.yours - intelligence.metrics.avgRating.average).toFixed(1)} behind`
                }
              </div>
            </div>

            {/* Average Sentiment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Avg Sentiment
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">
                  {(intelligence.metrics.positiveSentiment.yours * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  vs {(intelligence.metrics.positiveSentiment.average * 100).toFixed(0)}%
                </div>
              </div>
              <div className={cn(
                "text-xs font-medium",
                intelligence.metrics.positiveSentiment.yours > intelligence.metrics.positiveSentiment.average
                  ? "text-success"
                  : "text-destructive"
              )}>
                {intelligence.metrics.positiveSentiment.yours > intelligence.metrics.positiveSentiment.average
                  ? `+${((intelligence.metrics.positiveSentiment.yours - intelligence.metrics.positiveSentiment.average) * 100).toFixed(0)}% better`
                  : `${((intelligence.metrics.positiveSentiment.yours - intelligence.metrics.positiveSentiment.average) * 100).toFixed(0)}% behind`
                }
              </div>
            </div>

            {/* Issues Frequency */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Issue Rate
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">
                  {(intelligence.metrics.issueFrequency.yours * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  vs {(intelligence.metrics.issueFrequency.average * 100).toFixed(0)}%
                </div>
              </div>
              <div className={cn(
                "text-xs font-medium",
                intelligence.metrics.issueFrequency.yours < intelligence.metrics.issueFrequency.average
                  ? "text-success"
                  : "text-destructive"
              )}>
                {intelligence.metrics.issueFrequency.yours < intelligence.metrics.issueFrequency.average
                  ? `${((intelligence.metrics.issueFrequency.average - intelligence.metrics.issueFrequency.yours) * 100).toFixed(0)}% fewer issues`
                  : `${((intelligence.metrics.issueFrequency.yours - intelligence.metrics.issueFrequency.average) * 100).toFixed(0)}% more issues`
                }
              </div>
            </div>
          </div>
        </Card>

        {/* Competitive Intelligence Panel */}
        <CompetitiveIntelligencePanel intelligence={intelligence} />

        {/* Side-by-Side App Comparison */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Side-by-Side Comparison</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Primary App Card */}
            <AppComparisonCard
              appName={comparisonConfig?.primaryAppName || ''}
              appIcon={comparisonConfig?.primaryAppIcon || ''}
              appRating={comparisonConfig?.primaryAppRating || 0}
              reviewCount={comparisonConfig?.primaryAppReviewCount || 0}
              isPrimary={true}
            />

            {/* Competitor Cards */}
            {comparisonConfig?.competitorAppNames.map((name, idx) => (
              <AppComparisonCard
                key={idx}
                appName={name}
                appIcon={comparisonConfig.competitorAppIcons[idx]}
                appRating={comparisonConfig.competitorAppRatings[idx]}
                reviewCount={comparisonConfig.competitorAppReviewCounts[idx]}
                isPrimary={false}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// Simple app comparison card component
interface AppComparisonCardProps {
  appName: string;
  appIcon: string;
  appRating: number;
  reviewCount: number;
  isPrimary: boolean;
}

const AppComparisonCard: React.FC<AppComparisonCardProps> = ({
  appName,
  appIcon,
  appRating,
  reviewCount,
  isPrimary
}) => {
  return (
    <Card className={cn(
      "p-4",
      isPrimary && "border-primary bg-primary/5"
    )}>
      <div className="flex items-start gap-3">
        {appIcon && (
          <img src={appIcon} alt={appName} className="w-16 h-16 rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{appName}</h4>
            {isPrimary && (
              <Badge variant="default" className="text-xs">Primary</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-medium">{appRating.toFixed(1)}</span>
              <span>⭐</span>
            </div>
            <div className="text-xs">
              {reviewCount.toLocaleString()} reviews
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
