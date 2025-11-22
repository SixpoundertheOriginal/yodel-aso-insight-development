/**
 * Workspace Apps Page
 *
 * Displays all apps monitored for ASO audit tracking.
 * Shows audit scores, last checked timestamps, and quick actions.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  RefreshCw,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  BookmarkCheck
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  useAuditEnabledApps,
  useRemoveMonitoredApp,
  useSaveMonitoredApp
} from '@/hooks/useMonitoredAppForAudit';
import { formatDistanceToNow } from 'date-fns';
import { getScoreColor } from '@/lib/numberFormat';

export const WorkspaceAppsPage: React.FC = () => {
  const { profile } = useUserProfile();
  const organizationId = profile?.organization_id;

  const { data: apps, isLoading } = useAuditEnabledApps(organizationId);
  const { mutate: removeApp, isPending: isRemoving } = useRemoveMonitoredApp();
  const { mutate: refreshApp, isPending: isRefreshing } = useSaveMonitoredApp();

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
              Apps tracked for continuous ASO audit analysis
            </p>
          </div>
        </div>

        {/* Apps Grid */}
        {apps && apps.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {apps.map(app => {
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
                      <Badge
                        variant="outline"
                        className="border-emerald-400/30 text-emerald-400"
                      >
                        <BookmarkCheck className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Audit Score */}
                    {auditScore !== null ? (
                      <div className="bg-zinc-800/50 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">Latest Audit Score</span>
                          <span className={`text-2xl font-bold ${scoreColorClass}`}>
                            {auditScore}
                            <span className="text-sm text-zinc-500">/100</span>
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Checked {lastChecked}</p>
                      </div>
                    ) : (
                      <div className="bg-zinc-800/50 rounded p-3">
                        <p className="text-xs text-zinc-400">No audit data available yet</p>
                      </div>
                    )}

                    {/* Metadata Cache Status */}
                    <div className="text-xs text-zinc-500">
                      <span className="text-zinc-400">Metadata cached:</span> {metadataAge}
                    </div>

                    {/* Actions */}
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

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshApp(app)}
                        disabled={isRefreshing}
                        className="border-emerald-400/30 text-emerald-400 hover:bg-emerald-900/20"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
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

                    {/* Developer Info */}
                    {app.developer_name && (
                      <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-3">
                        <span className="text-zinc-400">Developer:</span> {app.developer_name}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

export default WorkspaceAppsPage;
