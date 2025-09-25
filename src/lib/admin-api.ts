import { adminClient, AdminApiError } from './adminClient';
import type { Organization } from '@/types/organization';

// Re-export AdminApiError for backward compatibility
export { AdminApiError };

// User type matching canonical API contract
type User = {
  // Canonical fields
  user_id: string;
  organization_id: string;
  
  // Backward compatibility
  id: string;
  
  // User data
  email: string;
  first_name?: string;
  last_name?: string;
  
  // Organization data
  organization?: {
    id: string;
    name: string;
    slug: string;
    [key: string]: unknown;
  };
  organizations?: {
    id: string;
    name: string;
    slug: string;
    [key: string]: unknown;
  };
  roles: { role: string; organization_id: string }[];
  role?: string;
  
  // Status fields
  status?: string;
  email_confirmed: boolean;
  last_sign_in?: string;
  last_sign_in_at?: string;
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

export type PlatformFeature = {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  is_enabled?: boolean;
};

// Organizations API
export const organizationsApi = {
  list: (): Promise<Organization[]> => adminClient.invoke<Organization[]>('admin-organizations', { action: 'list' }),
  
  create: (data: any): Promise<Organization> => adminClient.post<Organization>('admin-organizations', data),
    
  update: (id: string, data: any): Promise<Organization> => adminClient.put<Organization>('admin-organizations', id, data),
    
  delete: (id: string): Promise<void> => adminClient.delete<void>('admin-organizations', id),
};

// Feature management API
export const featuresApi = {
  listPlatform: (): Promise<{ features: PlatformFeature[] }> =>
    adminClient.invoke<{ features: PlatformFeature[] }>('admin-features', { action: 'list_platform_features' }),

  listOrganization: (organizationId: string): Promise<{ organization_id: string; features: PlatformFeature[] }> =>
    adminClient.invoke<{ organization_id: string; features: PlatformFeature[] }>('admin-features', {
      action: 'get_org_features',
      organization_id: organizationId,
    }),

  toggleOrganization: (organizationId: string, featureKey: string, isEnabled: boolean): Promise<{ organization_id: string; feature_key: string; is_enabled: boolean }> =>
    adminClient.invoke('admin-features', {
      action: 'toggle_org_feature',
      organization_id: organizationId,
      feature_key: featureKey,
      is_enabled: isEnabled,
    }),
};

// Users API - Consolidated to single admin-users endpoint
export const usersApi = {
  list: (): Promise<User[]> => adminClient.invoke<User[]>('admin-users', { action: 'list' }),
  
  // Consolidated invite to use main admin-users endpoint with standardized field names
  invite: (data: any): Promise<User> => {
    // Normalize field names for consistent API contract
    const normalizedData = {
      action: 'invite',
      email: data.email,
      organization_id: data.org_id || data.organization_id, // Support both field names during transition
      roles: Array.isArray(data.roles) ? data.roles : (data.role ? [data.role] : ['VIEWER']),
      first_name: data.first_name,
      last_name: data.last_name
    };
    return adminClient.invoke<User>('admin-users', normalizedData);
  },
    
  // Updated to use canonical field names and consistent payload structure
  create: (data: any): Promise<User> => {
    const normalizedData = {
      action: 'create',
      email: data.email,
      organization_id: data.organization_id,
      roles: Array.isArray(data.roles) ? data.roles : (data.role ? [data.role] : ['VIEWER']),
      first_name: data.first_name,
      last_name: data.last_name,
      password: data.password
    };
    return adminClient.invoke<User>('admin-users', normalizedData);
  },
    
  update: (user_id: string, data: any): Promise<User> => adminClient.invoke<User>('admin-users', { action: 'update', user_id, payload: data }),
    
  delete: (user_id: string): Promise<void> => adminClient.invoke<void>('admin-users', { action: 'delete', user_id }),
    
  resetPassword: (user_id: string): Promise<{ email: string }> => adminClient.invoke<{ email: string }>('admin-users', { action: 'resetPassword', user_id }),
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
