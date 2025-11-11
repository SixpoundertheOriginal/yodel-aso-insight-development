/**
 * Security Monitoring Dashboard
 *
 * Purpose: Admin-only page for monitoring security events and audit logs
 * Compliance: Required for SOC 2 Type II (monitoring & incident response)
 *
 * Features:
 * - Failed login attempts (last 24 hours)
 * - Suspicious activity alerts
 * - Audit log summary
 * - MFA enrollment status
 * - Session activity metrics
 *
 * Access: SUPER_ADMIN and ORG_ADMIN only
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  Activity,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface AuditLogEntry {
  id: string;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  details: any;
}

interface FailedLoginStat {
  user_email: string;
  attempt_count: number;
  last_attempt: string;
}

interface MFAStatus {
  user_email: string;
  role: string;
  mfa_enabled: boolean;
  grace_period_ends: string | null;
}

export default function SecurityMonitoring() {
  const { user } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLoginStat[]>([]);
  const [mfaStatus, setMFAStatus] = useState<MFAStatus[]>([]);
  const [sessionStats, setSessionStats] = useState({
    active_sessions: 0,
    idle_timeouts_24h: 0,
    absolute_timeouts_24h: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has admin access
  const hasAdminAccess = !Array.isArray(permissions) && (permissions?.isSuperAdmin || permissions?.isOrganizationAdmin);

  useEffect(() => {
    if (!user || permissionsLoading) return;

    if (!hasAdminAccess) {
      setError('Access Denied: Admin permissions required');
      setLoading(false);
      return;
    }

    loadSecurityData();
  }, [user, hasAdminAccess, permissionsLoading]);

  const loadSecurityData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load recent audit logs
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      
      // Map logs to include missing fields
      const mappedLogs = (logs || []).map(log => ({
        ...log,
        user_email: log.user_email || null,
        status: log.status || 'unknown',
        error_message: log.error_message || null
      }));
      setAuditLogs(mappedLogs);

  // Calculate failed login attempts (last 24 hours)
      const failedLoginAttempts = (mappedLogs || [])
        .filter(
          (log) =>
            log.action === 'login' &&
            log.status === 'failure' &&
            new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        )
        .reduce((acc, log) => {
          const email = log.user_email || 'unknown';
          if (!acc[email]) {
            acc[email] = { user_email: email, attempt_count: 0, last_attempt: log.created_at };
          }
          acc[email].attempt_count += 1;
          if (new Date(log.created_at) > new Date(acc[email].last_attempt)) {
            acc[email].last_attempt = log.created_at;
          }
          return acc;
        }, {} as Record<string, FailedLoginStat>);

      setFailedLogins(
        Object.values(failedLoginAttempts).sort((a, b) => b.attempt_count - a.attempt_count)
      );

      // Load MFA status for admin users using supabaseCompat
      try {
        const { data: mfaData, error: mfaError } = await (supabase as any).from('mfa_enforcement')
          .select('*')
          .order('grace_period_ends_at', { ascending: true });

        if (!mfaError && mfaData) {
          // Get user emails from auth.users
          const userIds = (mfaData || []).map((m: any) => m.user_id);
          const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

          if (!usersError && users) {
            const mfaWithEmails = (mfaData || []).map((mfa: any) => {
              const user = users.users.find((u) => u.id === mfa.user_id);
              return {
                user_email: user?.email || 'unknown',
                role: mfa.role,
                mfa_enabled: mfa.mfa_enabled_at !== null,
                grace_period_ends: mfa.grace_period_ends_at,
              };
            });
            setMFAStatus(mfaWithEmails);
          }
        }
      } catch (mfaError) {
        console.warn('MFA enforcement table not available:', mfaError);
        setMFAStatus([]);
      }

      // Calculate session statistics (last 24 hours)
      const sessionLogs = (mappedLogs || []).filter(
        (log) =>
          (log.action === 'session_end' || log.action === 'session_start') &&
          new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      const sessionStarts = sessionLogs.filter((log) => log.action === 'session_start').length;
      const idleTimeouts = sessionLogs.filter(
        (log) => log.action === 'session_end' && (log.details as any)?.reason === 'idle_timeout'
      ).length;
      const absoluteTimeouts = sessionLogs.filter(
        (log) => log.action === 'session_end' && (log.details as any)?.reason === 'absolute_timeout'
      ).length;

      setSessionStats({
        active_sessions: sessionStarts,
        idle_timeouts_24h: idleTimeouts,
        absolute_timeouts_24h: absoluteTimeouts,
      });
    } catch (err: any) {
      console.error('Failed to load security data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'failure':
        return <Badge className="bg-red-500">Failure</Badge>;
      case 'denied':
        return <Badge className="bg-orange-500">Denied</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading security data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page. Admin access required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate alerts
  const suspiciousActivity = failedLogins.filter((f) => f.attempt_count >= 5);
  const mfaNotEnabled = mfaStatus.filter((m) => !m.mfa_enabled);
  const mfaGraceExpiringSoon = mfaStatus.filter(
    (m) =>
      !m.mfa_enabled &&
      m.grace_period_ends &&
      new Date(m.grace_period_ends) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Within 7 days
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Monitoring
          </h1>
          <p className="text-muted-foreground">Monitor security events and audit logs</p>
        </div>
        <Badge variant="outline" className="text-sm">
          SOC 2 Compliant
        </Badge>
      </div>

      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspiciousActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Users with 5+ failed logins (24h)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Not Enabled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mfaNotEnabled.length}</div>
            <p className="text-xs text-muted-foreground">
              Admin users without MFA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.active_sessions}</div>
            <p className="text-xs text-muted-foreground">
              Session starts (24h)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(suspiciousActivity.length > 0 || mfaGraceExpiringSoon.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Security Alerts</h2>

          {suspiciousActivity.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Suspicious Login Activity Detected</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  {suspiciousActivity.length} user(s) with multiple failed login attempts:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {suspiciousActivity.map((f) => (
                    <li key={f.user_email}>
                      <strong>{f.user_email}</strong>: {f.attempt_count} failed attempts (last:{' '}
                      {formatTimestamp(f.last_attempt)})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {mfaGraceExpiringSoon.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>MFA Grace Period Expiring Soon</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  {mfaGraceExpiringSoon.length} admin user(s) need to enable MFA within 7 days:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {mfaGraceExpiringSoon.map((m) => (
                    <li key={m.user_email}>
                      <strong>{m.user_email}</strong> ({m.role}) - expires:{' '}
                      {m.grace_period_ends && formatTimestamp(m.grace_period_ends)}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="audit-logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="failed-logins">Failed Logins</TabsTrigger>
          <TabsTrigger value="mfa-status">MFA Status</TabsTrigger>
          <TabsTrigger value="sessions">Session Activity</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Logs</CardTitle>
              <CardDescription>Last 100 security events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No audit logs found</p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          {getStatusBadge(log.status)}
                          {log.resource_type && (
                            <Badge variant="outline">{log.resource_type}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {log.user_email || 'Unknown user'} •{' '}
                          {formatTimestamp(log.created_at)}
                        </div>
                        {log.error_message && (
                          <div className="text-sm text-red-600 mt-1">{log.error_message}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed Logins Tab */}
        <TabsContent value="failed-logins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Login Attempts</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {failedLogins.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-muted-foreground">No failed login attempts</p>
                  </div>
                ) : (
                  failedLogins.map((f) => (
                    <div
                      key={f.user_email}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        f.attempt_count >= 5 ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium">{f.user_email}</div>
                        <div className="text-sm text-muted-foreground">
                          Last attempt: {formatTimestamp(f.last_attempt)}
                        </div>
                      </div>
                      <Badge variant={f.attempt_count >= 5 ? 'destructive' : 'secondary'}>
                        {f.attempt_count} attempts
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MFA Status Tab */}
        <TabsContent value="mfa-status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication Status</CardTitle>
              <CardDescription>Admin users MFA enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mfaStatus.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No admin users found
                  </p>
                ) : (
                  mfaStatus.map((m) => (
                    <div
                      key={m.user_email}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{m.user_email}</div>
                        <div className="text-sm text-muted-foreground">
                          Role: {m.role}
                          {m.grace_period_ends && !m.mfa_enabled && (
                            <span>
                              {' '}
                              • Grace period ends: {formatTimestamp(m.grace_period_ends)}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.mfa_enabled ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Enabled
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Activity Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Activity</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Session Starts</span>
                  </div>
                  <div className="text-3xl font-bold">{sessionStats.active_sessions}</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Idle Timeouts</span>
                  </div>
                  <div className="text-3xl font-bold">{sessionStats.idle_timeouts_24h}</div>
                  <p className="text-xs text-muted-foreground mt-1">15 min inactivity</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Absolute Timeouts</span>
                  </div>
                  <div className="text-3xl font-bold">{sessionStats.absolute_timeouts_24h}</div>
                  <p className="text-xs text-muted-foreground mt-1">8 hour maximum</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
