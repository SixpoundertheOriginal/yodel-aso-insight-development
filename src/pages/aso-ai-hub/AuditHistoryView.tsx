/**
 * AuditHistoryView (Phase 19)
 *
 * Displays complete audit history timeline for a monitored app.
 *
 * Features:
 * - Timeline of all Bible-driven audit snapshots
 * - Score trend chart over time
 * - Diffs between consecutive snapshots
 * - Click snapshot to load in audit UI
 * - Metadata change tracking
 * - KPI family score trends
 */

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  FileText,
  Zap,
  ChevronRight,
  Eye,
  GitCompare
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuditHistory } from '@/hooks/useAuditHistory';
import { formatDistanceToNow, format } from 'date-fns';
import { getScoreColor } from '@/lib/numberFormat';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const AuditHistoryView: React.FC = () => {
  const { monitoredAppId } = useParams<{ monitoredAppId: string }>();
  const { profile } = useUserProfile();
  const organizationId = profile?.organization_id;
  const navigate = useNavigate();

  const [showDiffs, setShowDiffs] = useState(true);

  const { data: history, isLoading } = useAuditHistory({
    monitored_app_id: monitoredAppId,
    organization_id: organizationId,
    limit: 50,
    offset: 0,
    include_diffs: showDiffs
  });

  // Prepare chart data
  const chartData = history?.snapshots
    ?.slice()
    .reverse()
    .map((snapshot, index) => ({
      date: format(new Date(snapshot.created_at), 'MMM d, HH:mm'),
      score: snapshot.overall_score,
      kpiScore: snapshot.kpi_overall_score || null,
      timestamp: new Date(snapshot.created_at).getTime()
    })) || [];

  // Render score change indicator
  const renderScoreChange = (delta: number | null) => {
    if (!delta) {
      return (
        <div className="flex items-center gap-1 text-zinc-500">
          <Minus className="h-4 w-4" />
          <span className="text-xs">No change</span>
        </div>
      );
    }

    if (delta > 0) {
      return (
        <div className="flex items-center gap-1 text-emerald-400">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">+{delta}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-red-400">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs font-medium">{delta}</span>
      </div>
    );
  };

  // Render metadata change badges
  const renderMetadataChanges = (diff: any) => {
    const changes = [];
    if (diff.title_changed) changes.push('Title');
    if (diff.subtitle_changed) changes.push('Subtitle');
    if (diff.description_changed) changes.push('Description');

    if (changes.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {changes.map(change => (
          <Badge
            key={change}
            variant="outline"
            className="border-blue-400/30 text-blue-400 text-xs"
          >
            {change} changed
          </Badge>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Audit History</h1>
            <p className="text-muted-foreground">Loading audit history...</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-zinc-800 rounded"></div>
            <div className="h-32 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!history || history.snapshots.length === 0) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="border-zinc-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Audit History</h1>
              <p className="text-muted-foreground">No audit history available</p>
            </div>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-400 mb-2">
                No Audit History Yet
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Audit snapshots will appear here after your first Bible-driven audit
              </p>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-zinc-700"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const latestSnapshot = history.latestSnapshot;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="border-zinc-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">Audit History</h1>
            <p className="text-muted-foreground">
              {history.totalCount} audit snapshots tracked
            </p>
          </div>
        </div>

        {/* Latest Score Card */}
        {latestSnapshot && (
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-xl">Latest Audit Score</CardTitle>
              <CardDescription>
                Last checked {formatDistanceToNow(new Date(latestSnapshot.created_at), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className={`text-5xl font-bold ${getScoreColor(latestSnapshot.overall_score)}`}>
                    {latestSnapshot.overall_score}
                    <span className="text-2xl text-zinc-500">/100</span>
                  </div>
                  {history.scoreChange !== null && (
                    <div className="mt-2">
                      {renderScoreChange(history.scoreChange)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <Link to={`/aso-ai-hub/monitored/${monitoredAppId}`}>
                    <Button
                      variant="outline"
                      className="border-blue-400/30 text-blue-400 hover:bg-blue-900/20"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Audit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Trend Chart */}
        {history.hasTrend && chartData.length > 1 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Score Trend</CardTitle>
              <CardDescription>
                Overall audit score over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Overall Score"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  {chartData.some(d => d.kpiScore !== null) && (
                    <Line
                      type="monotone"
                      dataKey="kpiScore"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="KPI Score"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Audit Timeline */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audit Timeline</CardTitle>
                <CardDescription>
                  All Bible-driven audit snapshots
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiffs(!showDiffs)}
                className="border-zinc-700"
              >
                <GitCompare className="h-4 w-4 mr-2" />
                {showDiffs ? 'Hide' : 'Show'} Diffs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.snapshots.map((snapshot, index) => {
                const isLatest = index === 0;
                const previousSnapshot = history.snapshots[index + 1];
                const diff = showDiffs
                  ? history.diffs.find(d => d.from_snapshot_id === snapshot.id)
                  : null;

                return (
                  <div
                    key={snapshot.id}
                    className={`border rounded-lg p-4 ${
                      isLatest
                        ? 'border-blue-400/30 bg-blue-900/10'
                        : 'border-zinc-800 bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isLatest && (
                            <Badge
                              variant="outline"
                              className="border-blue-400/30 text-blue-400"
                            >
                              Latest
                            </Badge>
                          )}
                          <span className="text-xs text-zinc-500">
                            {format(new Date(snapshot.created_at), 'MMM d, yyyy • HH:mm')}
                          </span>
                          <span className="text-xs text-zinc-600">•</span>
                          <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(snapshot.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-xs text-zinc-400">Overall Score</span>
                            <div className={`text-2xl font-bold ${getScoreColor(snapshot.overall_score)}`}>
                              {snapshot.overall_score}
                            </div>
                          </div>

                          {snapshot.kpi_overall_score !== null && (
                            <>
                              <ChevronRight className="h-4 w-4 text-zinc-600" />
                              <div>
                                <span className="text-xs text-zinc-400">KPI Score</span>
                                <div className={`text-2xl font-bold ${getScoreColor(snapshot.kpi_overall_score)}`}>
                                  {snapshot.kpi_overall_score}
                                </div>
                              </div>
                            </>
                          )}

                          {diff && (
                            <>
                              <ChevronRight className="h-4 w-4 text-zinc-600" />
                              <div>
                                <span className="text-xs text-zinc-400">Change</span>
                                <div>
                                  {renderScoreChange(diff.overall_score_delta)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Metadata Changes */}
                        {diff && renderMetadataChanges(diff)}

                        {/* Keyword Changes */}
                        {diff && (diff.keywords_added?.length || diff.keywords_removed?.length) && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {diff.keywords_added && diff.keywords_added.length > 0 && (
                              <Badge
                                variant="outline"
                                className="border-emerald-400/30 text-emerald-400"
                              >
                                +{diff.keywords_added.length} keywords
                              </Badge>
                            )}
                            {diff.keywords_removed && diff.keywords_removed.length > 0 && (
                              <Badge
                                variant="outline"
                                className="border-red-400/30 text-red-400"
                              >
                                -{diff.keywords_removed.length} keywords
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/aso-ai-hub/snapshot/${snapshot.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-400/30 text-blue-400 hover:bg-blue-900/20"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Audit Source */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                      <Zap className="h-3 w-3" />
                      Source: {snapshot.source} • Version: {snapshot.audit_version}
                      {snapshot.kpi_version && ` • KPI: ${snapshot.kpi_version}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AuditHistoryView;
