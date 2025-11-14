import { useState, useMemo, useEffect } from 'react';
import { useEnterpriseAnalytics } from '@/hooks/useEnterpriseAnalytics';
import { usePermissions } from '@/hooks/usePermissions';
import { logger, truncateOrgId } from '@/utils/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp as TrendingUpIcon, RefreshCw, Activity, BarChart3 } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { DateRangePicker } from '@/components/DateRangePicker';
import { CompactAppSelector } from '@/components/CompactAppSelector';
import { CompactTrafficSourceSelector } from '@/components/CompactTrafficSourceSelector';
import { AsoMetricCard } from '@/components/AsoMetricCard';
import { TotalMetricCard } from '@/components/TotalMetricCard';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format, subDays, parseISO } from 'date-fns';
import { KpiTrendChart } from '@/components/analytics/KpiTrendChart';
import { TrafficSourceComparisonChart } from '@/components/analytics/TrafficSourceComparisonChart';
import { ConversionFunnelChart } from '@/components/analytics/ConversionFunnelChart';
import { MFAGracePeriodBanner } from '@/components/Auth/MFAGracePeriodBanner';
import { ContextualInsightsSidebar, SidebarState } from '@/components/AiInsightsPanel/ContextualInsightsSidebar';
import type { MetricsData, FilterContext } from '@/types/aso';
import { AsoDataProvider } from '@/context/AsoDataContext';

/**
 * PRODUCTION-READY DASHBOARD V2
 *
 * Clean architecture: Component → useEnterpriseAnalytics → BigQuery
 * No fallback logic, no demo mode, no complexity.
 *
 * Features:
 * - Real-time BigQuery data
 * - Direct pipeline (no intermediate hooks)
 * - Loading states, error states, success states
 * - KPI cards with trend indicators
 * - Traffic source breakdown
 * - Comprehensive logging for debugging
 */
