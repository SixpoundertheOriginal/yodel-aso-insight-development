---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Database migration history and best practices
Audience: Developers, Database Administrators
---

# Database Migrations

Guide to database migrations for Yodel ASO Insight, including migration history, best practices, and rollback procedures.

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Migration Tools](#migration-tools)
3. [Critical Migrations](#critical-migrations)
4. [Migration Best Practices](#migration-best-practices)
5. [Rollback Procedures](#rollback-procedures)
6. [Common Migration Patterns](#common-migration-patterns)

---

## Migration Overview

**Platform:** Supabase (PostgreSQL 15+)
**Migration Strategy:** Forward-only migrations with rollback scripts
**Tracking:** Supabase `supabase_migrations.schema_migrations` table

### Migration Lifecycle

```
1. Development:
   Write migration → Test locally → Review

2. Staging:
   Deploy to staging → Run migrations → Test application

3. Production:
   Backup database → Deploy migration → Verify → Monitor

4. Rollback (if needed):
   Execute rollback script → Restore from backup (last resort)
```

---

## Migration Tools

### Supabase CLI

**Installation:**
```bash
npm install -g supabase
```

**Common Commands:**
```bash
# Create new migration
supabase migration new migration_name

# List migrations
supabase migration list

# Apply migrations locally
supabase db reset

# Push migrations to remote
supabase db push
```

### Manual Migrations (Production)

For production, migrations are typically applied through Supabase Dashboard or SQL Editor.

**Locations:**
- Dashboard: Project → Database → Migrations
- SQL Editor: Direct SQL execution with manual tracking

---

## Critical Migrations

### 1. Organizations Table (Foundation)

**Date:** 2024-09-01
**Purpose:** Create multi-tenant registry
**Status:** ✅ Applied to Production

```sql
-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('demo', 'standard', 'enterprise')),
  max_apps INTEGER DEFAULT 50,
  settings JSONB DEFAULT '{}',
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);
CREATE INDEX idx_organizations_tier ON organizations(tier);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_read_own_org"
ON organizations FOR SELECT
USING (
  id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  OR (SELECT sec.is_super_admin())
);
```

**Rollback:**
```sql
DROP TABLE IF EXISTS organizations CASCADE;
```

---

### 2. User Roles Table (Authorization SSOT)

**Date:** 2024-09-05
**Purpose:** Establish Single Source of Truth for authorization
**Status:** ✅ Applied to Production

```sql
-- Create app_role enum
CREATE TYPE app_role AS ENUM (
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'ASO_MANAGER',
  'ANALYST',
  'VIEWER',
  'CLIENT'
);

-- Create user_roles table
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_read_own_roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "super_admins_read_all_roles"
ON user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
  )
);
```

**Rollback:**
```sql
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;
```

---

### 3. Organization App Access (BigQuery Scoping)

**Date:** 2024-09-10
**Purpose:** Map organizations to BigQuery app IDs
**Status:** ✅ Applied to Production

```sql
CREATE TABLE org_app_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  attached_at TIMESTAMPTZ DEFAULT NOW(),
  detached_at TIMESTAMPTZ,
  UNIQUE(organization_id, app_id)
);

-- Indexes
CREATE INDEX idx_org_app_access_org ON org_app_access(organization_id);
CREATE INDEX idx_org_app_access_app ON org_app_access(app_id);
CREATE INDEX idx_org_app_access_active ON org_app_access(organization_id, app_id)
  WHERE detached_at IS NULL;

-- Enable RLS
ALTER TABLE org_app_access ENABLE ROW LEVEL SECURITY;

-- RLS Policy (basic, later enhanced with agency support)
CREATE POLICY "users_read_app_access"
ON org_app_access FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR (SELECT sec.is_super_admin())
);
```

**Rollback:**
```sql
DROP TABLE IF EXISTS org_app_access CASCADE;
```

---

### 4. Agency Clients Table (Multi-Tenant Cross-Access)

**Date:** 2024-10-01
**Purpose:** Enable agency → client relationships
**Status:** ✅ Applied to Production

```sql
CREATE TABLE agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(agency_org_id, client_org_id)
);

-- Indexes
CREATE INDEX idx_agency_clients_agency ON agency_clients(agency_org_id);
CREATE INDEX idx_agency_clients_client ON agency_clients(client_org_id);
CREATE INDEX idx_agency_clients_active ON agency_clients(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_read_agency_relationships"
ON agency_clients FOR SELECT
USING (
  agency_org_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR (SELECT sec.is_super_admin())
);
```

**Rollback:**
```sql
DROP TABLE IF EXISTS agency_clients CASCADE;
```

---

### 5. Enhanced RLS Policy for org_app_access (Agency Support)

**Date:** 2024-10-05
**Purpose:** Allow agency admins to access client apps
**Status:** ✅ Applied to Production

```sql
-- Drop old policy
DROP POLICY IF EXISTS "users_read_app_access" ON org_app_access;

-- Create enhanced policy with agency support
CREATE POLICY "users_read_app_access"
ON org_app_access FOR SELECT
USING (
  -- User is in this organization
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR
  -- User's organization is an agency managing this client organization
  organization_id IN (
    SELECT client_org_id FROM agency_clients
    WHERE agency_org_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
    AND is_active = true
  )
  OR
  -- User is a platform super admin
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
  )
);
```

**Rollback:**
```sql
-- Restore basic policy
DROP POLICY IF EXISTS "users_read_app_access" ON org_app_access;

CREATE POLICY "users_read_app_access"
ON org_app_access FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR (SELECT sec.is_super_admin())
);
```

---

### 6. Audit Logs Table (SOC 2 Compliance)

**Date:** 2024-11-01
**Purpose:** Immutable audit trail for compliance
**Status:** ✅ Applied to Production

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  status TEXT CHECK (status IN ('success', 'failure', 'denied')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (super admin and org admin only)
CREATE POLICY "super_admins_read_all_logs"
ON audit_logs FOR SELECT
USING ((SELECT sec.is_super_admin()));

CREATE POLICY "org_admins_read_org_logs"
ON audit_logs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
);

-- Audit logging function
CREATE FUNCTION log_audit_event(
  p_user_id UUID,
  p_organization_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, organization_id, user_email, action,
    resource_type, resource_id, details,
    ip_address, user_agent, request_path,
    status, error_message
  ) VALUES (
    p_user_id, p_organization_id, p_user_email, p_action,
    p_resource_type, p_resource_id, p_details,
    p_ip_address::inet, p_user_agent, p_request_path,
    p_status, p_error_message
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Rollback:**
```sql
DROP FUNCTION IF EXISTS log_audit_event CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
```

---

### 7. MFA Enforcement Table

**Date:** 2024-11-15
**Purpose:** Track MFA enrollment for admin users
**Status:** ✅ Applied to Production

```sql
CREATE TABLE mfa_enforcement (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  mfa_required BOOLEAN DEFAULT true,
  grace_period_ends_at TIMESTAMPTZ,
  mfa_enabled_at TIMESTAMPTZ,
  last_reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for grace period queries
CREATE INDEX idx_mfa_enforcement_grace ON mfa_enforcement(grace_period_ends_at)
  WHERE mfa_enabled_at IS NULL AND grace_period_ends_at IS NOT NULL;

-- Enable RLS
ALTER TABLE mfa_enforcement ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_read_own_mfa"
ON mfa_enforcement FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "super_admins_read_all_mfa"
ON mfa_enforcement FOR SELECT
USING ((SELECT sec.is_super_admin()));
```

**Rollback:**
```sql
DROP TABLE IF EXISTS mfa_enforcement CASCADE;
```

---

### 8. User Permissions Unified View

**Date:** 2024-11-20
**Purpose:** Efficient single-query permission lookup
**Status:** ✅ Applied to Production

```sql
CREATE VIEW user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,
  ur.role,
  o.name AS org_name,
  o.slug AS org_slug,
  o.tier AS org_tier,
  (ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
  (ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,
  (ur.organization_id IS NULL) AS is_platform_role
FROM user_roles ur
LEFT JOIN organizations o ON o.id = ur.organization_id;
```

**Rollback:**
```sql
DROP VIEW IF EXISTS user_permissions_unified CASCADE;
```

---

### 9. Database Security Functions

**Date:** 2024-11-25
**Purpose:** Helper functions for RLS and authorization
**Status:** ✅ Applied to Production

```sql
-- Super admin check function
CREATE FUNCTION sec.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('SUPER_ADMIN', 'super_admin')
      AND organization_id IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Organization access check function
CREATE FUNCTION can_access_organization(
  target_org_id UUID,
  check_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := FALSE;
BEGIN
  -- Platform super admin
  SELECT TRUE INTO has_access
  FROM user_permissions_unified
  WHERE user_id = check_user_id
    AND is_super_admin = true
    AND is_platform_role = true
  LIMIT 1;

  IF has_access THEN RETURN TRUE; END IF;

  -- Direct organization membership
  SELECT TRUE INTO has_access
  FROM user_permissions_unified
  WHERE user_id = check_user_id
    AND org_id = target_org_id
  LIMIT 1;

  IF has_access THEN RETURN TRUE; END IF;

  -- Agency relationship access
  SELECT TRUE INTO has_access
  FROM user_permissions_unified up
  JOIN agency_clients ac ON ac.agency_org_id = up.org_id
  WHERE up.user_id = check_user_id
    AND ac.client_org_id = target_org_id
    AND ac.is_active = true
    AND up.is_org_admin = true
  LIMIT 1;

  RETURN COALESCE(has_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Rollback:**
```sql
DROP FUNCTION IF EXISTS can_access_organization CASCADE;
DROP FUNCTION IF EXISTS sec.is_super_admin CASCADE;
```

---

### 10. Critical Fix: Remove Demo Apps from org_app_access

**Date:** 2024-11-27
**Purpose:** Remove demo app IDs that were incorrectly added to production organizations
**Status:** ✅ Applied to Production
**Impact:** HIGH - Fixes Dashboard V2 data confusion

```sql
-- Remove demo apps from all organizations
DELETE FROM org_app_access
WHERE app_id IN (
  'Demo App 1',
  'Demo App 2',
  'Demo App 3',
  'Test App',
  'Sample App'
);

-- Verify cleanup
SELECT COUNT(*) FROM org_app_access WHERE app_id LIKE 'Demo%' OR app_id LIKE 'Test%';
-- Expected: 0
```

**Rollback:** N/A (do not restore demo apps to production)

**Verification:**
```sql
-- Verify only production apps remain
SELECT DISTINCT app_id FROM org_app_access ORDER BY app_id;
```

---

## Migration Best Practices

### DO

✅ **Always backup before migration**
```bash
# Supabase Dashboard: Database → Backups → Create Backup
# Or use pg_dump for manual backup
```

✅ **Test migrations locally first**
```bash
supabase db reset  # Apply all migrations to local DB
npm run dev        # Test application
```

✅ **Write idempotent migrations**
```sql
-- Good: Can run multiple times safely
CREATE TABLE IF NOT EXISTS organizations (...);

-- Good: Check before dropping
DROP POLICY IF EXISTS "old_policy_name" ON table_name;
```

✅ **Use transactions for atomic changes**
```sql
BEGIN;
  -- Multiple related changes
  ALTER TABLE table1 ADD COLUMN new_col TEXT;
  UPDATE table2 SET col = 'value' WHERE condition;
  CREATE INDEX idx_name ON table1(new_col);
COMMIT;
```

✅ **Include rollback scripts**
```sql
-- migration_up.sql
CREATE TABLE new_table (...);

-- migration_down.sql (rollback)
DROP TABLE IF EXISTS new_table CASCADE;
```

✅ **Verify migration success**
```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'new_table'
);

-- Check data integrity
SELECT COUNT(*) FROM new_table;
```

### DON'T

❌ **Don't skip testing**
- Always test on staging before production

❌ **Don't modify existing migrations**
- Create new migrations to fix issues

❌ **Don't delete data without backup**
- Always backup before destructive operations

❌ **Don't ignore RLS policies**
- Enable RLS on all tenant-scoped tables

❌ **Don't use cursors unless necessary**
- Prefer set-based operations

---

## Rollback Procedures

### Automatic Rollback (Recent Migration)

**Within 24 hours of migration:**

1. **Restore from automatic backup:**
   ```
   Supabase Dashboard → Database → Backups → Restore
   ```

2. **Verify rollback:**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC
   LIMIT 5;
   ```

### Manual Rollback (Older Migration)

**For migrations older than 24 hours:**

1. **Review rollback script:**
   ```sql
   -- Check migration_down.sql
   cat supabase/migrations/YYYYMMDDHHMMSS_migration_name_down.sql
   ```

2. **Execute rollback in transaction:**
   ```sql
   BEGIN;
     -- Execute rollback script
     \i supabase/migrations/YYYYMMDDHHMMSS_migration_name_down.sql
   COMMIT;
   ```

3. **Verify application:**
   ```bash
   npm run dev
   # Test critical flows
   ```

### Emergency Rollback

**For critical production issues:**

1. **Immediate:** Restore from latest backup (< 5 min data loss)
2. **Medium-term:** Execute rollback script
3. **Long-term:** Write forward-fix migration

---

## Common Migration Patterns

### Add Column with Default

```sql
-- Add column (safe, doesn't lock table)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS new_feature_enabled BOOLEAN DEFAULT false;

-- Create index (if needed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_new_feature
ON organizations(new_feature_enabled)
WHERE new_feature_enabled = true;
```

### Rename Column

```sql
-- Step 1: Add new column
ALTER TABLE table_name ADD COLUMN new_name TEXT;

-- Step 2: Copy data
UPDATE table_name SET new_name = old_name;

-- Step 3: Update application to use new_name

-- Step 4: Drop old column (separate migration)
ALTER TABLE table_name DROP COLUMN old_name;
```

### Add RLS Policy

```sql
-- Enable RLS if not already enabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Add new policy
CREATE POLICY "policy_name"
ON table_name FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR (SELECT sec.is_super_admin())
);
```

### Add Foreign Key

```sql
-- Add column
ALTER TABLE child_table
ADD COLUMN parent_id UUID;

-- Populate existing rows (if needed)
UPDATE child_table SET parent_id = (/* logic */);

-- Add foreign key constraint
ALTER TABLE child_table
ADD CONSTRAINT fk_parent
FOREIGN KEY (parent_id)
REFERENCES parent_table(id)
ON DELETE CASCADE;

-- Create index for FK (important for performance)
CREATE INDEX idx_child_table_parent ON child_table(parent_id);
```

---

## Related Documentation

- **[Schema Reference](./schema-reference.md)** - Complete table schemas
- **[ERD Diagrams](./erd-diagrams.md)** - Database relationships
- **[ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md)** - V1 production architecture

---

**Support:** For migration assistance, see [ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md) or contact database team.
