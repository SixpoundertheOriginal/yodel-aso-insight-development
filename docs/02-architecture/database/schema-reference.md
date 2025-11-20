---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Complete database schema reference for all production tables
Audience: Developers, Database Administrators
Canonical: true
---

# Database Schema Reference

Complete schema reference for all production tables in Yodel ASO Insight.

## Table of Contents

1. [Core Tables](#core-tables)
   - [organizations](#1-organizations)
   - [user_roles](#2-user_roles)
   - [org_app_access](#3-org_app_access)
   - [agency_clients](#4-agency_clients)
   - [audit_logs](#5-audit_logs)
   - [mfa_enforcement](#6-mfa_enforcement)
   - [encryption_keys](#7-encryption_keys)
2. [Views](#views)
   - [user_permissions_unified](#user_permissions_unified)
3. [Functions](#database-functions)
   - [sec.is_super_admin()](#secis_super_admin)
   - [can_access_organization()](#can_access_organization)
   - [log_audit_event()](#log_audit_event)
4. [Enums](#enums)
5. [Indexes](#indexes)

---

## Core Tables

### 1. `organizations`

**Purpose:** Central registry for all tenants in the system

**Status:** PRODUCTION
**RLS:** Enabled
**Compliance:** Multi-tenant isolation

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,

  -- Enterprise fields
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('demo', 'standard', 'enterprise')),
  max_apps INTEGER DEFAULT 50,
  settings JSONB DEFAULT '{}',

  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);
```

**Indexes:**
```sql
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);
CREATE INDEX idx_organizations_tier ON organizations(tier);
```

**Organization Tiers:**

| Tier | Purpose | Max Apps | Use Case |
|------|---------|----------|----------|
| `enterprise` | Production organizations | 1000+ | Yodel Mobile (agency) |
| `standard` | Regular clients | 50 | Typical client organizations |
| `demo` | Testing/trials | 5-10 | Demo orgs, POCs |

**Known Production Organizations:**

| ID | Name | Slug | Tier | Apps |
|----|------|------|------|------|
| `7cccba3f-0a8f-446f-9dba-86e9cb68c92b` | Yodel Mobile | yodel-mobile | enterprise | 30 (via clients) |
| `550e8400-e29b-41d4-a716-446655440002` | Demo Analytics | demo-analytics | demo | 10 |
| `11111111-1111-1111-1111-111111111111` | Next | next | demo | 5 |

**Settings JSONB Schema:**

```json
{
  "demo_mode": false,
  "bigquery_enabled": true,
  "features": ["analytics", "reporting"],
  "branding": {
    "logo_url": "https://...",
    "primary_color": "#1a73e8"
  },
  "integrations": {
    "slack_webhook": "https://hooks.slack.com/..."
  }
}
```

**Common Queries:**

```sql
-- Get organization by slug
SELECT * FROM organizations WHERE slug = 'yodel-mobile';

-- Get all active organizations
SELECT id, name, slug, tier FROM organizations
WHERE is_active = true
ORDER BY name;

-- Get enterprise organizations
SELECT * FROM organizations
WHERE tier = 'enterprise'
ORDER BY created_at DESC;
```

---

### 2. `user_roles`

**Purpose:** Single Source of Truth (SSOT) for user authorization

**Status:** PRODUCTION (PRIMARY authorization table)
**RLS:** Enabled
**Compliance:** Authorization SSOT

```sql
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

**RLS Policies:**

```sql
-- Users see their own roles
CREATE POLICY "users_read_own_roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Super admins see all roles
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

**Role Hierarchy:**

| Role | Level | Capabilities |
|------|-------|--------------|
| `SUPER_ADMIN` | 6 | Platform-wide access, all features |
| `ORG_ADMIN` | 5 | Manage organization, users, apps |
| `ASO_MANAGER` | 4 | Full analytics, limited admin |
| `ANALYST` | 3 | View analytics, export reports |
| `VIEWER` | 2 | Read-only dashboard access |
| `CLIENT` | 1 | Limited client portal access |

**Usage Patterns:**

```sql
-- Get user's role
SELECT role FROM user_roles WHERE user_id = auth.uid();

-- Check if user is org admin
SELECT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
    AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')
);

-- Get all users in organization
SELECT ur.user_id, u.email, ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.organization_id = 'org-uuid'
ORDER BY ur.role DESC;
```

---

### 3. `org_app_access`

**Purpose:** Maps organizations to BigQuery app IDs for data access control

**Status:** PRODUCTION
**RLS:** Enabled (with agency support)
**Usage:** Dashboard V2 data scoping

```sql
CREATE TABLE org_app_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  attached_at TIMESTAMPTZ DEFAULT NOW(),
  detached_at TIMESTAMPTZ,

  UNIQUE(organization_id, app_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_org_app_access_org ON org_app_access(organization_id);
CREATE INDEX idx_org_app_access_app ON org_app_access(app_id);
CREATE INDEX idx_org_app_access_active ON org_app_access(organization_id, app_id)
  WHERE detached_at IS NULL;
```

**Critical Fix (November 2025):**
- Demo app IDs removed from `org_app_access`
- Only real production apps remain
- Prevents data confusion in Dashboard V2

**RLS Policy (with Agency Support):**

```sql
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

**Usage Patterns:**

```sql
-- Get all apps for organization
SELECT app_id FROM org_app_access
WHERE organization_id = 'org-uuid'
  AND detached_at IS NULL;

-- Attach app to organization
INSERT INTO org_app_access (organization_id, app_id)
VALUES ('org-uuid', 'Mixbook');

-- Detach app (soft delete)
UPDATE org_app_access
SET detached_at = NOW()
WHERE organization_id = 'org-uuid'
  AND app_id = 'Mixbook';
```

---

### 4. `agency_clients`

**Purpose:** Agency → Client relationships for cross-tenant access

**Status:** PRODUCTION
**RLS:** Enabled
**Usage:** Multi-tenant agency model

```sql
CREATE TABLE agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  UNIQUE(agency_org_id, client_org_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_agency_clients_agency ON agency_clients(agency_org_id);
CREATE INDEX idx_agency_clients_client ON agency_clients(client_org_id);
CREATE INDEX idx_agency_clients_active ON agency_clients(is_active) WHERE is_active = true;
```

**Access Model:**
- Agency organization members (with `is_org_admin = true`) can access client organization data
- Super admins can manage all agency relationships
- Cross-tenant queries use agency expansion logic

**Example Relationship (Yodel Mobile):**

```
Agency: Yodel Mobile (7cccba3f...)
  ├─> Client 1 (dbdb0cc5...) → 23 apps
  ├─> Client 2 (550e8400...) → 5 apps
  └─> Client 3 (f47ac10b...) → 2 apps
Total Accessible: 30 apps
```

**Usage Patterns:**

```sql
-- Get all clients for agency
SELECT o.id, o.name, o.slug
FROM agency_clients ac
JOIN organizations o ON o.id = ac.client_org_id
WHERE ac.agency_org_id = 'agency-uuid'
  AND ac.is_active = true;

-- Create agency-client relationship
INSERT INTO agency_clients (agency_org_id, client_org_id)
VALUES ('agency-uuid', 'client-uuid');

-- Deactivate relationship
UPDATE agency_clients
SET is_active = false
WHERE agency_org_id = 'agency-uuid'
  AND client_org_id = 'client-uuid';
```

---

### 5. `audit_logs`

**Purpose:** Immutable audit trail for compliance (SOC 2, ISO 27001, GDPR)

**Status:** PRODUCTION
**RLS:** Enabled
**Retention:** 7 years (compliance requirement)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  user_email TEXT NOT NULL,  -- Denormalized for audit
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
```

**Indexes:**
```sql
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
```

**Common Actions Logged:**
- `login` / `logout` / `session_timeout`
- `view_dashboard_v2` / `view_reviews`
- `mfa_enabled` / `mfa_verified`
- `app_attached` / `app_detached`
- `permission_changed` (planned)

**Usage Patterns:**

```sql
-- Recent user activity
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;

-- Failed login attempts (24 hours)
SELECT user_email, COUNT(*) as attempt_count,
       MAX(created_at) as last_attempt
FROM audit_logs
WHERE action = 'login'
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 5
ORDER BY attempt_count DESC;

-- Dashboard views by organization (last 30 days)
SELECT organization_id, DATE(created_at) as date, COUNT(*) as views
FROM audit_logs
WHERE action = 'view_dashboard_v2'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY organization_id, DATE(created_at)
ORDER BY date DESC, views DESC;
```

---

### 6. `mfa_enforcement`

**Purpose:** Track MFA enrollment for admin users

**Status:** PRODUCTION
**RLS:** Enabled
**Grace Period:** 30 days for admin users

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
```

**Indexes:**
```sql
CREATE INDEX idx_mfa_enforcement_grace ON mfa_enforcement(grace_period_ends_at)
  WHERE mfa_enabled_at IS NULL AND grace_period_ends_at IS NOT NULL;
```

**Usage Patterns:**

```sql
-- Get users needing MFA
SELECT u.email, me.grace_period_ends_at,
       (me.grace_period_ends_at - NOW()) as days_remaining
FROM mfa_enforcement me
JOIN auth.users u ON u.id = me.user_id
WHERE me.mfa_enabled_at IS NULL
  AND me.grace_period_ends_at > NOW()
ORDER BY grace_period_ends_at ASC;

-- Mark MFA as enabled
UPDATE mfa_enforcement
SET mfa_enabled_at = NOW(),
    grace_period_ends_at = NULL,
    updated_at = NOW()
WHERE user_id = 'user-uuid';

-- Send reminder
UPDATE mfa_enforcement
SET last_reminded_at = NOW()
WHERE user_id = 'user-uuid';
```

---

### 7. `encryption_keys`

**Purpose:** Application-level encryption key management

**Status:** INFRASTRUCTURE (created but not actively used)
**RLS:** Enabled (service_role only)
**Note:** Supabase infrastructure-level AES-256 encryption is sufficient for current compliance needs

```sql
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT UNIQUE NOT NULL,
  encrypted_key TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'rotated', 'revoked'))
);
```

**RLS Policy:**
```sql
-- Only service_role can access
CREATE POLICY "service_role_only"
ON encryption_keys FOR ALL
TO service_role
USING (true);
```

**Migration Status:** Created but not actively used. Infrastructure-level encryption is sufficient.

---

## Views

### `user_permissions_unified`

**Purpose:** Unified view for efficient permission lookups

**Status:** PRODUCTION
**Type:** READ-ONLY VIEW

**Definition:**
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

**Usage:**
```sql
-- Get all permissions for user
SELECT * FROM user_permissions_unified
WHERE user_id = auth.uid();

-- Check if user is super admin
SELECT is_super_admin FROM user_permissions_unified
WHERE user_id = auth.uid()
  AND is_platform_role = true
LIMIT 1;
```

**Columns:**
- `user_id` - User UUID
- `org_id` - Organization UUID (NULL for platform roles)
- `role` - User's role (app_role enum)
- `org_name` - Organization name
- `org_slug` - Organization slug
- `org_tier` - Organization tier
- `is_super_admin` - Boolean (true for SUPER_ADMIN)
- `is_org_admin` - Boolean (true for ORG_ADMIN or SUPER_ADMIN)
- `is_platform_role` - Boolean (true for NULL organization_id)

---

## Database Functions

### `sec.is_super_admin()`

**Purpose:** Check if current user is a platform super admin

**Returns:** `BOOLEAN`
**Security:** SECURITY DEFINER

```sql
CREATE FUNCTION sec.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('SUPER_ADMIN', 'super_admin')
      AND organization_id IS NULL  -- Critical: platform-level only
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

**Usage in RLS Policies:**
```sql
-- All RLS policies include super admin escape hatch
CREATE POLICY "policy_name" ON table_name
FOR ALL USING (
  /* regular permission checks */
  OR (SELECT sec.is_super_admin())
);
```

---

### `can_access_organization()`

**Purpose:** Check if user can access target organization (direct or via agency)

**Parameters:**
- `target_org_id UUID` - Organization to check access for
- `check_user_id UUID DEFAULT auth.uid()` - User to check (defaults to current user)

**Returns:** `BOOLEAN`
**Security:** SECURITY DEFINER

```sql
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

**Usage:**
```sql
-- Check if current user can access organization
SELECT can_access_organization('7cccba3f-0a8f-446f-9dba-86e9cb68c92b');

-- Get all accessible organizations for user
SELECT o.*
FROM organizations o
WHERE can_access_organization(o.id);
```

---

### `log_audit_event()`

**Purpose:** Insert audit log entry for compliance tracking

**Parameters:**
- `p_user_id UUID` - User performing action
- `p_organization_id UUID` - Organization context
- `p_user_email TEXT` - User email (denormalized)
- `p_action TEXT` - Action name (e.g., 'login', 'view_dashboard_v2')
- `p_resource_type TEXT` - Resource type (optional)
- `p_resource_id UUID` - Resource ID (optional)
- `p_details JSONB` - Additional details (optional)
- `p_ip_address TEXT` - IP address (optional)
- `p_user_agent TEXT` - User agent (optional)
- `p_request_path TEXT` - Request path (optional)
- `p_status TEXT` - Status ('success', 'failure', 'denied')
- `p_error_message TEXT` - Error message (optional)

**Returns:** `UUID` (audit log entry ID)
**Security:** SECURITY DEFINER

```sql
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

**Usage:**
```typescript
// Frontend usage
await supabase.rpc('log_audit_event', {
  p_user_id: user.id,
  p_organization_id: orgId,
  p_user_email: user.email,
  p_action: 'view_dashboard_v2',
  p_status: 'success'
});
```

---

## Enums

### `app_role`

**Purpose:** Define user roles in the system

```sql
CREATE TYPE app_role AS ENUM (
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'ASO_MANAGER',
  'ANALYST',
  'VIEWER',
  'CLIENT'
);
```

**Role Hierarchy (highest to lowest):**
1. `SUPER_ADMIN` - Platform-wide access
2. `ORG_ADMIN` - Organization administrator
3. `ASO_MANAGER` - Full analytics access
4. `ANALYST` - View analytics, export reports
5. `VIEWER` - Read-only dashboard
6. `CLIENT` - Limited client portal

---

## Indexes

### Performance-Critical Indexes

**organizations:**
- `idx_organizations_slug` - Lookup by slug (login, routing)
- `idx_organizations_active` - Filter active organizations
- `idx_organizations_tier` - Filter by tier

**user_roles:**
- `idx_user_roles_org` - Organization member lookup
- `idx_user_roles_role` - Role-based queries

**org_app_access:**
- `idx_org_app_access_org` - Organization app lookup
- `idx_org_app_access_app` - App access lookup
- `idx_org_app_access_active` - Partial index for active apps only

**agency_clients:**
- `idx_agency_clients_agency` - Agency client lookup
- `idx_agency_clients_client` - Client agency lookup
- `idx_agency_clients_active` - Partial index for active relationships

**audit_logs:**
- `idx_audit_logs_user` - User activity lookup
- `idx_audit_logs_org` - Organization activity
- `idx_audit_logs_action` - Action type filtering
- `idx_audit_logs_created` - Time-based queries (DESC)
- `idx_audit_logs_status` - Status filtering

**mfa_enforcement:**
- `idx_mfa_enforcement_grace` - Grace period expiration queries

---

## Related Documentation

- **[ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md)** - V1 production architecture
- **[ERD Diagrams](./erd-diagrams.md)** - Entity-Relationship Diagrams
- **[Migrations](./migrations.md)** - Migration history
- **[Authorization V1](../system-design/authorization-v1.md)** - Authorization system

---

**Next:** [ERD Diagrams](./erd-diagrams.md) → Visual database relationships
