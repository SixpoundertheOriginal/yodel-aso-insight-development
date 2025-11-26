/**
 * MonitoredAppsWidget
 *
 * Compact display of monitored apps on the main ASO AI Hub page.
 * Shows recent monitored apps with quick access to audits and history.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookmarkCheck,
  ExternalLink,
  History,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAuditEnabledApps, useSaveMonitoredApp } from '@/hooks/useMonitoredAppForAudit';
import { formatDistanceToNow } from 'date-fns';
import { getScoreColor } from '@/lib/numberFormat';

interface MonitoredAppsWidgetProps {
  organizationId: string;
  maxApps?: number;
}

export const MonitoredAppsWidget: React.FC<MonitoredAppsWidgetProps> = ({
  organizationId,
  maxApps = 6
}) => {
  const { data: apps, isLoading } = useAuditEnabledApps(organizationId);
  const { mutate: refreshApp, isPending: isRefreshing } = useSaveMonitoredApp();

  const handleRefreshApp = (app: any) => {
    refreshApp({
      organizationId: organizationId,
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

  // Render validation state badge
  const renderValidationBadge = (state: string | null) => {
    switch (state) {
      case 'valid':
        return (
          <Badge variant="outline" className="border-emerald-400/30 text-emerald-400 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Valid
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="outline" className="border-red-400/30 text-red-400 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Invalid
          </Badge>
        );
      case 'needs_rebuild':
      case 'stale':
        return (
          <Badge variant="outline" className="border-amber-400/30 text-amber-400 text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Stale
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookmarkCheck className="h-5 w-5 text-emerald-400" />
              <CardTitle>Monitored Apps</CardTitle>
            </div>
          </div>
          <CardDescription>Loading your monitored apps...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!apps || apps.length === 0) {
    return null; // Don't show widget if no monitored apps
  }

  const displayedApps = apps.slice(0, maxApps);
  const hasMore = apps.length > maxApps;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookmarkCheck className="h-5 w-5 text-emerald-400" />
            <CardTitle>Monitored Apps</CardTitle>
            <Badge variant="outline" className="ml-2">{apps.length}</Badge>
          </div>
          <Link to="/aso-ai-hub/monitored">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-foreground">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
        <CardDescription>
          Quick access to your Bible-driven audit tracking
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedApps.map((app) => {
            const lastChecked = app.latest_audit_at
              ? formatDistanceToNow(new Date(app.latest_audit_at), { addSuffix: true })
              : 'Never';

            const auditScore = app.latest_audit_score;
            const scoreColorClass = auditScore ? getScoreColor(auditScore) : 'text-zinc-400';

            return (
              <Card
                key={app.id}
                className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {app.app_icon_url && (
                        <img
                          src={app.app_icon_url}
                          alt={app.app_name}
                          className="w-10 h-10 rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{app.app_name}</h3>
                        <p className="text-xs text-zinc-500">
                          {app.platform.toUpperCase()} • {app.locale}
                        </p>
                      </div>
                    </div>
                    {renderValidationBadge(app.validated_state)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Audit Score */}
                  {auditScore !== null ? (
                    <div className="flex items-center justify-between bg-zinc-900/50 rounded p-2">
                      <span className="text-xs text-zinc-400">Score</span>
                      <span className={`text-xl font-bold ${scoreColorClass}`}>
                        {auditScore}
                        <span className="text-xs text-zinc-500">/100</span>
                      </span>
                    </div>
                  ) : (
                    <div className="bg-zinc-900/50 rounded p-2">
                      <p className="text-xs text-zinc-500 text-center">No audit yet</p>
                    </div>
                  )}

                  <p className="text-xs text-zinc-500">
                    {auditScore ? `Checked ${lastChecked}` : 'Not yet audited'}
                  </p>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Link to={`/aso-ai-hub/monitored/${app.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-blue-400/30 text-blue-400 hover:bg-blue-900/20 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Audit
                        </Button>
                      </Link>

                      <Link to={`/aso-ai-hub/monitored/${app.id}/history`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-purple-400/30 text-purple-400 hover:bg-purple-900/20 text-xs"
                        >
                          <History className="h-3 w-3 mr-1" />
                          History
                        </Button>
                      </Link>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshApp(app)}
                      disabled={isRefreshing}
                      className="w-full border-emerald-400/30 text-emerald-400 hover:bg-emerald-900/20 text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-4 text-center">
            <Link to="/aso-ai-hub/monitored">
              <Button variant="outline" className="border-zinc-700">
                View All {apps.length} Apps
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
