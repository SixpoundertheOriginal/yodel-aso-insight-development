import { adminClient, AdminApiError } from './adminClient';
import type { Organization } from '@/types/organization';

// Re-export AdminApiError for backward compatibility
export { AdminApiError };

// Import existing types used by components
type User = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: { role: string; organization_id: string }[];
  organization_id: string;
  organizations?: {
    id: string;
    name: string;
    slug: string;
    [key: string]: unknown;
  };
  status?: string;
  last_sign_in_at?: string;
  email_confirmed: boolean;
  created_at?: string;
  updated_at?: string;
};

type WhoAmIResponse = {
  is_super_admin: boolean;
  user: User;
  organization?: Organization;
  organizations?: Organization[];
};

type AdminDashboardMetrics = {
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
};

type ActivityItem = {
  id: string;
  type: 'user_login' | 'org_created' | 'app_approved' | 'partnership_created';
  message: string;
  user: string;
  timestamp: Date | string;
  metadata?: Record<string, unknown>;
};

// Organizations API
export const organizationsApi = {
  list: (): Promise<Organization[]> => adminClient.get<Organization[]>('admin-organizations'),
  
  create: (data: any): Promise<Organization> => adminClient.post<Organization>('admin-organizations', data),
    
  update: (id: string, data: any): Promise<Organization> => adminClient.put<Organization>('admin-organizations', id, data),
    
  delete: (id: string): Promise<void> => adminClient.delete<void>('admin-organizations', id),
};

// Users API
export const usersApi = {
  list: (): Promise<User[]> => adminClient.get<User[]>('admin-users'),
  
  invite: (data: any): Promise<User> => adminClient.invoke<User>('admin-users-invite', data),
    
  // Legacy action-based calls for compatibility
  create: (data: any): Promise<User> => adminClient.invoke<User>('admin-users', { action: 'create', ...data }),
    
  update: (id: string, data: any): Promise<User> => adminClient.invoke<User>('admin-users', { action: 'update', id, payload: data }),
    
  delete: (id: string): Promise<void> => adminClient.invoke<void>('admin-users', { action: 'delete', id }),
    
  resetPassword: (id: string): Promise<{ email: string }> => adminClient.invoke<{ email: string }>('admin-users', { action: 'resetPassword', id }),
};

// Dashboard API
export const dashboardApi = {
  metrics: (): Promise<AdminDashboardMetrics> => adminClient.get<AdminDashboardMetrics>('admin-dashboard-metrics'),
  activity: (): Promise<ActivityItem[]> => adminClient.get<ActivityItem[]>('admin-recent-activity'),
};

// System Health API
export const systemApi = {
  whoami: (): Promise<WhoAmIResponse> => adminClient.get<WhoAmIResponse>('admin-whoami'),
  health: (): Promise<{ status: string; timestamp: string; service: string; version: string }> => adminClient.get('admin-health'),
};