/**
 * THEME IMPACT DASHBOARD
 *
 * Main page for theme impact scoring analytics
 * Works exclusively with monitored apps and integrates with Reviews page via shared state
 * Shows critical themes, impact scores, and trends from review analysis
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/layouts';
import { usePermissions } from '@/hooks/usePermissions';
import { useThemeImpactScoring } from '@/hooks/useThemeImpactScoring';
import { useReviewAnalysis } from '@/contexts/ReviewAnalysisContext';
import { CompactAppSelector } from '@/components/CompactAppSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ThemeImpactSummaryCards } from '@/components/theme-impact/ThemeImpactSummaryCards';
import { CriticalThemesList } from '@/components/theme-impact/CriticalThemesList';
import { ThemesDataTable } from '@/components/theme-impact/ThemesDataTable';
import {
  RefreshCw,
  AlertCircle,
  Info,
  BarChart3,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

export default function ThemeImpactDashboard() {
  const { organizationId } = usePermissions();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);

  // Shared state with Reviews page
  const { selectedApp: sharedSelectedApp, monitoredApps, isLoadingMonitoredApps } = useReviewAnalysis();

  // Local selected app ID (monitored app ID)
  const [selectedMonitoredAppId, setSelectedMonitoredAppId] = useState<string>('');

  // Load selected app from shared state or auto-select first monitored app
  useEffect(() => {
    if (sharedSelectedApp?.monitoredAppId) {
      // Load from shared state (coming from Reviews page)
      logger.info('[ThemeImpact] Loading app from shared state', {
        appName: sharedSelectedApp.name,
        monitoredAppId: sharedSelectedApp.monitoredAppId
      });
      setSelectedMonitoredAppId(sharedSelectedApp.monitoredAppId);
      toast.success(`Loaded ${sharedSelectedApp.name} from Reviews`);
    } else if (monitoredApps.length > 0 && !selectedMonitoredAppId) {
      // Auto-select first monitored app
      const firstApp = monitoredApps[0];
      logger.info('[ThemeImpact] Auto-selecting first monitored app', {
        appName: firstApp.app_name,
        monitoredAppId: firstApp.id
      });
      setSelectedMonitoredAppId(firstApp.id);
    }
  }, [sharedSelectedApp, monitoredApps, selectedMonitoredAppId]);

  // Fetch theme impact data
  const {
    scores,
    summary,
    topPriorities,
    isLoading,
    error,
    analyzeThemes,
    isAnalyzing,
    refetch
  } = useThemeImpactScoring({
    monitoredAppId: selectedMonitoredAppId,
    organizationId: organizationId || undefined,
    periodDays: selectedPeriod,
    autoFetch: !!selectedMonitoredAppId
  });

  // Get selected app details
  const selectedAppDetails = monitoredApps.find(app => app.id === selectedMonitoredAppId);

  // Automatically trigger analysis when app is selected and has scores
  useEffect(() => {
    if (selectedMonitoredAppId && scores.length === 0 && !isLoading && !isAnalyzing) {
      logger.info('[ThemeImpact] Auto-triggering initial analysis', {
        monitoredAppId: selectedMonitoredAppId
      });
      analyzeThemes({
        monitoredAppId: selectedMonitoredAppId,
        periodDays: selectedPeriod
      });
    }
  }, [selectedMonitoredAppId, scores.length, isLoading, isAnalyzing]);

  const handleAppChange = (appIds: string[]) => {
    const appId = appIds[0] || '';
    logger.info('[ThemeImpact] App changed', { monitoredAppId: appId });
    setSelectedMonitoredAppId(appId);
  };

  const handleRunAnalysis = () => {
    if (!selectedMonitoredAppId) {
      toast.error('Please select an app first');
      return;
    }

    logger.info('[ThemeImpact] Running manual analysis', {
      monitoredAppId: selectedMonitoredAppId,
      periodDays: selectedPeriod
    });

    analyzeThemes({
      monitoredAppId: selectedMonitoredAppId,
      periodDays: selectedPeriod
    });
  };

  const handleRefresh = () => {
    logger.info('[ThemeImpact] Refreshing data');
    refetch();
  };

  const ccToFlag = (cc: string): string => {
    try {
      const up = cc?.toUpperCase();
      if (!up || up.length !== 2) return up || '';
      const codePoints = [...up].map(c => 127397 + c.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return cc;
    }
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
              AI-powered theme analysis from monitored apps
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || !selectedMonitoredAppId}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !selectedMonitoredAppId}
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
            This dashboard analyzes themes from your monitored apps' reviews and calculates business impact scores (0-100)
            based on frequency, sentiment, recency, and trends. Select an app from the Reviews page or choose one below.
          </AlertDescription>
        </Alert>

        {/* App Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Monitored App</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* App Selector */}
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Monitored App
                  </label>
                  {isLoadingMonitoredApps ? (
                    <div className="h-10 bg-gray-100 animate-pulse rounded" />
                  ) : monitoredApps.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No monitored apps found. Please add apps from the Reviews page first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <CompactAppSelector
                      selectedAppIds={selectedMonitoredAppId ? [selectedMonitoredAppId] : []}
                      onAppChange={handleAppChange}
                      multiSelect={false}
                      placeholder="Select an app to analyze..."
                    />
                  )}
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

              {/* Selected App Display */}
              {selectedAppDetails && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                  {selectedAppDetails.app_icon_url && (
                    <img
                      src={selectedAppDetails.app_icon_url}
                      alt={selectedAppDetails.app_name}
                      className="w-12 h-12 rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{selectedAppDetails.app_name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {ccToFlag(selectedAppDetails.primary_country)} {selectedAppDetails.primary_country.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{selectedAppDetails.developer_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>⭐ {selectedAppDetails.snapshot_rating?.toFixed(2) || 'N/A'}</span>
                      <span>•</span>
                      <span>{selectedAppDetails.snapshot_review_count?.toLocaleString() || '0'} reviews</span>
                      {isAnalyzing && (
                        <>
                          <span>•</span>
                          <span className="text-purple-600 font-medium animate-pulse">Analyzing themes...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

        {/* Empty State - No app selected */}
        {!selectedMonitoredAppId && !isLoadingMonitoredApps && monitoredApps.length > 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select an App to Get Started
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Choose a monitored app from the dropdown above to view theme impact analysis
                and identify critical issues requiring attention.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Data Display - Show when app is selected */}
        {selectedMonitoredAppId && (
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
