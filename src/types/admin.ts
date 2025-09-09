export type OrgNavigationPermission = {
  organization_id: string;
  route: string;
  allowed: boolean;
  updated_at: string; // ISO timestamp
  updated_by: string | null;
};

export type UserNavigationOverride = {
  user_id: string;
  organization_id: string;
  route: string;
  allowed: boolean;
  updated_at: string; // ISO timestamp
  updated_by: string | null;
};

export type PermissionAuditLog = {
  id: string;
  actor_id: string | null;
  organization_id: string | null;
  user_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  route: string;
  old_value: boolean | null;
  new_value: boolean | null;
  created_at: string; // ISO timestamp
};

// Helper: effective permission resolution result
export type EffectiveNavPermission = {
  organization_id: string;
  user_id: string;
  route: string;
  // if null, caller should fall back to role-based defaults
  allowed: boolean | null;
};

