/**
 * THEME IMPACT DASHBOARD
 *
 * Main page for theme impact scoring analytics
 * Integrated with app search and review scraper
 * Shows critical themes, impact scores, and trends from review analysis
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/layouts';
import { usePermissions } from '@/hooks/usePermissions';
import { useThemeImpactScoring } from '@/hooks/useThemeImpactScoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
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
import { AppSelectionModal } from '@/components/shared/AsoShared/AppSelectionModal';
import { AddToMonitoringButton } from '@/components/reviews/AddToMonitoringButton';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  AlertCircle,
  Info,
  BarChart3,
  TrendingUp,
  Search,
  Eye,
  Star,
  ChevronRight
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { asoSearchService } from '@/services/aso-search.service';
import { AmbiguousSearchError } from '@/types/search-errors';
import { fetchAppReviews } from '@/utils/itunesReviews';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AppSearchResult {
  name: string;
  appId: string;
  developer: string;
  rating: number;
  reviews: number;
  icon: string;
  applicationCategory: string;
}

export default function ThemeImpactDashboard() {
  const { organizationId } = usePermissions();
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);

  // App search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AppSearchResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppSearchResult | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('us');

  // Ambiguous search modal state
  const [showAppSelection, setShowAppSelection] = useState(false);
  const [appCandidates, setAppCandidates] = useState<any[]>([]);
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);

  // Check if app is monitored
  const { data: monitoredApps } = useQuery({
    queryKey: ['monitored-apps', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const isAppMonitored = selectedApp
    ? monitoredApps?.some(app =>
        app.app_store_id === selectedApp.appId &&
        app.primary_country === selectedCountry
      ) || false
    : false;

  // Get monitored app ID for theme analysis
  const monitoredAppId = selectedApp
    ? monitoredApps?.find(app =>
        app.app_store_id === selectedApp.appId &&
        app.primary_country === selectedCountry
      )?.id
    : undefined;

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
    monitoredAppId: monitoredAppId,
    organizationId: organizationId || undefined,
    periodDays: selectedPeriod,
    autoFetch: !!monitoredAppId
  });

  // App search handler
  const handleAppSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter an app name or keywords');
      return;
    }

    setSearchLoading(true);
    logger.info('[ThemeImpact] App search initiated', { searchTerm, country: selectedCountry });

    try {
      // Use bulletproof search
      const result = await asoSearchService.search(searchTerm.trim(), {
        organizationId: organizationId || 'anonymous',
        includeIntelligence: false,
        cacheResults: true,
        country: selectedCountry
      });

      logger.info('[ThemeImpact] Search successful', { appName: result.targetApp.name });

      // Convert to AppSearchResult format
      const convertedApp: AppSearchResult = {
        name: result.targetApp.name || result.targetApp.title,
        appId: result.targetApp.appId,
        developer: result.targetApp.developer || 'Unknown',
        rating: result.targetApp.rating || 0,
        reviews: result.targetApp.reviews || 0,
        icon: result.targetApp.icon || '',
        applicationCategory: result.targetApp.applicationCategory || 'App'
      };

      setSearchResults([convertedApp]);
      setSelectedApp(convertedApp);
      setSearchTerm('');

      // Automatically fetch reviews after app selection
      await fetchReviews(convertedApp.appId, 1);

      toast.success(`Found: ${convertedApp.name}`);

    } catch (error: any) {
      logger.error('[ThemeImpact] Search failed', { error: error.message });

      if (error instanceof AmbiguousSearchError) {
        logger.info('[ThemeImpact] Ambiguous search - showing selection modal', {
          candidateCount: error.candidates.length
        });

        setAppCandidates(error.candidates);
        setPendingSearchTerm(searchTerm);
        setShowAppSelection(true);
        setSearchLoading(false);
        return;
      }

      toast.error(error.message || 'App search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle app selection from modal (ambiguous results)
  const handleAppSelectionFromModal = (app: any) => {
    logger.info('[ThemeImpact] App selected from modal', { appId: app.appId, appName: app.name });

    const convertedApp: AppSearchResult = {
      name: app.name || app.title,
      appId: app.appId,
      developer: app.developer || 'Unknown',
      rating: app.rating || 0,
      reviews: app.reviews || 0,
      icon: app.icon || '',
      applicationCategory: app.applicationCategory || 'App'
    };

    setSelectedApp(convertedApp);
    setSearchResults([convertedApp]);
    setShowAppSelection(false);
    setAppCandidates([]);
    setPendingSearchTerm('');

    // Automatically fetch reviews
    fetchReviews(convertedApp.appId, 1);

    toast.success('App selected successfully');
  };

  // Reviews fetching
  const fetchReviews = async (appId: string, page: number = 1, append: boolean = false) => {
    setReviewsLoading(true);
    try {
      const result = await fetchAppReviews({ appId, cc: selectedCountry, page });
      const newReviews = result.data || [];
      logger.info('[ThemeImpact] Reviews fetched', { count: newReviews.length });

      if (append) {
        setReviews(prev => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      setCurrentPage(result.currentPage);
      setHasMoreReviews(result.hasMore);

      toast.success(`Loaded ${newReviews.length} reviews (page ${result.currentPage})`);

    } catch (error: any) {
      logger.error('[ThemeImpact] Reviews fetch failed', { error: error.message });
      toast.error(`Failed to fetch reviews: ${error.message}`);
    } finally {
      setReviewsLoading(false);
    }
  };

  // App selection handler
  const handleSelectApp = (app: AppSearchResult) => {
    setSelectedApp(app);
    setReviews([]);
    setCurrentPage(1);
    setHasMoreReviews(false);
    fetchReviews(app.appId, 1);
  };

  // Automatically trigger theme analysis when reviews are fetched and app is monitored
  useEffect(() => {
    if (reviews.length > 0 && monitoredAppId && !isAnalyzing) {
      logger.info('[ThemeImpact] Auto-triggering theme analysis', {
        reviewCount: reviews.length,
        monitoredAppId
      });

      analyzeThemes({
        monitoredAppId,
        periodDays: selectedPeriod
      });
    }
  }, [reviews.length, monitoredAppId]);

  const handleRunAnalysis = () => {
    if (!monitoredAppId) {
      toast.error('Please add this app to monitoring first');
      return;
    }

    logger.info('[ThemeImpact] Running manual analysis', {
      appId: monitoredAppId,
      periodDays: selectedPeriod
    });

    analyzeThemes({
      monitoredAppId,
      periodDays: selectedPeriod
    });
  };

  const handleRefresh = () => {
    logger.info('[ThemeImpact] Refreshing data');
    refetch();
  };

  const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

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
              Search apps, analyze reviews, and discover critical themes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || !monitoredAppId}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !monitoredAppId}
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
            Search for any app, pull reviews, and analyze themes with AI-powered impact scoring.
            Critical themes are automatically identified based on frequency, sentiment, recency, and trends.
          </AlertDescription>
        </Alert>

        {/* App Search Card - Always visible */}
        {!selectedApp && (
          <Card className={cn(
            "relative overflow-hidden transition-all duration-300",
            "hover:scale-[1.005] hover:shadow-2xl",
            "bg-card/50 backdrop-blur-xl border-border/50"
          )}>
            {/* Gradient Background Accent */}
            <div className="absolute top-0 right-0 w-48 h-48 opacity-10 blur-3xl bg-gradient-to-br from-purple-500 to-blue-600" />

            <div className="relative p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold uppercase tracking-wide">
                      App Search & Analysis
                    </h2>
                    <p className="text-xs text-muted-foreground/80">
                      Search any app to analyze themes from reviews
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter app name (e.g. WhatsApp, Instagram)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAppSearch()}
                    />
                  </div>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">🇺🇸 United States</SelectItem>
                      <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                      <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                      <SelectItem value="au">🇦🇺 Australia</SelectItem>
                      <SelectItem value="de">🇩🇪 Germany</SelectItem>
                      <SelectItem value="fr">🇫🇷 France</SelectItem>
                      <SelectItem value="it">🇮🇹 Italy</SelectItem>
                      <SelectItem value="es">🇪🇸 Spain</SelectItem>
                      <SelectItem value="nl">🇳🇱 Netherlands</SelectItem>
                      <SelectItem value="se">🇸🇪 Sweden</SelectItem>
                      <SelectItem value="no">🇳🇴 Norway</SelectItem>
                      <SelectItem value="dk">🇩🇰 Denmark</SelectItem>
                      <SelectItem value="jp">🇯🇵 Japan</SelectItem>
                      <SelectItem value="kr">🇰🇷 South Korea</SelectItem>
                      <SelectItem value="br">🇧🇷 Brazil</SelectItem>
                      <SelectItem value="in">🇮🇳 India</SelectItem>
                      <SelectItem value="mx">🇲🇽 Mexico</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAppSearch} disabled={searchLoading}>
                    {searchLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Search Results:</p>
                    {searchResults.map((app, index) => (
                      <Card
                        key={app.appId}
                        className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedApp?.appId === app.appId ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleSelectApp(app)}
                      >
                        <div className="flex items-center gap-3">
                          <img src={app.icon} alt={app.name} className="w-12 h-12 rounded-lg" />
                          <div className="flex-1">
                            <h4 className="font-medium">{app.name}</h4>
                            <p className="text-sm text-muted-foreground">{app.developer}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <StarRating rating={Math.round(app.rating)} />
                              <span className="text-sm text-muted-foreground">
                                ({app.reviews.toLocaleString()} reviews)
                              </span>
                              <Badge variant="secondary" className="text-xs">{app.applicationCategory}</Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Selected App Card */}
        {selectedApp && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedApp.icon && (
                    <img src={selectedApp.icon} alt={selectedApp.name} className="w-10 h-10 rounded-lg shadow" />
                  )}
                  <div className="flex flex-col">
                    <div className="text-lg font-semibold tracking-tight flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      <span>{selectedApp.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {ccToFlag(selectedCountry)} {selectedCountry.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{selectedApp.developer}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={Math.round(selectedApp?.rating || 0)} />
                      <span className="text-xs text-muted-foreground">
                        {(selectedApp?.rating ?? 0).toFixed(2)} / 5 • {(selectedApp?.reviews ?? 0).toLocaleString()} ratings
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {organizationId && (
                    <AddToMonitoringButton
                      organizationId={organizationId}
                      appStoreId={selectedApp.appId}
                      appName={selectedApp.name}
                      appIconUrl={selectedApp.icon}
                      developerName={selectedApp.developer}
                      category={selectedApp.applicationCategory}
                      country={selectedCountry}
                      rating={selectedApp.rating}
                      reviewCount={selectedApp.reviews}
                      isMonitored={isAppMonitored}
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
                    Search Another
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {reviews.length} reviews loaded • Page {currentPage}
                </span>
                {reviewsLoading && (
                  <span className="text-muted-foreground animate-pulse">Loading reviews...</span>
                )}
                {isAnalyzing && (
                  <span className="text-purple-600 font-medium animate-pulse">Analyzing themes...</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period Selector */}
        {selectedApp && monitoredAppId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Settings</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

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
        {!selectedApp && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Search an App to Get Started
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Use the search box above to find any app, pull reviews, and analyze themes
                with AI-powered impact scoring to identify critical issues.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State - App selected but not monitored */}
        {selectedApp && !monitoredAppId && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-16 w-16 text-orange-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add App to Monitoring
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4">
                To analyze themes for this app, please add it to your monitored apps list.
                Click the "Add to Monitoring" button above to save this app.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Data Display - Only show when app is monitored */}
        {selectedApp && monitoredAppId && (
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

      {/* App Selection Modal for ambiguous results */}
      <AppSelectionModal
        isOpen={showAppSelection}
        onClose={() => {
          setShowAppSelection(false);
          setAppCandidates([]);
          setPendingSearchTerm('');
        }}
        candidates={appCandidates}
        onSelect={handleAppSelectionFromModal}
        searchTerm={pendingSearchTerm}
        mode="select"
        searchCountry={selectedCountry}
      />
    </MainLayout>
  );
}
