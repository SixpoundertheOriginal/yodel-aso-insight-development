import { supabase } from '@/integrations/supabase/client';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function getAuthHeaders(orgId?: string): Promise<Record<string, string>> {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session.session?.access_token) {
    throw new AdminApiError('No valid session found', 401);
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${session.session.access_token}`,
    'Content-Type': 'application/json',
  };

  // Add org context if available
  if (orgId) {
    headers['X-Org-Id'] = orgId;
  } else {
    // Try to get current org from localStorage
    const currentOrgId = localStorage.getItem('currentOrgId');
    if (currentOrgId) {
      headers['X-Org-Id'] = currentOrgId;
    }
  }

  return headers;
}

async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
  orgId?: string
): Promise<T> {
  try {
    const headers = await getAuthHeaders(orgId);
    
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new AdminApiError(
        result?.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        result
      );
    }

    if (!result?.success) {
      throw new AdminApiError(
        result?.error || 'API call failed',
        response.status,
        result
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }
    throw new AdminApiError(
      error instanceof Error ? error.message : 'Unknown API error'
    );
  }
}

// Organizations API
export const organizationsApi = {
  list: () => apiCall('/api/admin/organizations'),
  
  create: (data: any) =>
    apiCall('/api/admin/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  update: (id: string, data: any) =>
    apiCall(`/api/admin/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
  delete: (id: string) =>
    apiCall(`/api/admin/organizations/${id}`, {
      method: 'DELETE',
    }),
};

// Users API
export const usersApi = {
  list: () => apiCall('/api/admin/users'),
  
  invite: (data: any) =>
    apiCall('/api/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  // Legacy action-based calls for compatibility
  create: (data: any) =>
    apiCall('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...data }),
    }),
    
  update: (id: string, data: any) =>
    apiCall('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'update', id, payload: data }),
    }),
    
  delete: (id: string) =>
    apiCall('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    }),
    
  resetPassword: (id: string) =>
    apiCall('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'resetPassword', id }),
    }),
};

// Dashboard API
export const dashboardApi = {
  metrics: () => apiCall('/api/admin/dashboard-metrics'),
  activity: () => apiCall('/api/admin/recent-activity'),
};

// System Health API
export const systemApi = {
  whoami: () => apiCall('/api/whoami'),
  health: () => apiCall('/api/health'),
};