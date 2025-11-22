/**
 * Creative Score Card Component
 *
 * Displays overall creative score, metric breakdown, performance tier,
 * and validator warnings using the Creative Intelligence Registry.
 *
 * Phase 1: Registry Integration
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { useCreativeIntelligence } from '@/hooks/useCreativeIntelligence';
import type { ScreenshotAnalysisResult } from '../services/screenshotAnalysisService';
import type { ValidationResult } from '@/types/creative-intelligence.types';
import type { ScrapedMetadata } from '@/types/aso';

interface CreativeScoreCardProps {
  metadata: ScrapedMetadata;
  analysisResults: ScreenshotAnalysisResult[];
}

/**
 * Map screenshot analysis results to metric scores
 * This is a simplified mapping - in production, this would use AI or more sophisticated algorithms
 */
function calculateMetricScores(analysisResults: ScreenshotAnalysisResult[]): {
  visual: number;
  text: number;
  messaging: number;
  engagement: number;
} {
  if (analysisResults.length === 0) {
    return { visual: 0, text: 0, messaging: 0, engagement: 0 };
  }

  // Average across all screenshots
  const avgVisual =
    analysisResults.reduce((sum, result) => {
      // Visual quality based on color richness and layout complexity
      const colorScore = Math.min(100, ((result.colors?.dominantColors?.length ?? 0) / 5) * 100);
      const layoutScore = result.layout?.complexity === 'complex' ? 85 : result.layout?.complexity === 'medium' ? 70 : 50;
      return sum + (colorScore * 0.4 + layoutScore * 0.6);
    }, 0) / analysisResults.length;

  const avgText =
    analysisResults.reduce((sum, result) => {
      // Text clarity based on text coverage and readability
      const coverage = result.text?.coverage ?? 0;
      const score = coverage >= 20 && coverage <= 40 ? 90 : coverage >= 40 && coverage <= 60 ? 75 : coverage < 20 ? 60 : 50;
      return sum + score;
    }, 0) / analysisResults.length;

  const avgEngagement =
    analysisResults.reduce((sum, result) => {
      // CTA effectiveness based on visual hierarchy and focus areas
      const hasFocus = (result.layout?.visualHierarchy?.focusAreas?.length ?? 0) > 0;
      const hasHighContrast = result.colors?.dominantColors?.some(
        c => c.saturation > 0.6 && c.brightness > 0.5
      ) ?? false;
      const score = hasFocus && hasHighContrast ? 85 : hasFocus ? 70 : 60;
      return sum + score;
    }, 0) / analysisResults.length;

  const avgMessaging =
    analysisResults.reduce((sum, result) => {
      // Message consistency based on theme consistency across screenshots
      const themeScore = (result.theme?.confidence ?? 0) > 0.7 ? 85 : (result.theme?.confidence ?? 0) > 0.5 ? 70 : 60;
      return sum + themeScore;
    }, 0) / analysisResults.length;

  return {
    visual: Math.round(avgVisual),
    text: Math.round(avgText),
    messaging: Math.round(avgMessaging),
    engagement: Math.round(avgEngagement),
  };
}

/**
 * Get badge variant based on performance tier
 */
