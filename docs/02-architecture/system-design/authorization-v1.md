---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: V1 authorization system comprehensive guide (CANONICAL for authorization)
Canonical: true
Supersedes: docs/02-architecture/system-design/auth_map.md
Audience: Developers, Security Engineers, AI Agents
---

# Authorization V1 - Comprehensive Guide

Complete reference for the V1 production authorization system for Yodel ASO Insight.

## Overview

The V1 authorization system uses a three-layer model with a single source of truth.

### Architecture Summary

**Authorization SSOT:** `user_roles` table (since December 5, 2025)
**Stable API Contract:** `user_permissions_unified` view
**Frontend Authorization:** `usePermissions()` hook (PRIMARY method)
**Enforcement:** Row-Level Security (RLS) policies at database level

**Key Benefits:**
- Single source of truth eliminates data inconsistencies
- Direct database queries (< 100ms) vs Edge Function round-trips
- Stable frontend API contract via unified view
- RLS provides security-in-depth

---

## 1. Database Layer

### user_roles Table (SSOT)

**Status:** ACTIVE (migrated December 5, 2025)
**Replaces:** `org_users` table (deprecated)

**Schema:**
```sql
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: Super admins have NULL organization_id
  CONSTRAINT super_admin_no_org CHECK (
    (role = 'SUPER_ADMIN' AND organization_id IS NULL) OR
    (role != 'SUPER_ADMIN' AND organization_id IS NOT NULL)
  )
);

-- Role enum
CREATE TYPE app_role AS ENUM (
  'SUPER_ADMIN',   -- Platform-level (organization_id IS NULL)
  'ORG_ADMIN',     -- Organization administrator
  'ASO_MANAGER',   -- ASO operations
  'ANALYST',       -- Data analysis
  'VIEWER',        -- Read-only
  'CLIENT'         -- External client
);
```

**Design Principles:**
- One role per user (simplified model for Phase 1)
- Platform super admins: `organization_id IS NULL`
- Organization-scoped roles: `organization_id NOT NULL`
- Enum normalization: Database uppercase, frontend lowercase

### user_permissions_unified View

**Purpose:** Stable API contract between backend and frontend

**Schema:**
```sql
CREATE VIEW user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,
  ur.role::text AS role,
  'user_roles'::text AS role_source,
  (ur.organization_id IS NULL) AS is_platform_role,
  o.name AS org_name,
  o.slug AS org_slug,
  ur.created_at AS resolved_at,

  -- Role flags (handle both uppercase and lowercase)
  (ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
  (ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,
  (ur.organization_id IS NOT NULL) AS is_org_scoped_role,

  -- Normalized role (lowercase for frontend consistency)
  CASE
    WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
    WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
    WHEN ur.role::text = 'ASO_MANAGER' THEN 'aso_manager'
    WHEN ur.role::text = 'ANALYST' THEN 'analyst'
    WHEN ur.role::text = 'VIEWER' THEN 'viewer'
    WHEN ur.role::text = 'CLIENT' THEN 'client'
    ELSE 'viewer'
  END AS effective_role

FROM user_roles ur
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE ur.role IS NOT NULL;
```

**View Benefits:**
- Single query for all permission data
- Normalized lowercase roles for frontend
- Computed boolean flags (`is_super_admin`, `is_org_admin`)
- Organization metadata (`name`, `slug`) included
- Frontend isolated from table structure changes

### Row-Level Security (RLS) Policies

**Example: org_app_access Table**
```sql
CREATE POLICY "Users can access apps in their organization"
ON org_app_access
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'SUPER_ADMIN'
  )
);
```

**RLS Principles:**
- All organization-scoped tables have RLS policies
- Super admins bypass organization scoping (but not RLS entirely)
- Policies check `user_roles` table for authorization
- Performance: Policies use indexes on `user_id` and `organization_id`

**See:** [db_rls_report.md](../../04-api-reference/db_rls_report.md) for complete RLS policy audit

---

## 2. Frontend Layer

