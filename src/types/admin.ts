export type HealthStatus = 'excellent' | 'good' | 'warning' | 'critical';

export type UserRole = 'super_admin' | 'org_admin' | 'aso_manager' | 'analyst' | 'viewer';

export interface AdminDashboardMetrics {
  platform_health: {
    status: HealthStatus;
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
    by_role: Record<UserRole, number>;
  };

  bigquery_clients: {
    total_approved: number;
    data_volume_gb: number;
    query_count_today: number;
    organizations_with_access: number;
  };

  security: {
    failed_login_attempts_24h: number;
    suspicious_activities: number;
    audit_log_entries_today: number;
    compliance_score: number;
  };

  apps: {
    total: number;
  };
}

export interface AdminNavigation {
  platform_overview: {
    dashboard: string;
    system_status: string;
    analytics: string;
  };

  organization_management: {
    organizations: string;
    partnerships: string;
    client_access: string;
    billing_overview: string;
  };

  user_management: {
    all_users: string;
    role_management: string;
    invitations: string;
    user_analytics: string;
  };

  data_management: {
    bigquery_clients: string;
    app_approvals: string;
    data_pipeline: string;
    data_quality: string;
  };

  security_compliance: {
    audit_logs: string;
    security_monitoring: string;
    compliance_reports: string;
    access_reviews: string;
  };

  platform_settings: {
    feature_flags: string;
    system_configuration: string;
    maintenance_mode: string;
    backup_recovery: string;
  };
}


export interface AdminDashboardResponse {
  metrics: AdminDashboardMetrics;
  organizations: {
    id: string;
    name: string;
    subscription_tier?: string | null;
  }[];
}

