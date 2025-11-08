import { useState, useMemo, useEffect } from 'react';
import { useEnterpriseAnalytics } from '@/hooks/useEnterpriseAnalytics';
import { usePermissions } from '@/hooks/usePermissions';
import { logger, truncateOrgId } from '@/utils/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp as TrendingUpIcon, TrendingDown, Minus, Database, RefreshCw, Activity, BarChart3, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { DateRangePicker } from '@/components/DateRangePicker';
import { CompactAppSelector } from '@/components/CompactAppSelector';
import { CompactTrafficSourceSelector } from '@/components/CompactTrafficSourceSelector';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format, subDays, parseISO } from 'date-fns';
import KpiCard from "@/components/kpi/KpiCard";

/**
 * KPIs OVERVIEW DASHBOARD
 *
 * Clean architecture matching ReportingDashboardV2:
 * - Direct BigQuery pipeline via useEnterpriseAnalytics
 * - App picker, date picker, traffic source filter
 * - No legacy context dependencies
 *
 * Refactored: 2025-11-08
 */
export default function Dashboard() {
  const { organizationId, email, availableOrgs } = usePermissions();

  // Find organization name from available orgs
  const currentOrg = availableOrgs?.find(org => org.id === organizationId);
  const organizationName = currentOrg?.name || 'Organization';

  // ✅ DYNAMIC DATE RANGE: Defaults to last 30 days
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // ✅ APP SELECTION: Track selected app IDs for filtering
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // ✅ TRAFFIC SOURCE SELECTION: Track selected traffic sources for filtering
  const [selectedTrafficSources, setSelectedTrafficSources] = useState<string[]>([]);

  // ✅ DIRECT BIGQUERY PIPELINE: Using simple hook with triple filtering
  const { data, isLoading, error, refetch } = useEnterpriseAnalytics({
    organizationId: organizationId || '',
    dateRange,
    trafficSources: selectedTrafficSources,
    appIds: selectedAppIds
  });

  // Log only when data changes
  useEffect(() => {
    if (data) {
      logger.dashboard(
        `KPIs Overview: ${data.meta?.raw_rows || 0} rows, source=${data.meta?.data_source}, org=${truncateOrgId(organizationId)}`
      );
    }
  }, [data, organizationId]);

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

  // ✅ EXTRACT AVAILABLE APPS
  const availableApps = useMemo(() => {
    if (data?.meta?.all_accessible_app_ids) {
      return data.meta.all_accessible_app_ids.map(appId => ({
        app_id: appId,
        app_name: appId
      }));
    }
    if (data?.meta?.app_ids) {
      return data.meta.app_ids.map(appId => ({
        app_id: appId,
        app_name: appId
      }));
    }
    if (data?.rawData) {
      const uniqueAppIds = Array.from(new Set(data.rawData.map(row => row.app_id)));
      return uniqueAppIds.map(appId => ({
        app_id: appId,
        app_name: appId
      }));
    }
    return [];
  }, [data?.meta?.all_accessible_app_ids, data?.meta?.app_ids, data?.rawData]);

  // ✅ EXTRACT AVAILABLE TRAFFIC SOURCES
  const availableTrafficSources = useMemo(() => {
    if (data?.meta?.available_traffic_sources) {
      return data.meta.available_traffic_sources;
    }
    if ((data as any)?.availableTrafficSources) {
      return (data as any).availableTrafficSources;
    }
    return [];
  }, [data]);

  // ✅ LOADING STATE
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Loading KPIs Overview</h2>
              <p className="text-sm text-muted-foreground">Fetching BigQuery data...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error loading dashboard data:</strong> {error.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </MainLayout>
    );
  }

  // ✅ EXTRACT KPI VALUES
  const impressionsValue = data?.kpis?.impressions || 0;
  const impressionsDelta = data?.kpis?.impressions_delta || 0;
  const downloadsValue = data?.kpis?.downloads || 0;
  const downloadsDelta = data?.kpis?.downloads_delta || 0;
  const pageViewsValue = data?.kpis?.product_page_views || 0;
  const pageViewsDelta = data?.kpis?.product_page_views_delta || 0;
  const productPageCvrValue = data?.kpis?.product_page_cvr || 0;
  const productPageCvrDelta = data?.kpis?.product_page_cvr_delta || 0;

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">KPIs Overview</h1>
            <p className="text-muted-foreground">
              {organizationName} • {formatDateRange(dateRange.start, dateRange.end)}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filters Row */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              <CompactAppSelector
                selectedAppIds={selectedAppIds}
                onSelectionChange={setSelectedAppIds}
                availableApps={availableApps}
              />
              <CompactTrafficSourceSelector
                selectedSources={selectedTrafficSources}
                onSelectionChange={setSelectedTrafficSources}
                availableSources={availableTrafficSources}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Source Indicator */}
        {data?.meta?.data_source && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Data source: <strong>{data.meta.data_source}</strong> •
              Rows: <strong>{data.meta.raw_rows?.toLocaleString() || 0}</strong> •
              Apps: <strong>{data.meta.app_ids?.length || 0}</strong>
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* KPI Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Impressions"
            value={impressionsValue}
            delta={impressionsDelta}
            mode="regular"
          />
          <KpiCard
            label="Downloads"
            value={downloadsValue}
            delta={downloadsDelta}
            mode="regular"
          />
          <KpiCard
            label="Product Page Views"
            value={pageViewsValue}
            delta={pageViewsDelta}
            mode="regular"
          />
          <KpiCard
            label="Product Page CVR"
            value={productPageCvrValue}
            delta={productPageCvrDelta}
            unit="%"
            mode="regular"
          />
        </div>

        {/* Empty State */}
        {data?.rawData?.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                No data found for the selected filters. Try adjusting your date range,
                apps, or traffic sources.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Debug Info (dev only) */}
        {process.env.NODE_ENV === 'development' && data && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-1">
              <div>Raw Rows: {data.meta?.raw_rows}</div>
              <div>Apps: {data.meta?.app_ids?.length}</div>
              <div>Traffic Sources: {availableTrafficSources.join(', ')}</div>
              <div>Date Range: {dateRange.start} to {dateRange.end}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