### usePermissions() Hook (PRIMARY)

**Location:** `/src/hooks/usePermissions.ts`

**Status:** ACTIVE (Primary authorization method in V1)

**Implementation:**
```typescript
export const usePermissions = () => {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['userPermissions', user?.id],
    queryFn: async () => {
      // Query unified view
      const { data: allPermissions } = await supabase
        .from('user_permissions_unified')
        .select('*')
        .eq('user_id', user.id);

      // Find primary permission
      const currentOrgPermission = allPermissions.find(p =>
        p.org_id && p.is_org_scoped_role
      );
      const superAdminPermission = allPermissions.find(p =>
        p.is_super_admin && p.is_platform_role
      );
      const primaryPermission = currentOrgPermission ||
                                 superAdminPermission ||
                                 allPermissions[0];

      return {
        userId: user.id,
        organizationId: primaryPermission?.org_id,
        orgName: primaryPermission?.org_name,
        role: primaryPermission?.effective_role,
        isSuperAdmin: primaryPermission?.is_super_admin,
        isOrgAdmin: primaryPermission?.is_org_admin,
        isOrgScoped: primaryPermission?.is_org_scoped_role,
        roleSource: primaryPermission?.role_source,
        effectiveRole: primaryPermission?.effective_role,
        availableOrgs: extractUniqueOrgs(allPermissions),
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  });

  return { permissions, isLoading };
};
```

**Caching:**
- Stale time: 2 minutes (permissions cached for 2 minutes)
- Garbage collection: 30 minutes (data kept in memory for 30 minutes)
- React Query handles automatic refetching and caching

### Usage Examples

#### ✅ CORRECT: Role-Based Page Access

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

function AdminPage() {
  const { permissions, isLoading } = usePermissions();

  // Loading state
  if (isLoading) return <Loading />;

  // Authorization check
  if (!permissions?.isOrgAdmin) {
    return <Navigate to="/no-access" />;
  }

  // Render page for authorized users
  return (
    <div>
      <h1>Admin Panel - {permissions.orgName}</h1>
      <UserManagement organizationId={permissions.organizationId} />
    </div>
  );
}
```

#### ✅ CORRECT: Conditional Feature Rendering

```typescript
function Dashboard() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Show analytics to all roles */}
      <AnalyticsWidget />

      {/* Show user management only to admins */}
      {permissions?.isOrgAdmin && (
        <UserManagementWidget />
      )}

      {/* Show audit logs only to super admins */}
      {permissions?.isSuperAdmin && (
        <AuditLogWidget />
      )}
    </div>
  );
}
```

#### ✅ CORRECT: Super Admin Organization Selection

```typescript
function SuperAdminDashboard() {
  const { permissions } = usePermissions();
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  if (!permissions?.isSuperAdmin) {
    return <Navigate to="/no-access" />;
  }

  // Super admins must select organization before viewing data
  if (!selectedOrgId) {
    return (
      <OrganizationSelector
        organizations={permissions.availableOrgs}
        onSelect={setSelectedOrgId}
      />
    );
  }

  return (
    <Dashboard organizationId={selectedOrgId} />
  );
}
```

#### ❌ WRONG: Using Deprecated authorize Edge Function

```typescript
// DON'T DO THIS!
function AdminPage() {
  const { data: authResult } = useQuery({
    queryKey: ['authorize', '/admin', 'GET'],
    queryFn: async () => {
      const response = await supabase.functions.invoke('authorize', {
        body: { path: '/admin', method: 'GET' }
      });
      return response.data;
    }
  });

  // This pattern is DEPRECATED and slower than usePermissions()
}
```

**Why it's wrong:**
- `authorize` Edge Function adds unnecessary network latency
- `usePermissions()` hook queries database directly (< 100ms)
- Edge Function pattern is deprecated (exists but not actively used)

#### ❌ WRONG: Using profiles Table

```typescript
// DON'T DO THIS!
function UserProfile() {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .single();
      return data;
    }
  });

  // profiles table is DEPRECATED
}
```

**Why it's wrong:**
- `profiles` table is deprecated
- Use `user_roles` table (via `usePermissions()` hook)
- `user_permissions_unified` view provides all needed data

### NoAccess Component

**Location:** `/src/components/NoAccess.tsx`

**Usage:**
```typescript
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

