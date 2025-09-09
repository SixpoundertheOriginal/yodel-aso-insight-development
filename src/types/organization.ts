// Centralized Organization type with soft-delete support
export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  subscription_tier?: 'starter' | 'professional' | 'enterprise' | null;
  app_limit?: number | null;
  app_limit_enforced?: boolean | null;
  settings?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null; // soft-delete flag
  // Admin UI specific fields
  user_count?: number;
  active_users_30d?: number;
  last_activity?: Date;
  app_count?: number;
  [key: string]: unknown;
}

export type NewOrganization = Pick<
  Organization,
  'name' | 'slug' | 'domain' | 'subscription_tier'
>;

// Helper to filter only active organizations
export const onlyActive = <T extends { deleted_at?: string | null }>(rows: T[]): T[] =>
  rows.filter(r => !r.deleted_at);