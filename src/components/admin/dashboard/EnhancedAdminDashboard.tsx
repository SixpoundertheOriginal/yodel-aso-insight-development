import React, { useEffect, useState } from 'react';
import { ExecutiveMetricCard } from './ExecutiveMetricCard';
import { PlatformHealthChart } from './PlatformHealthChart';
import { QuickActionsPanel } from './QuickActionsPanel';
import { RecentActivityFeed } from './RecentActivityFeed';

interface AdminDashboardMetrics {
  platform_health: {
    status: 'excellent' | 'good' | 'warning' | 'critical';
    uptime_percentage: number;
    response_time_avg: number;
    error_rate: number;
  };
  organizations: {
    total: number;
    active: number;
    enterprise_tier: number;
    pending_invitations: number;
    partnerships_active: number;
  };
  users: {
    total_users: number;
    active_last_30_days: number;
    new_this_month: number;
    pending_invitations: number;
    by_role: Record<string, number>;
  };
  bigquery_clients: {
    total_approved: number;
    data_volume_gb: number;
    query_count_today: number;
    organizations_with_access?: number;
  };
  security: {
    failed_login_attempts_24h: number;
    suspicious_activities: number;
    audit_log_entries_today?: number;
    compliance_score: number;
  };
}

export const EnhancedAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState(new Date());

  useEffect(() => {
    loadDashboardMetrics();
    const interval = setInterval(loadDashboardMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard-metrics');
      const data = await response.json();
      setMetrics(data);
      setRefreshTime(new Date());
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !metrics) {
    return <div className="admin-dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="enhanced-admin-dashboard">
      <div className="dashboard-header">
        <h1>Platform Overview</h1>
        <p className="last-updated">Last updated: {refreshTime.toLocaleTimeString()}</p>
      </div>

      <div className="executive-metrics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ExecutiveMetricCard
          title="Platform Health"
          value={metrics?.platform_health.status || 'good'}
          trend="stable"
          status={metrics?.platform_health.status || 'good'}
          subtitle={`${metrics?.platform_health.uptime_percentage}% uptime`}
        />
        <ExecutiveMetricCard
          title="Organizations"
          value={metrics?.organizations.total || 0}
          subtitle={`${metrics?.organizations.active || 0} active`}
          trend="up"
          details={`${metrics?.organizations.partnerships_active || 0} partnerships`}
        />
        <ExecutiveMetricCard
          title="Platform Users"
          value={metrics?.users.total_users || 0}
          subtitle={`${metrics?.users.active_last_30_days || 0} active (30d)`}
          trend="up"
          details={`${metrics?.users.new_this_month || 0} new this month`}
        />
        <ExecutiveMetricCard
          title="Data Sources"
          value={metrics?.bigquery_clients.total_approved || 0}
          subtitle={`${metrics?.bigquery_clients.query_count_today || 0} queries today`}
          trend="stable"
          details={`${metrics?.bigquery_clients.data_volume_gb || 0}GB processed`}
        />
      </div>

      <div className="monitoring-grid grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PlatformHealthChart metrics={metrics} />
        <div className="security-overview bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Security Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Failed Logins (24h)</span>
              <span className="font-mono">{metrics?.security.failed_login_attempts_24h || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Suspicious Activities</span>
              <span className="font-mono">{metrics?.security.suspicious_activities || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Compliance Score</span>
              <span className="font-mono">{metrics?.security.compliance_score || 100}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="action-panels grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActionsPanel />
        <RecentActivityFeed />
        <div className="system-alerts bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">System Alerts</h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">No active alerts</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;
