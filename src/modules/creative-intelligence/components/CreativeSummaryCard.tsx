/**
 * Creative Summary Card Component
 *
 * Displays a high-level overview of the app's creative performance:
 * - Category
 * - Screenshot count
 * - Detected theme
 * - Overall creative score
 * - Strengths and weaknesses summary
 *
 * Enterprise Creative Intelligence Module
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ScrapedMetadata } from '@/types/aso';
import type { ScreenshotAnalysisResult } from '../services/screenshotAnalysisService';
import { formatCategoryForDisplay } from '@/lib/metadata/extract-category';

interface CreativeSummaryCardProps {
  metadata: ScrapedMetadata;
  analysisResults: ScreenshotAnalysisResult[];
  overallScore?: number;
  performanceTier?: string;
  category: string;
}

/**
 * Get dominant theme from analysis results
 */
function getDominantTheme(analysisResults: ScreenshotAnalysisResult[]): string {
  if (analysisResults.length === 0) return 'Unknown';

  // Count theme occurrences
  const themeCounts: Record<string, number> = {};
  analysisResults.forEach(result => {
    const theme = result.theme?.primary || 'Unknown';
    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  });

  // Find most common theme
  const dominantTheme = Object.entries(themeCounts).reduce((a, b) =>
    themeCounts[a[0]] > themeCounts[b[0]] ? a : b
  )[0];

  return dominantTheme;
}

// Removed: formatCategory function is now imported from shared utility

/**
 * Get tier color class
 */
function getTierColor(tier?: string): string {
  switch (tier?.toLowerCase()) {
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
 * Get tier badge variant
 */
function getTierBadgeVariant(tier?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (tier?.toLowerCase()) {
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

export function CreativeSummaryCard({
  metadata,
  analysisResults,
  overallScore,
  performanceTier,
  category,
}: CreativeSummaryCardProps) {
  const screenshotCount = metadata.screenshots?.length || 0;
  const dominantTheme = getDominantTheme(analysisResults);
  const formattedCategory = formatCategoryForDisplay(category);

  return (
    <Card className="border-primary bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Creative Summary
        </CardTitle>
        <CardDescription>
          High-level overview of your app's creative performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category and Score */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
            <p className="text-lg font-semibold">{formattedCategory}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Overall Score</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getTierColor(performanceTier)}`}>
                {overallScore || '--'}<span className="text-sm text-muted-foreground">/100</span>
              </span>
              {performanceTier && (
                <Badge variant={getTierBadgeVariant(performanceTier)} className="text-xs">
                  {performanceTier.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Screenshot Count and Theme */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Screenshots</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{screenshotCount}</span>
              {screenshotCount < 7 && (
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Recommended: 7–8
                </Badge>
              )}
              {screenshotCount >= 7 && screenshotCount <= 8 && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Optimal
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Detected Theme</p>
            <p className="text-lg font-semibold capitalize">{dominantTheme.replace(/_/g, ' ')}</p>
          </div>
        </div>

        {/* Strengths and Weaknesses - Placeholder */}
        <div className="pt-2 border-t space-y-2">
          <div>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
              ✓ Strengths
            </p>
            <p className="text-sm text-muted-foreground">
              Analysis shows strong visual clarity and effective use of color contrast. CTA elements are well-positioned.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
              ⚠ Areas for Improvement
            </p>
            <p className="text-sm text-muted-foreground">
              Consider enhancing messaging consistency and value proposition definition across screenshots.
            </p>
          </div>
          <p className="text-xs text-muted-foreground italic pt-2">
            💡 Detailed insights and recommendations available in the Creative Intelligence Score Card below.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
