/**
 * MonitoredAppsPage (Phase 19)
 *
 * Bible-driven monitoring dashboard for all tracked apps.
 * Shows audit history, trends, and validation state.
 *
 * Features:
 * - Lists all monitored apps with Bible-driven audit scores
 * - Shows score trends (improvement/decline)
 * - Displays validation state (valid/invalid/needs_rebuild)
 * - Links to detailed audit history view
 * - Filter by app name, platform, status
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Smartphone,
  RefreshCw,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  BookmarkCheck,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  useAuditEnabledApps,
  useRemoveMonitoredApp,
  useSaveMonitoredApp
} from '@/hooks/useMonitoredAppForAudit';
import { formatDistanceToNow } from 'date-fns';
import { getScoreColor } from '@/lib/numberFormat';

export const MonitoredAppsPage: React.FC = () => {
  const { profile } = useUserProfile();
  const organizationId = profile?.organization_id;

  const { data: apps, isLoading } = useAuditEnabledApps(organizationId);
  const { mutate: removeApp, isPending: isRemoving } = useRemoveMonitoredApp();
  const { mutate: refreshApp, isPending: isRefreshing } = useSaveMonitoredApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'needs_rebuild'>('all');

  const handleRemoveApp = (appId: string, platform: 'ios' | 'android') => {
    if (!organizationId) return;

    if (
      confirm(
        'Remove this app from audit monitoring? This will delete all audit snapshots and cache data.'
      )
    ) {
      removeApp({ app_id: appId, platform, organizationId });
    }
  };

  const handleRefreshApp = (app: any) => {
    refreshApp({
      app_id: app.app_id,
      platform: app.platform,
      app_name: app.app_name,
      locale: app.locale || 'us',
      bundle_id: app.bundle_id,
      app_icon_url: app.app_icon_url,
      developer_name: app.developer_name,
      category: app.category,
      primary_country: app.primary_country || 'us',
      audit_enabled: true
    });
  };

  // Filter apps based on search query and status
  const filteredApps = apps?.filter(app => {
    const matchesSearch = searchQuery
      ? app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.app_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesStatus = statusFilter === 'all' || app.validated_state === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Render validation state badge
  const renderValidationBadge = (state: string | null) => {
    switch (state) {
      case 'valid':
        return (
          <Badge variant="outline" className="border-emerald-400/30 text-emerald-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Valid
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="outline" className="border-red-400/30 text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Invalid
          </Badge>
        );
      case 'needs_rebuild':
        return (
          <Badge variant="outline" className="border-amber-400/30 text-amber-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Needs Rebuild
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-zinc-400/30 text-zinc-400">
            Unknown
          </Badge>
        );
    }
  };

  // Render score trend indicator
  const renderTrendIndicator = (app: any) => {
    // TODO: When aso_audit_snapshots has multiple entries, compute trend
    // For now, show neutral if no trend data
    return <Minus className="h-4 w-4 text-zinc-500" />;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Monitored Apps</h1>
            <p className="text-muted-foreground">Loading your monitored apps...</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-zinc-900/50 border-zinc-800 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-zinc-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Monitored Apps</h1>
            <p className="text-muted-foreground">
              Apps tracked for continuous Bible-driven ASO audit analysis
            </p>
          </div>
        </div>

        {/* Filters */}
        {apps && apps.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by app name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? '' : 'border-zinc-700'}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'valid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('valid')}
                className={statusFilter === 'valid' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-zinc-700'}
              >
                Valid
              </Button>
              <Button
                variant={statusFilter === 'invalid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('invalid')}
                className={statusFilter === 'invalid' ? 'bg-red-600 hover:bg-red-700' : 'border-zinc-700'}
              >
                Invalid
              </Button>
              <Button
                variant={statusFilter === 'needs_rebuild' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('needs_rebuild')}
                className={statusFilter === 'needs_rebuild' ? 'bg-amber-600 hover:bg-amber-700' : 'border-zinc-700'}
              >
                Needs Rebuild
              </Button>
            </div>
          </div>
        )}

        {/* Apps Grid */}
        {filteredApps && filteredApps.length > 0 ? (
          <>
            <div className="text-sm text-zinc-500">
              Showing {filteredApps.length} of {apps?.length} apps
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map(app => {
                const lastChecked = app.latest_audit_at
                  ? formatDistanceToNow(new Date(app.latest_audit_at), { addSuffix: true })
                  : 'Never';

                const metadataAge = app.metadata_last_refreshed_at
                  ? formatDistanceToNow(new Date(app.metadata_last_refreshed_at), {
                      addSuffix: true
                    })
                  : 'Never';

                const auditScore = app.latest_audit_score;
                const scoreColorClass = auditScore ? getScoreColor(auditScore) : 'text-zinc-400';

                return (
                  <Card
                    key={app.id}
                    className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {app.app_icon_url && (
                            <img
                              src={app.app_icon_url}
                              alt={app.app_name}
                              className="w-12 h-12 rounded-xl"
                            />
                          )}
                          <div>
                            <CardTitle className="text-lg">{app.app_name}</CardTitle>
                            <CardDescription className="text-xs">
                              {app.platform.toUpperCase()} • {app.locale}
                            </CardDescription>
                          </div>
                        </div>
                        {renderValidationBadge(app.validated_state)}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Audit Score with Trend */}
                      {auditScore !== null ? (
                        <div className="bg-zinc-800/50 rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400">Latest Audit Score</span>
                              {renderTrendIndicator(app)}
                            </div>
                            <span className={`text-2xl font-bold ${scoreColorClass}`}>
                              {auditScore}
                              <span className="text-sm text-zinc-500">/100</span>
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">Checked {lastChecked}</p>
                        </div>
                      ) : (
                        <div className="bg-zinc-800/50 rounded p-3">
                          <p className="text-xs text-zinc-400">No Bible audit data available yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefreshApp(app)}
                            disabled={isRefreshing}
                            className="mt-2 w-full border-emerald-400/30 text-emerald-400 hover:bg-emerald-900/20"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Generate Bible Audit
                          </Button>
                        </div>
                      )}

                      {/* Metadata Cache Status */}
                      <div className="text-xs text-zinc-500">
                        <span className="text-zinc-400">Metadata cached:</span> {metadataAge}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/aso-ai-hub/monitored/${app.id}`}
                            className="flex-1"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-blue-400/30 text-blue-400 hover:bg-blue-900/20"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Audit
                            </Button>
                          </Link>

                          <Link
                            to={`/aso-ai-hub/monitored/${app.id}/history`}
                            className="flex-1"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-purple-400/30 text-purple-400 hover:bg-purple-900/20"
                            >
                              <History className="h-4 w-4 mr-2" />
                              History
                            </Button>
                          </Link>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefreshApp(app)}
                            disabled={isRefreshing}
                            className="flex-1 border-emerald-400/30 text-emerald-400 hover:bg-emerald-900/20"
                          >
                            <RefreshCw
                              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                            />
                            Refresh
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveApp(app.app_id, app.platform)}
                            disabled={isRemoving}
                            className="border-red-400/30 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Developer Info */}
                      {app.developer_name && (
                        <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-3">
                          <span className="text-zinc-400">Developer:</span> {app.developer_name}
                        </div>
                      )}

                      {/* Validation Error */}
                      {app.validated_state === 'invalid' && app.validation_error && (
                        <div className="text-xs text-red-400 border-t border-zinc-800 pt-3">
                          <span className="text-red-300">Error:</span> {app.validation_error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : searchQuery || statusFilter !== 'all' ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-400 mb-2">
                No apps match your filters
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="border-zinc-700"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Smartphone className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-400 mb-2">
                No Monitored Apps
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Start monitoring apps by clicking "Monitor App" from the ASO Audit Hub
              </p>
              <Link to="/aso-unified">
                <Button variant="outline" className="border-emerald-400/30 text-emerald-400">
                  Go to ASO Audit
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default MonitoredAppsPage;