function ProtectedPage() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <Loading />;
  if (!permissions?.isOrgAdmin) return <Navigate to="/no-access" />;

  return <PageContent />;
}
```

**NoAccess Page Features:**
- Clear message: "You don't have permission to access this page"
- Link back to dashboard
- Audit log entry (unauthorized access attempt)

---

## 3. Security Features

### Multi-Factor Authentication (MFA)

**Implementation:** TOTP-based (Time-based One-Time Password)

**Supported Apps:**
- Google Authenticator
- Authy
- 1Password
- Microsoft Authenticator
- Any RFC 6238 compliant app

**Enforcement:**
```sql
CREATE TABLE mfa_enforcement (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL,
  mfa_required BOOLEAN DEFAULT true,
  grace_period_ends_at TIMESTAMPTZ,
  mfa_enabled_at TIMESTAMPTZ,
  last_reminded_at TIMESTAMPTZ
);
```

**Grace Period:**
- Duration: 30 days from account creation (admin users only)
- Reminders: Daily banner on dashboard
- Enforcement: Hard block after expiration
- Applies to: `SUPER_ADMIN` and `ORG_ADMIN` roles only

**Setup Flow:**
1. Admin user logs in without MFA
2. Banner appears: "MFA Required - X days remaining"
3. User clicks "Set Up MFA" → Navigates to `/settings`
4. QR code generated with TOTP secret
5. User scans with authenticator app
6. User enters 6-digit code to verify
7. MFA enabled, grace period cleared
8. Future logins require TOTP code

### Session Security (SOC 2 Compliant)

**Configuration:**
```typescript
// Enabled in production only
if (import.meta.env.PROD) {
  enableSessionSecurity({
    idleTimeout: 15 * 60 * 1000,      // 15 minutes
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
    warningTime: 2 * 60 * 1000,       // 2 minutes before logout
    trackActivities: ['mousemove', 'keydown', 'touchstart', 'scroll']
  });
}
```

**Activity Tracking:**
- Mouse movements
- Keyboard inputs
- Touch events
- Scroll events

**User Experience:**
- Warning modal: 2 minutes before auto-logout
- Session extension: Click "Stay Logged In" to reset idle timer
- Forced logout: After idle or absolute timeout expires
- Audit log entry: Session start/end/timeout recorded

**Timeouts:**
- **Idle Timeout:** 15 minutes of inactivity
- **Absolute Timeout:** 8 hours from login (regardless of activity)

### Audit Logging

**All Critical Actions Logged:**
- User login/logout
- Permission changes
- Role modifications
- Data access (BigQuery queries, sensitive data)
- Failed authorization attempts
- Session timeouts

**Logged via RPC:**
```sql
SELECT log_audit_event(
  p_user_id := auth.uid(),
  p_organization_id := current_org_id,
  p_action := 'view_dashboard_v2',
  p_resource_type := 'bigquery_data',
  p_details := jsonb_build_object(
    'app_count', 5,
    'date_range', jsonb_build_object('start', '2025-01-01', 'end', '2025-01-31'),
    'row_count', 1500
  )
);
```

**Compliance:**
- SOC 2 Type II
- ISO 27001
- GDPR (retention, access logging)

**See:** [ENCRYPTION_STATUS.md](../security-compliance/ENCRYPTION_STATUS.md) for complete compliance documentation

---

## 4. Role Hierarchy and Permissions

### Role Definitions

```
┌──────────────────────────────────────────┐
│         ROLE HIERARCHY                   │
│                                          │
│  1. SUPER_ADMIN (Platform-level)        │ ← Highest privilege
│     └── organization_id IS NULL         │
│                                          │
│  2. ORG_ADMIN (Organization-scoped)     │
│     └── Full org management             │
│                                          │
│  3. ASO_MANAGER (Organization-scoped)   │
│     └── ASO operations only             │
│                                          │
│  4. ANALYST (Organization-scoped)       │
│     └── Data analysis & reporting       │
│                                          │
│  5. VIEWER (Organization-scoped)        │
│     └── Read-only access                │
│                                          │
│  6. CLIENT (Organization-scoped)        │ ← Lowest privilege
│     └── Minimal external access         │
└──────────────────────────────────────────┘
```

### Permission Comparison Matrix

| Feature | SUPER_ADMIN | ORG_ADMIN | ASO_MANAGER | ANALYST | VIEWER | CLIENT |
|---------|-------------|-----------|-------------|---------|--------|--------|
| **Access Scope** | All Orgs | Single Org | Single Org | Single Org | Single Org | Single Org |
| **Manage Apps** | ✅ All | ✅ Own Org | ❌ | ❌ | ❌ | ❌ |
| **Approve Apps** | ✅ All | ✅ Own Org | ❌ | ❌ | ❌ | ❌ |
| **Dashboard V2** | ✅ All | ✅ Full | ✅ Full | ✅ Full | ✅ Read-Only | ✅ Basic |
| **Reviews Management** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **ASO Tools** | ✅ All | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Analytics** | ✅ All | ✅ Full | ✅ Full | ✅ Full | ✅ Read-Only | ✅ Basic |
| **User Management** | ✅ All | ✅ Own Org | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Security Monitoring** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Agency Access** | ✅ All | ✅ Clients | ❌ | ❌ | ❌ | ❌ |

**See:** [ORGANIZATION_ROLES_SYSTEM.md](../system-design/ORGANIZATION_ROLES_SYSTEM.md) for complete role documentation

---

## 5. Migration from Old Patterns

### Deprecated Patterns (DO NOT USE)

#### ❌ authorize Edge Function

**Status:** DEPRECATED (exists but not actively used)
**Location:** `/supabase/functions/authorize/index.ts`

**Why deprecated:**
- Edge Function adds network latency (round-trip delay)
- Direct database query via `usePermissions()` is faster (< 100ms)
- Simpler architecture with fewer moving parts

**Migration:**
```typescript
// OLD (DEPRECATED)
const { data } = await supabase.functions.invoke('authorize', {
  body: { path: '/admin', method: 'GET' }
});
if (!data.allow) return <Navigate to="/no-access" />;

