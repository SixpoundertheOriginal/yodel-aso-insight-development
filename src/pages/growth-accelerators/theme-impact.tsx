/**
 * THEME IMPACT DASHBOARD
 *
 * Main page for theme impact scoring analytics
 * Shows critical themes, impact scores, and trends from review analysis
 */

import React, { useState } from 'react';
import { MainLayout } from '@/layouts';
import { usePermissions } from '@/hooks/usePermissions';
import { useThemeImpactScoring } from '@/hooks/useThemeImpactScoring';
import { CompactAppSelector } from '@/components/CompactAppSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ThemeImpactSummaryCards } from '@/components/theme-impact/ThemeImpactSummaryCards';
import { CriticalThemesList } from '@/components/theme-impact/CriticalThemesList';
import { ThemesDataTable } from '@/components/theme-impact/ThemesDataTable';
import {
  RefreshCw,
  AlertCircle,
  Info,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { logger } from '@/utils/logger';

export default function ThemeImpactDashboard() {
  const { organizationId } = usePermissions();
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);

  // Fetch theme impact data
  const {
    scores,
    criticalThemes,
    summary,
    topPriorities,
    isLoading,
    error,
    analyzeThemes,
    isAnalyzing,
    refetch
  } = useThemeImpactScoring({
    monitoredAppId: selectedAppId,
    organizationId: organizationId || undefined,
    periodDays: selectedPeriod,
    autoFetch: !!selectedAppId
  });

  const handleAppChange = (appIds: string[]) => {
    const appId = appIds[0] || '';
    logger.info('[ThemeImpactDashboard] App selected', { appId });
    setSelectedAppId(appId);
  };

  const handleRunAnalysis = () => {
    if (!selectedAppId) return;

    logger.info('[ThemeImpactDashboard] Running manual analysis', {
      appId: selectedAppId,
      periodDays: selectedPeriod
    });

    analyzeThemes({
      monitoredAppId: selectedAppId,
      periodDays: selectedPeriod
    });
  };

  const handleRefresh = () => {
    logger.info('[ThemeImpactDashboard] Refreshing data');
    refetch();
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              Theme Impact Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Data-driven insights from review theme analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || !selectedAppId}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !selectedAppId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <TrendingUp className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>About Theme Impact Scoring</AlertTitle>
          <AlertDescription>
            This dashboard analyzes themes from your app reviews and calculates a business impact score (0-100)
            based on frequency, sentiment, recency, and trends. Use it to prioritize product improvements.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* App Selector */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select App
                </label>
                <CompactAppSelector
                  selectedAppIds={selectedAppId ? [selectedAppId] : []}
                  onAppChange={handleAppChange}
                  multiSelect={false}
                  placeholder="Choose an app to analyze..."
                />
              </div>

              {/* Period Selector */}
              <div className="w-full md:w-[200px]">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Analysis Period
                </label>
                <Select
                  value={selectedPeriod.toString()}
                  onValueChange={(value) => setSelectedPeriod(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 6 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load theme impact data: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!selectedAppId && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select an App to Get Started
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Choose an app from the dropdown above to view theme impact analysis
                and identify critical issues requiring attention.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Data Display */}
        {selectedAppId && (
          <>
            {/* Summary Cards */}
            <ThemeImpactSummaryCards
              summary={summary}
              isLoading={isLoading}
            />

            <Separator />

            {/* Critical Themes */}
            <CriticalThemesList
              themes={topPriorities}
              isLoading={isLoading}
              maxItems={5}
            />

            <Separator />

            {/* All Themes Table */}
            <ThemesDataTable
              themes={scores}
              isLoading={isLoading}
            />
          </>
        )}

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              How Impact Scores Are Calculated
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Impact Score (0-100)</strong> is calculated using:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Frequency (40%):</strong> How often the theme is mentioned in reviews</li>
              <li><strong>Sentiment (30%):</strong> User sentiment towards the theme (negative = higher impact)</li>
              <li><strong>Recency (20%):</strong> How recently the theme appeared (recent = higher impact)</li>
              <li><strong>Trend (10%):</strong> Whether mentions are rising, stable, or declining</li>
            </ul>
            <p className="mt-4">
              <strong>Impact Levels:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Critical (85-100):</strong> Immediate action required</li>
              <li><strong>High (65-84):</strong> Requires attention soon</li>
              <li><strong>Medium (40-64):</strong> Monitor and plan</li>
              <li><strong>Low (0-39):</strong> Low priority</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
