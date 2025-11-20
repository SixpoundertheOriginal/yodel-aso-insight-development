---
Status: ACTIVE
Version: v2.0
Last Updated: 2025-01-20
Purpose: V1 Production RLS Policy Reference
See Also: docs/02-architecture/ARCHITECTURE_V1.md
See Also: docs/02-architecture/system-design/authorization-v1.md
Audience: Database Administrators, Backend Engineers, Security Auditors
---

# Database & RLS Policy Reference (V1 Production)

## Overview

This document describes the **V1 production Row-Level Security (RLS)** policies implemented in the Yodel ASO Insight platform. All policies use `user_roles` as the single source of truth (SSOT) for access control.

**Security Model:** Role-based access control (RBAC) with agency multi-tenancy support

**Key Principle:** All RLS policies reference `user_roles` table (NOT deprecated `profiles` or `org_users` tables)

---

## Table of Contents

1. [Core Tables](#core-tables)
2. [RLS Policy Patterns](#rls-policy-patterns)
3. [Production RLS Policies](#production-rls-policies)
4. [Agency Multi-Tenant Support](#agency-multi-tenant-support)
5. [Policy Testing](#policy-testing)
6. [Security Best Practices](#security-best-practices)

---

## Core Tables

### Table: `organizations`

**Purpose:** Organization master data

**Schema:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `settings.demo_mode` (boolean) - Server truth for demo organization detection
- `slug` - Unique organization identifier (e.g., 'yodel-mobile', 'next')

**RLS:** Enabled (policies omitted for brevity - refer to migration files)

---

### Table: `user_roles`

**Purpose:** User role assignments (SINGLE SOURCE OF TRUTH)

**Schema:**
```sql
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'SUPER_ADMIN',
    'ORG_ADMIN',
    'ASO_MANAGER',
    'ANALYST',
    'VIEWER',
    'CLIENT'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);
```

**Key Constraints:**
- `SUPER_ADMIN` MUST have `organization_id = NULL` for platform-level access
- Org-level admins MUST have `organization_id` set

**RLS:** Enabled (policies omitted - refer to migrations)

**Role Hierarchy:**
1. `SUPER_ADMIN` (platform-level) - organization_id IS NULL
2. `ORG_ADMIN` (org-level)
3. `ASO_MANAGER` (org-level)
4. `ANALYST` (org-level)
5. `VIEWER` (org-level)
6. `CLIENT` (org-level)

---

### Table: `org_app_access`

**Purpose:** App access control (which apps each organization can access)

**Schema:**
```sql
CREATE TABLE org_app_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  attached_at TIMESTAMPTZ DEFAULT NOW(),
  detached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `organization_id` - Organization that has access to the app
- `app_id` - Application identifier (BigQuery app_id)
- `detached_at` - NULL = active access, NOT NULL = revoked access

**RLS:** 4 policies (SELECT, INSERT, UPDATE, DELETE) - See [Production RLS Policies](#production-rls-policies)

**Migration History:**
- Fixed: 2025-11-08 (Migration 20251108100000) - Nuclear Option
  - Dropped ALL old policies dynamically
  - Created 4 standardized policies using `user_roles` (SSOT)
  - Added agency-aware access control

---

### Table: `agency_clients`

**Purpose:** Agency relationship tracking (agency → client organizations)

**Schema:**
```sql
CREATE TABLE agency_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_org_id, client_org_id)
);
```

**Key Fields:**
- `agency_org_id` - Agency organization (e.g., Yodel Mobile)
- `client_org_id` - Client organization managed by agency
- `is_active` - TRUE = relationship active, FALSE = relationship ended

**RLS:** 4 policies (SELECT, INSERT, UPDATE, DELETE) - Similar pattern to `org_app_access`

**Use Case:** Yodel Mobile (agency) manages apps for Client 1, Client 2, Client 3

---

### Table: `audit_logs`

**Purpose:** SOC 2 compliant audit trail (7-year retention)

**Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  status TEXT CHECK (status IN ('success', 'failure', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Logged Actions:**
- `login`, `logout`, `session_timeout`
- `mfa_enabled`, `mfa_verified`
- `view_dashboard_v2`, `bigquery_query`, `export_data`

**RLS:** Read-only access for admins (policies omitted for brevity)

**Compliance:** SOC 2 Type II, ISO 27001, GDPR

---

### Table: `mfa_enforcement`

**Purpose:** MFA enrollment tracking and grace period management

**Schema:**
```sql
CREATE TABLE mfa_enforcement (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  grace_period_ends_at TIMESTAMPTZ,
  mfa_enabled_at TIMESTAMPTZ,
  last_reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `grace_period_ends_at` - End of 30-day grace period
- `mfa_enabled_at` - When user completed MFA setup
- `last_reminded_at` - Last MFA reminder notification

**RLS:** Self-service (users can read/update their own record)

**Grace Period:** 30 days for admin users (SUPER_ADMIN, ORG_ADMIN)

---

### Table: `encryption_keys`

**Purpose:** Encryption key management for sensitive data

**Schema:**
```sql
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_name TEXT UNIQUE NOT NULL,
  encrypted_key TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ
);
```

**RLS:** Super admin only (highly restricted)

**Use Case:** Encrypt sensitive configuration (API keys, credentials)

---

## RLS Policy Patterns

### Pattern 1: User in Organization

**Use Case:** User can access data for organizations they belong to

**Pattern:**
```sql
WHERE organization_id IN (
  SELECT organization_id
  FROM user_roles
  WHERE user_id = auth.uid()
)
```

**Example Tables:** `org_app_access`, `agency_clients`, most org-scoped tables

---

### Pattern 2: Agency Access to Client Organizations

**Use Case:** Agency users can access data for their managed client organizations

**Pattern:**
```sql
WHERE organization_id IN (
  SELECT client_org_id
  FROM agency_clients
  WHERE agency_org_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
  AND is_active = true
)
```

**Example Tables:** `org_app_access` (agency users can see client apps)

---

### Pattern 3: Super Admin Bypass

**Use Case:** Platform super admins have global access

**Pattern:**
```sql
WHERE EXISTS (
  SELECT 1
  FROM user_roles
  WHERE user_id = auth.uid()
    AND role = 'SUPER_ADMIN'
    AND organization_id IS NULL
)
```

**Critical:** `organization_id IS NULL` ensures this is a platform-level admin, not org-level admin

---

### Pattern 4: Admin-Only Operations

**Use Case:** Only org admins (and super admins) can perform write operations

**Pattern:**
```sql
WHERE EXISTS (
  SELECT 1
  FROM user_roles
  WHERE user_id = auth.uid()
    AND organization_id = <target_org_id>
    AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
)
```

**Example Operations:** INSERT, UPDATE, DELETE on `org_app_access`

---

## Production RLS Policies

### Table: `org_app_access` (4 Policies)

#### Policy 1: `users_read_app_access` (SELECT)

**Purpose:** Users can read app access for their organizations

**Created:** 2025-11-08 (Migration 20251108100000)

**SQL:**
```sql
CREATE POLICY "users_read_app_access"
  ON org_app_access
  FOR SELECT
  USING (
    -- User is in this organization
    organization_id IN (
      SELECT organization_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR
    -- User's organization is an agency managing this client organization
    organization_id IN (
      SELECT client_org_id
      FROM agency_clients
      WHERE agency_org_id IN (
        SELECT organization_id
        FROM user_roles
        WHERE user_id = auth.uid()
      )
      AND is_active = true
    )
    OR
    -- User is a platform super admin (can see all)
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );
```

**Permissions:**
- ✅ Users can see apps attached to their organization
- ✅ Agency users can see apps attached to their client organizations
- ✅ Super admins can see all apps globally

**Test Query:**
```sql
-- As agency user, should see apps from own org + client orgs
SELECT COUNT(*) FROM org_app_access WHERE detached_at IS NULL;
```

---

#### Policy 2: `admins_attach_apps` (INSERT)

**Purpose:** Admins can attach apps to their organizations

**Created:** 2025-11-08 (Migration 20251108100000)

**SQL:**
```sql
CREATE POLICY "admins_attach_apps"
  ON org_app_access
  FOR INSERT
  WITH CHECK (
    -- User is org admin for this organization
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND organization_id = org_app_access.organization_id
        AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
    OR
    -- User is agency admin and this is a managed client
    EXISTS (
      SELECT 1
      FROM agency_clients ac
      INNER JOIN user_roles ur ON ur.organization_id = ac.agency_org_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
        AND ac.client_org_id = org_app_access.organization_id
        AND ac.is_active = true
    )
    OR
    -- User is platform super admin
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'SUPER_ADMIN'
        AND organization_id IS NULL
    )
  );
```

**Permissions:**
- ✅ Org admins can attach apps to their own organization
- ✅ Agency admins can attach apps to managed client organizations
- ✅ Super admins can attach apps to any organization
- ❌ Regular users (ANALYST, VIEWER) cannot attach apps

**Test Query:**
```sql
-- As org admin, insert should succeed
INSERT INTO org_app_access (organization_id, app_id)
VALUES ('my-org-id', 'NewApp');
```

---

#### Policy 3: `admins_update_app_access` (UPDATE)

**Purpose:** Admins can update app access (e.g., detach apps)

**Created:** 2025-11-08 (Migration 20251108100000)

**SQL:**
```sql
CREATE POLICY "admins_update_app_access"
  ON org_app_access
  FOR UPDATE
  USING (
    -- Same USING clause as INSERT policy
    -- (User must be admin to select row for update)
    ...
  )
  WITH CHECK (
    -- Same WITH CHECK clause as INSERT policy
    -- (Ensures updated values also pass check)
    ...
  );
```

**Permissions:** Same as INSERT policy (admins only)

**Common Use Case:**
```sql
-- Detach app (soft delete)
UPDATE org_app_access
SET detached_at = NOW()
WHERE organization_id = 'my-org-id' AND app_id = 'OldApp';
```

---

#### Policy 4: `admins_delete_app_access` (DELETE)

**Purpose:** Admins can permanently delete app access records

**Created:** 2025-11-08 (Migration 20251108100000)

**SQL:**
```sql
CREATE POLICY "admins_delete_app_access"
  ON org_app_access
  FOR DELETE
  USING (
    -- Same USING clause as INSERT/UPDATE policies
    -- (User must be admin to delete)
    ...
  );
```

**Permissions:** Same as INSERT/UPDATE policies (admins only)

**⚠️ Warning:** Prefer soft delete (set `detached_at`) over hard delete (DELETE) for audit trail

---

## Agency Multi-Tenant Support

### Architecture

```
Agency Organization (Yodel Mobile)
├── Organization ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
├── Direct Apps: 0 (agency doesn't own apps)
├── Managed Clients: 3
│   ├── Client 1 (dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f)
│   │   └── Apps: 23 apps
│   ├── Client 2 (550e8400-e29b-41d4-a716-446655440002)
│   │   └── Apps: 5 apps
│   └── Client 3 (f47ac10b-...)
│       └── Apps: 2 apps
└── Total Accessible Apps: 30 (23 + 5 + 2)
```

### Agency User Access Flow

**Step 1:** User logs in (cli@yodelmobile.com)

**Step 2:** System checks `user_roles` table
```sql
SELECT role, organization_id
FROM user_roles
WHERE user_id = 'user-uuid';

-- Result:
-- role: ORG_ADMIN
-- organization_id: 7cccba3f-... (Yodel Mobile)
```

**Step 3:** RLS policy checks `agency_clients` table
```sql
SELECT client_org_id
FROM agency_clients
WHERE agency_org_id = '7cccba3f-...'
  AND is_active = true;

-- Result:
-- client_org_id: dbdb0cc5-... (Client 1)
-- client_org_id: 550e8400-... (Client 2)
-- client_org_id: f47ac10b-... (Client 3)
```

**Step 4:** RLS policy allows access to:
- Apps from Yodel Mobile organization (0 apps)
- Apps from Client 1 (23 apps)
- Apps from Client 2 (5 apps)
- Apps from Client 3 (2 apps)
- **Total: 30 apps**

**Step 5:** Dashboard V2 displays all 30 apps in app picker

---

## Policy Testing

### Test 1: User in Organization (Basic Access)

**Setup:**
```sql
-- Create test user and assign to organization
INSERT INTO user_roles (user_id, organization_id, role)
VALUES ('test-user-id', 'test-org-id', 'ANALYST');
```

**Test Query:**
```sql
-- Should return apps for test-org-id only
SET ROLE TO 'test-user-id'; -- (Simulate auth.uid())
SELECT COUNT(*) FROM org_app_access WHERE organization_id = 'test-org-id';
```

**Expected:** Returns apps for `test-org-id`, none for other organizations

---

### Test 2: Agency Access to Client Apps

**Setup:**
```sql
-- Create agency relationship
INSERT INTO agency_clients (agency_org_id, client_org_id, is_active)
VALUES ('agency-id', 'client-id', true);

-- Assign user to agency
INSERT INTO user_roles (user_id, organization_id, role)
VALUES ('agency-user-id', 'agency-id', 'ORG_ADMIN');
```

**Test Query:**
```sql
-- Should return apps for agency + client orgs
SET ROLE TO 'agency-user-id';
SELECT organization_id, COUNT(*) FROM org_app_access
WHERE detached_at IS NULL
GROUP BY organization_id;
```

**Expected:** Returns apps from both `agency-id` AND `client-id`

---

### Test 3: Super Admin Global Access

**Setup:**
```sql
-- Create super admin (organization_id IS NULL)
INSERT INTO user_roles (user_id, organization_id, role)
VALUES ('super-admin-id', NULL, 'SUPER_ADMIN');
```

**Test Query:**
```sql
-- Should return ALL apps across ALL organizations
SET ROLE TO 'super-admin-id';
SELECT COUNT(*) FROM org_app_access;
```

**Expected:** Returns all apps globally (no filtering)

---

### Test 4: Non-Admin Cannot Attach Apps

**Setup:**
```sql
-- Create analyst user (no admin role)
INSERT INTO user_roles (user_id, organization_id, role)
VALUES ('analyst-id', 'test-org-id', 'ANALYST');
```

**Test Query:**
```sql
-- Should FAIL with RLS policy violation
SET ROLE TO 'analyst-id';
INSERT INTO org_app_access (organization_id, app_id)
VALUES ('test-org-id', 'NewApp');
```

**Expected:** Error: `new row violates row-level security policy` (RLS blocks INSERT)

---

## Security Best Practices

### 1. Always Use `user_roles` as SSOT

**✅ Correct:**
```sql
WHERE organization_id IN (
  SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
)
```

**❌ NEVER Use Deprecated Tables:**
```sql
-- NEVER reference these tables
WHERE organization_id IN (
  SELECT organization_id FROM profiles WHERE id = auth.uid()
)
-- profiles table is DEPRECATED, use user_roles instead
```

---

### 2. Super Admin Check MUST Verify `organization_id IS NULL`

**✅ Correct:**
```sql
WHERE EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
    AND role = 'SUPER_ADMIN'
    AND organization_id IS NULL  -- ← CRITICAL
)
```

**❌ Incorrect:**
```sql
-- WRONG: This allows org-level SUPER_ADMIN to bypass RLS
WHERE EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  -- Missing: AND organization_id IS NULL
)
```

---

### 3. Use Soft Deletes for Audit Trail

**✅ Recommended:**
```sql
-- Soft delete (preserves audit trail)
UPDATE org_app_access
SET detached_at = NOW()
WHERE organization_id = 'org-id' AND app_id = 'app-id';
```

**❌ Avoid:**
```sql
-- Hard delete (loses audit trail)
DELETE FROM org_app_access
WHERE organization_id = 'org-id' AND app_id = 'app-id';
```

---

### 4. Test RLS Policies Before Deployment

**Required Tests:**
1. User can access own organization data ✅
2. User cannot access other organization data ❌
3. Agency user can access client organization data ✅
4. Super admin can access all data ✅
5. Non-admin cannot write data ❌

**Test Framework:**
```bash
# Run RLS tests in migration validation
psql -f supabase/migrations/20251108100000_fix_org_app_access_rls.sql
# Check validation tests in migration output
```

---

### 5. Monitor RLS Policy Performance

**Performance Concerns:**
- Nested subqueries can be slow for large datasets
- `EXISTS` is faster than `IN` for subqueries
- Add indexes on `user_roles(user_id, organization_id)`

**Monitoring:**
```sql
-- Check slow queries with RLS
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%org_app_access%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Related Documentation

- **V1 Architecture:** [docs/02-architecture/ARCHITECTURE_V1.md](../../02-architecture/ARCHITECTURE_V1.md)
- **Authorization Guide:** [docs/02-architecture/system-design/authorization-v1.md](../../02-architecture/system-design/authorization-v1.md)
- **Migration Files:** supabase/migrations/20251108100000_fix_org_app_access_rls.sql
- **Database Schema:** [docs/02-architecture/database/schema-reference.md](../../02-architecture/database/schema-reference.md)

---

**Document Version:** 2.0
**Last Updated:** January 20, 2025
**Maintained By:** Database Administration Team, Security Team