export default function ReportingDashboardV2() {
  const { organizationId, availableOrgs, isSuperAdmin } = usePermissions();

  // Find organization name from available orgs
  const currentOrg = availableOrgs?.find(org => org.id === organizationId);
  const organizationName = currentOrg?.name || 'Organization';
  const organizationSlug = currentOrg?.slug || '';

  // ✅ CHECK IF YODEL MOBILE USER: Only show AI chat for Yodel Mobile organization
  const isYodelMobile = organizationSlug === 'yodel-mobile';

  // ✅ DYNAMIC DATE RANGE: Defaults to last 30 days, updates via DateRangePicker
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // ✅ APP SELECTION: Track selected app IDs for filtering
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // ✅ TRAFFIC SOURCE SELECTION: Track selected traffic sources for filtering
  const [selectedTrafficSources, setSelectedTrafficSources] = useState<string[]>([]);

  // ✅ AI CHAT SIDEBAR: Track sidebar state (visible by default for Yodel Mobile)
  const [sidebarState, setSidebarState] = useState<SidebarState>(isYodelMobile ? 'normal' : 'collapsed');

  // ✅ NEW ARCHITECTURE: Direct pipeline using simple hook with triple filtering
  const { data, isLoading, error, refetch } = useEnterpriseAnalytics({
    organizationId: organizationId || '',
    dateRange,
    trafficSources: selectedTrafficSources, // Filter by selected traffic sources
    appIds: selectedAppIds // Filter by selected apps
  });

  // Log only when data changes
  useEffect(() => {
    if (data) {
      logger.dashboard(
        `Data loaded: ${data.meta?.raw_rows || 0} rows, source=${data.meta?.data_source}, date=${dateRange.start} to ${dateRange.end}, apps=${selectedAppIds.length || 'All'}, traffic=${selectedTrafficSources.length || 'All'}`
      );
    }
  }, [data, dateRange.start, dateRange.end, selectedAppIds.length, selectedTrafficSources.length]);

  // ✅ FORMAT DATE RANGE FOR DISPLAY
  const formatDateRange = (start: string, end: string) => {
    try {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
      return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  // ✅ EXTRACT AVAILABLE APPS: Get unique app IDs from response
  const availableApps = useMemo(() => {
    // Use app_ids from meta
    if (data?.meta?.app_ids) {
      logger.dashboard(`Available apps: ${data.meta.app_ids.length} (from app_ids)`);
      return data.meta.app_ids.map(appId => ({
        app_id: String(appId),
        app_name: String(appId)
      }));
    }

    // Extract unique app IDs from raw data
    if ((data as any)?.rawData) {
      const uniqueAppIds = Array.from(new Set((data as any).rawData.map((row: any) => row.app_id)));
      logger.dashboard(`Available apps: ${uniqueAppIds.length} (from raw data)`);
      return uniqueAppIds.map(appId => ({
        app_id: String(appId),
        app_name: String(appId)
      }));
    }

    return [];
  }, [data?.meta?.app_ids, data]);

  // ✅ EXTRACT AVAILABLE TRAFFIC SOURCES: Get from response metadata
  const availableTrafficSources = useMemo(() => {
    // Fallback path: extract from rawData
    if ((data as any)?.rawData) {
      const uniqueSources = Array.from(new Set((data as any).rawData.map((row: any) => row.traffic_source).filter(Boolean))) as string[];
      return uniqueSources;
    }

    return [];
  }, [data]);

  // ✅ CALCULATE ASO METRICS: Extract Search and Browse traffic metrics
  const asoMetrics = useMemo(() => {
    if (!data?.rawData) {
      return {
        search: { impressions: 0, downloads: 0, cvr: 0 },
        browse: { impressions: 0, downloads: 0, cvr: 0 }
      };
    }

    logger.dashboard(`Calculating ASO metrics from ${data.rawData.length} rows`);

    // Filter for Search traffic
    const searchData = data.rawData.filter((row: any) =>
      row.traffic_source === 'App_Store_Search'
    );

    // Filter for Browse traffic
    const browseData = data.rawData.filter((row: any) =>
      row.traffic_source === 'App_Store_Browse'
    );

    const calculateMetrics = (rows: any[]) => {
      const totals = rows.reduce((acc, row) => ({
        impressions: acc.impressions + (row.impressions || 0),
        downloads: acc.downloads + (row.downloads || 0)
      }), { impressions: 0, downloads: 0 });

      const cvr = totals.impressions > 0
        ? (totals.downloads / totals.impressions) * 100
        : 0;

      return {
        impressions: totals.impressions,
        downloads: totals.downloads,
        cvr
      };
    };

    const searchMetrics = calculateMetrics(searchData);
    const browseMetrics = calculateMetrics(browseData);

    logger.dashboard(
      `ASO metrics - Search: ${searchData.length} rows, ${searchMetrics.impressions} imp, CVR ${searchMetrics.cvr.toFixed(2)}% | Browse: ${browseData.length} rows, ${browseMetrics.impressions} imp, CVR ${browseMetrics.cvr.toFixed(2)}%`
    );

    return {
      search: searchMetrics,
      browse: browseMetrics
    };
  }, [data?.rawData]);

  // ✅ CALCULATE TOTAL METRICS: Aggregate across all traffic sources
  const totalMetrics = useMemo(() => {
    if (!data?.rawData) {
      return {
        impressions: 0,
        downloads: 0
      };
    }

    const totals = data.rawData.reduce((acc: any, row: any) => ({
      impressions: acc.impressions + (row.impressions || 0),
      downloads: acc.downloads + (row.downloads || 0)
    }), { impressions: 0, downloads: 0 });

    console.log('📊 [TOTAL-METRICS] Calculated:', {
      impressions: totals.impressions,
      downloads: totals.downloads,
      rows: data.rawData.length
    });

    return totals;
  }, [data?.rawData]);

  // ✅ INITIALIZE SELECTION: Auto-select ALL apps on first load
  useEffect(() => {
    if (availableApps.length > 0 && selectedAppIds.length === 0) {
      console.log('📱 [DASHBOARD-V2] Initializing app selection to ALL apps:', availableApps.length);
      setSelectedAppIds(availableApps.map(app => app.app_id));
    }
  }, [availableApps.length]); // Only depend on length to avoid re-triggering

  // ✅ OPEN AI CHAT SIDEBAR: Auto-open for Yodel Mobile users
  useEffect(() => {
    if (isYodelMobile && sidebarState === 'collapsed') {
      console.log('🤖 [DASHBOARD-V2] Opening AI chat sidebar for Yodel Mobile');
      setSidebarState('normal');
    }
  }, [isYodelMobile]); // Open sidebar when Yodel Mobile org is detected

  // ✅ BUILD FILTER CONTEXT FOR AI CHAT (must be before conditional returns)
  const filterContext: FilterContext = useMemo(() => ({
    dateRange: {
      start: dateRange.start,
      end: dateRange.end
    },
    trafficSources: selectedTrafficSources.length > 0 ? selectedTrafficSources : availableTrafficSources,
    selectedApps: selectedAppIds.length > 0 ? selectedAppIds.map(String) : []
  }), [dateRange, selectedTrafficSources, selectedAppIds, availableTrafficSources]);

  // ✅ BUILD METRICS DATA FOR AI CHAT (must be before conditional returns)
  const metricsData: MetricsData | undefined = useMemo(() => {
    if (!data?.processedData) return undefined;

    return {
      summary: data.processedData.summary || {},
      traffic_sources: data.processedData.traffic_sources || [],
      rawData: data.rawData || []
    } as MetricsData;
  }, [data]);

  // [STATE] No organization ID
  if (!organizationId) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertDescription>
              <div className="font-semibold mb-2">No Organization Found</div>
              <div className="text-sm">
                Your account is not associated with an organization. Please contact support.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  // [STATE] Loading
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-yodel-orange" />
          <div className="text-lg font-medium text-zinc-200">
            Loading analytics data...
          </div>
          <div className="text-sm text-zinc-400">
            Fetching from BigQuery warehouse
          </div>
        </div>
      </MainLayout>
    );
  }

  // [STATE] Error
  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertDescription>
              <div className="font-semibold mb-2 text-red-300">
                Error Loading Analytics Data
              </div>
              <div className="text-sm text-red-200 mb-4">{error.message}</div>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="border-red-700 hover:bg-red-900/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const meta = data?.meta;

  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Main Dashboard Content */}
        <div className={cn(
          "flex-1 transition-all duration-300",
          isYodelMobile && sidebarState === 'normal' && "mr-96",
          isYodelMobile && sidebarState === 'expanded' && "mr-[600px]",
          isYodelMobile && sidebarState === 'fullscreen' && "hidden"
        )}>
          <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <Activity className="h-8 w-8 text-yodel-orange" />
            Analytics Dashboard
          </h1>
          <p className="text-zinc-400 mt-1">
            {organizationName} • {formatDateRange(dateRange.start, dateRange.end)}
          </p>
        </div>

        {/* MFA Grace Period Banner */}
        <MFAGracePeriodBanner />

        {/* ✅ COMPACT FILTER BAR: All filters in one horizontal row */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Period:
              </span>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* App Selector */}
            {availableApps.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Apps:
                  </span>
                  <CompactAppSelector
                    availableApps={availableApps}
                    selectedAppIds={selectedAppIds}
                    onSelectionChange={setSelectedAppIds}
                    isLoading={isLoading}
                  />
                </div>

                <Separator orientation="vertical" className="h-8" />
              </>
            )}

            {/* Traffic Source Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Sources:
              </span>
              <CompactTrafficSourceSelector
                availableTrafficSources={availableTrafficSources}
                selectedSources={selectedTrafficSources}
                onSelectionChange={setSelectedTrafficSources}
                isLoading={isLoading}
              />
            </div>

            {/* Refresh Button */}
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  isLoading && "animate-spin"
                )} />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* ✅ ASO EXECUTIVE KPI CARDS: Premium organic visibility metrics */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <TrendingUpIcon className="h-6 w-6 text-yodel-orange" />
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              ASO Organic Visibility
            </h2>
          </div>

          {/* Search & Browse Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AsoMetricCard
              title="App Store Search"
              icon="search"
              impressions={asoMetrics.search.impressions}
              downloads={asoMetrics.search.downloads}
              cvr={asoMetrics.search.cvr}
              isLoading={isLoading}
            />

            <AsoMetricCard
              title="App Store Browse"
              icon="browse"
              impressions={asoMetrics.browse.impressions}
              downloads={asoMetrics.browse.downloads}
              cvr={asoMetrics.browse.cvr}
              isLoading={isLoading}
            />
          </div>

          {/* ✅ Total Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TotalMetricCard
              type="impressions"
              value={totalMetrics.impressions}
              isLoading={isLoading}
            />

            <TotalMetricCard
              type="downloads"
              value={totalMetrics.downloads}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* ✅ CLEAN DATA SOURCE INDICATOR */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live Data</span>
          </div>
          <span>•</span>
          <span>{meta?.raw_rows || 0} records</span>
        </div>

        {/* ✅ CHARTS SECTION: Analytics & Insights */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics & Insights
          </h2>

          {/* KPI Trend Chart */}
          <KpiTrendChart
            data={data?.rawData || []}
            isLoading={isLoading}
          />

          {/* Two columns: Traffic Source + Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrafficSourceComparisonChart
              data={data?.rawData || []}
              isLoading={isLoading}
            />

            <ConversionFunnelChart
              data={data?.rawData || []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Traffic Sources */}
        {data?.processedData?.traffic_sources &&
          data.processedData.traffic_sources.length > 0 && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-200">Traffic Sources</CardTitle>
                <CardDescription className="text-zinc-400">
                  Performance breakdown by traffic source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.processedData.traffic_sources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between pb-4 border-b border-zinc-800 last:border-b-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-zinc-200">
                          {source.traffic_source_display || source.traffic_source}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {source.impressions?.toLocaleString()} impressions •{' '}
                          {source.downloads?.toLocaleString() ||
                            source.installs?.toLocaleString()}{' '}
                          downloads
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-200">
                          {(source.cvr || source.conversion_rate)?.toFixed(2)}% CVR
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </div>

        {/* AI Chat Sidebar - Only for Yodel Mobile users - RIGHT SIDE */}
        {organizationId && isYodelMobile && (
          <AsoDataProvider>
            <ContextualInsightsSidebar
              metricsData={metricsData}
              organizationId={organizationId}
              state={sidebarState}
              onStateChange={setSidebarState}
              isSuperAdmin={isSuperAdmin}
            />
          </AsoDataProvider>
        )}
      </div>
    </MainLayout>
  );
}