// NEW (V1 CORRECT)
const { permissions } = usePermissions();
if (!permissions?.isOrgAdmin) return <Navigate to="/no-access" />;
```

#### ❌ profiles Table

**Status:** DEPRECATED
**Replaced by:** `user_roles` table

**Why deprecated:**
- Dual system caused data inconsistencies
- `org_users` and `profiles` had conflicting data
- Single source of truth (`user_roles`) eliminates conflicts

**Migration:**
```typescript
// OLD (DEPRECATED)
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id, role')
  .single();

// NEW (V1 CORRECT)
const { permissions } = usePermissions();
// Access permissions.organizationId and permissions.role
```

### Why We Changed

**Problem with Old System:**
1. **Dual Sources of Truth:** Both `profiles` and `org_users` stored role data
2. **Data Inconsistencies:** Updates to one table didn't always sync to the other
3. **Performance:** Edge Function round-trips added 100-200ms latency
4. **Complexity:** Multiple authorization paths confused developers

**V1 Solution:**
1. **Single Source:** `user_roles` table only
2. **Stable API:** `user_permissions_unified` view isolates frontend from schema changes
3. **Fast Queries:** Direct database access via `usePermissions()` hook
4. **Simple:** One authorization pattern for entire application

---

## 6. Code Examples

### ✅ Correct V1 Patterns

#### Example 1: Protected Route

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

function AdminUsersPage() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <LoadingSpinner />;

  // Only ORG_ADMIN and SUPER_ADMIN can manage users
  if (!permissions?.isOrgAdmin) {
    return <Navigate to="/no-access" />;
  }

  return (
    <div>
      <h1>User Management</h1>
      <UserList organizationId={permissions.organizationId} />
    </div>
  );
}
```

