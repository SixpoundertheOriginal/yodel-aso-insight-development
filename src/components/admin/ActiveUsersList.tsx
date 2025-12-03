/**
 * Active Users List Component
 *
 * Purpose: Show "who's online" for super admin monitoring
 * Features:
 * - Real-time list of active users (last 5 minutes)
 * - Device/browser information
 * - Session duration
 * - Auto-refresh every 10 seconds
 */

import { useEffect, useState } from 'react';
import { SessionService, type ActiveSession, type SessionStats } from '@/services/sessionService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Monitor, Smartphone, Tablet, Globe, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ActiveUsersList() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load active sessions
  const loadActiveSessions = async () => {
    try {
      const [sessions, stats] = await Promise.all([
        SessionService.getActiveSessions(5), // Last 5 minutes
        SessionService.getSessionStats(),
      ]);

      setActiveSessions(sessions);
      setSessionStats(stats);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    loadActiveSessions();

    if (autoRefresh) {
      const interval = setInterval(loadActiveSessions, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Get device icon
  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Format PostgreSQL interval to human-readable duration
  const formatDuration = (pgInterval: string | null): string => {
    if (!pgInterval) return 'Unknown';

    // Parse PostgreSQL interval format (e.g., "01:23:45" or "2 days 01:23:45")
    const match = pgInterval.match(/(?:(\d+) days? )?(\d+):(\d+):(\d+)/);
    if (!match) return pgInterval;

    const days = parseInt(match[1] || '0');
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3]);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats?.activeLast5min || 0}</div>
            <p className="text-xs text-muted-foreground">Last 5 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (1 hour)</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats?.activeLast1hour || 0}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
            <Monitor className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats?.totalSessionsToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {sessionStats?.avgSessionDuration ? formatDuration(sessionStats.avgSessionDuration) : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Who's Online
              </CardTitle>
              <CardDescription>
                Users active in the last 5 minutes (auto-refresh: {autoRefresh ? 'ON' : 'OFF'})
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadActiveSessions} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? 'Loading...' : 'No active users'}
              </div>
            ) : (
              activeSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-lg">{session.userEmail}</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <span className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse"></span>
                        Online
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(session.deviceType)}
                        <span>{session.deviceType || 'Unknown'}</span>
                      </div>

                      {session.browser && (
                        <div className="flex items-center gap-1">
                          <Monitor className="h-4 w-4" />
                          <span>{session.browser}</span>
                        </div>
                      )}

                      {session.os && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span>{session.os}</span>
                        </div>
                      )}

                      {session.ipAddress && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span>{session.ipAddress}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Last active: {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                      </span>
                      <span>
                        Session: {formatDuration(session.sessionDuration)}
                      </span>
                      {session.countryCode && (
                        <Badge variant="outline" className="text-xs">
                          {session.countryCode}
                          {session.city && ` • ${session.city}`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
