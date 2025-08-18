import React from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { AdminDashboardResponse, AdminDashboardMetrics } from '@/types/admin';

const AdminPage: React.FC = () => {
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();

  const { data: dashboardData, isLoading: metricsLoading } = useQuery<AdminDashboardResponse>({
    queryKey: ['admin-dashboard-data'],
    queryFn: async () => {
      const [orgsResult, usersResult, appsResult, auditResult] = await Promise.all([
        supabase.from('organizations').select('id, name, subscription_tier', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('apps').select('id', { count: 'exact' }),
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);

      const enterpriseCount =
        orgsResult.data?.filter((org) => org.subscription_tier === 'enterprise').length || 0;

      const metrics: AdminDashboardMetrics = {
        platform_health: {
          status: 'good',
          uptime_percentage: 99.9,
          response_time_avg: 0,
          error_rate: 0,
        },
        organizations: {
          total: orgsResult.count || 0,
          active: orgsResult.count || 0,
          enterprise_tier: enterpriseCount,
          pending_invitations: 0,
          partnerships_active: 0,
        },
        users: {
          total_users: usersResult.count || 0,
          active_last_30_days: 0,
          new_this_month: 0,
          pending_invitations: 0,
          by_role: {},
        },
        bigquery_clients: {
          total_approved: 0,
          data_volume_gb: 0,
          query_count_today: 0,
          organizations_with_access: 0,
        },
        security: {
          failed_login_attempts_24h: 0,
          suspicious_activities: 0,
          audit_log_entries_today: auditResult.count || 0,
          compliance_score: 100,
        },
        apps: {
          total: appsResult.count || 0,
        },
      };

      return {
        metrics,
        organizations: orgsResult.data || [],
      };
    },
    enabled: isSuperAdmin,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, resource_type, created_at, profiles(email)')
        .order('created_at', { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: isSuperAdmin,
  });

  if (permissionsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-zinc-400">Executive metrics and management</p>
        </div>

        {metricsLoading ? (
          <div className="text-zinc-400">Loading system statistics...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{dashboardData?.metrics.organizations.total}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{dashboardData?.metrics.users.total_users}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Total Apps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{dashboardData?.metrics.apps.total}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500 capitalize">{dashboardData?.metrics.platform_health.status}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Audit Logs Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{dashboardData?.metrics.security.audit_log_entries_today}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-foreground">Organizations</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Manage platform organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData?.organizations.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                          <p className="text-foreground font-medium">{org.name}</p>
                        </div>
                        {org.subscription_tier && (
                          <Badge variant="secondary" className="bg-zinc-700 text-zinc-300">
                            {org.subscription_tier}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-foreground">Recent Activity</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Latest system activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity?.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                          <p className="text-foreground text-sm">{activity.action}</p>
                          <p className="text-zinc-400 text-xs">{activity.resource_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-400 text-xs">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminPage;