#### Example 2: Role-Based UI Elements

```typescript
function DashboardHeader() {
  const { permissions } = usePermissions();

  return (
    <header>
      <h1>Dashboard - {permissions?.orgName}</h1>

      <nav>
        <Link to="/dashboard-v2">Analytics</Link>

        {/* Show admin links only to admins */}
        {permissions?.isOrgAdmin && (
          <>
            <Link to="/admin/users">Users</Link>
            <Link to="/admin/settings">Settings</Link>
          </>
        )}

        {/* Show super admin link only to super admins */}
        {permissions?.isSuperAdmin && (
          <Link to="/super-admin">Platform Admin</Link>
        )}
      </nav>
    </header>
  );
}
```

#### Example 3: Feature Flag Check

```typescript
function AdvancedAnalytics() {
  const { permissions } = usePermissions();

  // ASO_MANAGER and above can access advanced analytics
  const canAccessAdvancedAnalytics =
    permissions?.role && ['super_admin', 'org_admin', 'aso_manager'].includes(permissions.role);

  if (!canAccessAdvancedAnalytics) {
    return (
      <Card>
        <p>Advanced analytics requires ASO Manager access or higher.</p>
        <p>Contact your organization administrator for access.</p>
      </Card>
    );
  }

  return <AdvancedAnalyticsWidget />;
}
```

### ❌ Wrong (Deprecated) Patterns

#### Example 1: Using authorize Edge Function

```typescript
// ❌ DON'T DO THIS
function AdminPage() {
  const { data: authResult } = useQuery({
    queryFn: async () => {
      const response = await supabase.functions.invoke('authorize', {
        body: { path: '/admin', method: 'GET' }
      });
      return response.data;
    }
  });

  if (!authResult?.allow) return <Navigate to="/no-access" />;
  return <AdminPanel />;
}

// ✅ DO THIS INSTEAD
function AdminPage() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <Loading />;
  if (!permissions?.isOrgAdmin) return <Navigate to="/no-access" />;

  return <AdminPanel />;
}
```

#### Example 2: Querying profiles Table

```typescript
// ❌ DON'T DO THIS
function UserRole() {
  const { data: profile } = useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .single();
      return data;
    }
  });

  return <div>Role: {profile?.role}</div>;
}

// ✅ DO THIS INSTEAD
function UserRole() {
  const { permissions } = usePermissions();

  return <div>Role: {permissions?.role}</div>;
}
```

---

## Summary

**V1 Authorization at a Glance:**

1. **SSOT:** `user_roles` table (one role per user)
2. **API Contract:** `user_permissions_unified` view (stable interface)
3. **Frontend:** `usePermissions()` hook (primary authorization method)
4. **Security:** RLS policies + MFA + session timeouts + audit logging
5. **Deprecated:** `authorize` Edge Function, `profiles` table

**For More Information:**
- Complete architecture: [ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md)
- Organization roles: [ORGANIZATION_ROLES_SYSTEM.md](./ORGANIZATION_ROLES_SYSTEM.md)
- Security compliance: [ENCRYPTION_STATUS.md](../security-compliance/ENCRYPTION_STATUS.md)
- API contracts: [docs/04-api-reference/](../../04-api-reference/)

**Quick Reference:**
```typescript
// Import hook
import { usePermissions } from '@/hooks/usePermissions';

// Use in component
const { permissions, isLoading } = usePermissions();

// Check permissions
if (permissions?.isSuperAdmin) { /* super admin only */ }
if (permissions?.isOrgAdmin) { /* org admin or super admin */ }
if (permissions?.role === 'aso_manager') { /* specific role */ }
```

---

**Last Updated:** January 20, 2025
**Canonical Reference:** This document is the authoritative source for V1 authorization patterns