function getTierBadgeVariant(tier: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (tier) {
    case 'excellent':
      return 'default';
    case 'good':
      return 'secondary';
    case 'average':
      return 'outline';
    case 'poor':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Get tier color class
 */
function getTierColor(tier: string): string {
  switch (tier) {
    case 'excellent':
      return 'text-green-500';
    case 'good':
      return 'text-blue-500';
    case 'average':
      return 'text-yellow-500';
    case 'poor':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get score color class
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-blue-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

export function CreativeScoreCard({ metadata, analysisResults }: CreativeScoreCardProps) {
  // Get category from metadata (normalize to lowercase)
  const category = useMemo(() => {
    const cat = metadata.applicationCategory || metadata.category || 'default';
    return cat.toLowerCase();
  }, [metadata]);

  // Use Creative Intelligence Registry hook
  const {
    themes,
    metrics,
    validators,
    rubric,
    calculateWeightedScore,
    getPerformanceTier,
  } = useCreativeIntelligence(category);

  // Calculate metric scores from analysis results
  const metricScores = useMemo(() => {
    return calculateMetricScores(analysisResults);
  }, [analysisResults]);

  // Calculate overall weighted score
  const overallScore = useMemo(() => {
    return calculateWeightedScore(metricScores);
  }, [calculateWeightedScore, metricScores]);

  // Get performance tier
  const performanceTier = useMemo(() => {
    return getPerformanceTier(overallScore);
  }, [getPerformanceTier, overallScore]);

  // Run validators
  const validationResults = useMemo((): ValidationResult[] => {
    const results: ValidationResult[] = [];

    // Screenshot count validator
    const screenshotValidator = validators.find(v => v.id === 'screenshot_count');
    if (screenshotValidator) {
      results.push(
        screenshotValidator.validate({
          type: 'screenshot',
          screenshots: metadata.screenshots || [],
        })
      );
    }

    // Description length validator
    const descValidator = validators.find(v => v.id === 'text_length');
    if (descValidator && metadata.description) {
      results.push(
        descValidator.validate({
          type: 'description',
          description: metadata.description,
        })
      );
    }

    // Theme-category fit validator
    const themeValidator = validators.find(v => v.id === 'theme_category_fit');
    if (themeValidator && analysisResults.length > 0) {
      // Get most common theme from analysis results
      const themeCounts: Record<string, number> = {};
      analysisResults.forEach(result => {
        themeCounts[result.theme.theme] = (themeCounts[result.theme.theme] || 0) + 1;
      });
      const mostCommonTheme = Object.keys(themeCounts).reduce((a, b) =>
        themeCounts[a] > themeCounts[b] ? a : b
      );

      results.push(
        themeValidator.validate({
          type: 'screenshot',
          detectedTheme: {
            id: mostCommonTheme,
            name: mostCommonTheme,
          },
          appCategory: category,
        })
      );
    }

    return results;
  }, [validators, metadata, analysisResults, category]);

  // Filter validation results by severity
  const criticalIssues = validationResults.filter(r => !r.passed && validators.find(v => v.id)?.severity === 'critical');
  const warnings = validationResults.filter(r => !r.passed && validators.find(v => v.id)?.severity === 'warning');
  const infos = validationResults.filter(r => !r.passed && validators.find(v => v.id)?.severity === 'info');

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Creative Intelligence Score
              </CardTitle>
              <CardDescription>
                Registry-driven analysis for {category} apps (v{rubric.category || 'default'} rubric)
              </CardDescription>
            </div>
            <Badge variant={getTierBadgeVariant(performanceTier)} className="text-lg px-4 py-1">
              {performanceTier.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
              <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
                <span className="text-lg text-muted-foreground">/100</span>
              </span>
            </div>
            <Progress value={overallScore} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {overallScore >= rubric.competitiveThresholds.excellent
                ? `Top 10% of ${category} apps`
                : overallScore >= rubric.competitiveThresholds.good
                ? `Top 25% of ${category} apps`
                : overallScore >= rubric.competitiveThresholds.average
                ? `Average for ${category} apps`
                : `Below average for ${category} apps`}
            </p>
          </div>

          {/* Metric Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Score Breakdown</h4>
            {metrics.map(metric => {
              const score = metricScores[metric.category as keyof typeof metricScores] || 0;
              const weight = rubric.weights[metric.category as keyof typeof rubric.weights] || 0;

              return (
                <div key={metric.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{metric.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(weight * 100).toFixed(0)}% weight
                      </Badge>
                    </div>
                    <span className={`font-semibold ${getScoreColor(score)}`}>{score}</span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </div>
              );
            })}
          </div>

          {/* Competitive Thresholds */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold">Category Benchmarks</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Excellent</span>
                <span className="font-semibold text-green-500">
                  {rubric.competitiveThresholds.excellent}+
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Good</span>
                <span className="font-semibold text-blue-500">
                  {rubric.competitiveThresholds.good}+
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Average</span>
                <span className="font-semibold text-yellow-500">
                  {rubric.competitiveThresholds.average}+
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {(criticalIssues.length > 0 || warnings.length > 0 || infos.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Quality Checks
            </CardTitle>
            <CardDescription>
              {criticalIssues.length + warnings.length + infos.length} issue(s) detected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Critical Issues */}
            {criticalIssues.map((result, idx) => (
              <Alert key={`critical-${idx}`} variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-semibold">{result.message}</p>
                    {result.suggestion && (
                      <p className="text-sm mt-1">💡 {result.suggestion}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}

            {/* Warnings */}
            {warnings.map((result, idx) => (
              <Alert key={`warning-${idx}`} className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-semibold">{result.message}</p>
                    {result.suggestion && (
                      <p className="text-sm mt-1">💡 {result.suggestion}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}

            {/* Info */}
            {infos.map((result, idx) => (
              <Alert key={`info-${idx}`} className="border-blue-500/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-semibold">{result.message}</p>
                    {result.suggestion && (
                      <p className="text-sm mt-1">💡 {result.suggestion}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}

            {/* Passed Checks */}
            {validationResults.filter(r => r.passed).length > 0 && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">
                  ✓ {validationResults.filter(r => r.passed).length} check(s) passed
                </p>
                {validationResults
                  .filter(r => r.passed)
                  .map((result, idx) => (
                    <div key={`passed-${idx}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500" />
                      <span>{result.message}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommended Themes */}
      {themes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Themes for {category}</CardTitle>
            <CardDescription>
              Visual themes that perform well in this category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {themes.slice(0, 4).map(theme => (
                <div key={theme.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-sm">{theme.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {theme.benchmarks.categoryFit[category] || 50}% fit
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {theme.characteristics.visualDensity && (
                      <Badge variant="secondary" className="text-xs">
                        {theme.characteristics.visualDensity} density
                      </Badge>
                    )}
                    {theme.characteristics.colorPalette && (
                      <Badge variant="secondary" className="text-xs">
                        {theme.characteristics.colorPalette} colors
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
