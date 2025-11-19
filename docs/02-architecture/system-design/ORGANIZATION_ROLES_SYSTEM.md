---
Status: ACTIVE
Version: v2.0
Last Updated: 2025-01-19
Purpose: Comprehensive organization roles, permissions, and relationships
Canonical: false
See Also: docs/02-architecture/ARCHITECTURE_V1.md (system-wide architecture)
Audience: Developers, Architects
---

# Organization Roles and Relationships System Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Schema](#database-schema)
3. [Role Hierarchy](#role-hierarchy)
4. [Organization Structure](#organization-structure)
5. [User-Organization Relationships](#user-organization-relationships)
6. [Permission Resolution](#permission-resolution)
7. [Feature Gating](#feature-gating)
8. [Agency Model](#agency-model)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Security Analysis](#security-analysis)
11. [Migration History](#migration-history)

---

## 1. Executive Summary

The Yodel ASO Insight platform implements a sophisticated multi-tenant organization and role-based access control (RBAC) system. The architecture supports:

- **Multi-organization tenancy** with isolated data access
- **Hierarchical role system** (Platform Super Admin → Org Admin → ASO Manager → Analyst → Viewer → Client)
- **Agency-client relationships** allowing cross-tenant access
- **Feature gating** at the organization level
- **Single source of truth** (`user_roles` table with `user_permissions_unified` view)

### Key Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `user_roles` | Single source of truth for role assignments | **ACTIVE** |
| `user_permissions_unified` | Read-optimized permission view | **ACTIVE** |
| `organizations` | Organization/tenant registry | **ACTIVE** |
| `organization_features` | Feature flag management | **ACTIVE** |
| `agency_clients` | Agency → Client relationships | **ACTIVE** |
| `apps` | App catalog with org ownership | **ACTIVE** |
| `org_users` | **DEPRECATED** (migrated 2025-12-05) | **DEPRECATED** |

---

## 2. Database Schema

### 2.1 Core Tables

#### `organizations`

The central registry for all tenants in the system.

```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}',

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,

  -- Enterprise fields
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('demo', 'standard', 'enterprise')),
  max_apps INTEGER DEFAULT 50,

  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);
```

**Key Fields:**
- `tier`: Organization subscription level (`demo`, `standard`, `enterprise`)
- `max_apps`: Maximum apps allowed (capacity planning)
- `settings`: JSONB for flexible configuration (e.g., `{"demo_mode": true, "bigquery_enabled": true}`)
- `slug`: URL-friendly identifier

**Known Organizations:**
| ID | Name | Slug | Tier | Max Apps |
|----|------|------|------|----------|
| `7cccba3f-0a8f-446f-9dba-86e9cb68c92b` | Yodel Mobile | yodel-mobile | enterprise | 1000 |
| `550e8400-e29b-41d4-a716-446655440002` | Demo Analytics | demo-analytics | demo | 10 |
| `11111111-1111-1111-1111-111111111111` | Next | next | demo | 5 |

---

#### `user_roles` (Single Source of Truth)

**Status:** ACTIVE (as of 2025-12-05)
**Replaces:** `org_users` table

```sql
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id)  -- One role per user (simplified model)
);

-- Role enum
CREATE TYPE app_role AS ENUM (
  'SUPER_ADMIN',      -- Platform-level super admin (org_id = NULL)
  'ORG_ADMIN',        -- Organization administrator
  'ASO_MANAGER',      -- ASO manager role
  'ANALYST',          -- Data analyst role
  'VIEWER',           -- Read-only viewer
  'CLIENT'            -- External client (limited access)
);

-- Indexes
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE UNIQUE INDEX idx_user_roles_user_unique ON user_roles(user_id);
```

**Important Constraints:**
- **One role per user**: Each user has exactly one active role
- **Platform vs Organization roles**:
  - `organization_id IS NULL` → Platform-level role (SUPER_ADMIN only)
  - `organization_id IS NOT NULL` → Organization-scoped role
- **Enum normalization**: Frontend uses lowercase (`super_admin`), database uses uppercase (`SUPER_ADMIN`)

---

#### `user_permissions_unified` (Read-Optimized View)

**Purpose:** Single query interface for permission resolution with role normalization.

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

  -- Role flags (handle both uppercase and lowercase enum values)
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
    ELSE 'viewer'
  END AS effective_role
FROM user_roles ur
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE ur.role IS NOT NULL;
```

**View Features:**
- **Case-insensitive role matching**: Handles `SUPER_ADMIN` and `super_admin`
- **Platform role detection**: `is_platform_role = (organization_id IS NULL)`
- **Normalized output**: `effective_role` always lowercase
- **Join optimization**: LEFT JOIN to organizations for metadata

**Usage Example:**
```sql
-- Get user permissions
SELECT * FROM user_permissions_unified WHERE user_id = auth.uid();

-- Check if user is super admin
SELECT is_super_admin FROM user_permissions_unified
WHERE user_id = auth.uid() AND is_platform_role = true;
```

---

#### `organization_features`

**Purpose:** Feature flag management per organization.

```sql
CREATE TABLE organization_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, feature_key)
);

-- Indexes
CREATE INDEX idx_org_features_org_id ON organization_features(organization_id);
CREATE INDEX idx_org_features_key ON organization_features(feature_key);
```

**Feature Keys:** (from `/src/constants/features.ts`)
- `executive_dashboard`
- `analytics`
- `conversion_intelligence`
- `performance_intelligence`
- `predictive_forecasting`
- `aso_ai_hub`
- `chatgpt_visibility_audit`
- `metadata_generator`
- `strategic_audit_engine`
- `keyword_intelligence`
- `competitive_intelligence`
- `creative_review`
- `app_discovery`
- ... (24 total features)

**Example Configuration (Yodel Mobile):**
```json
{
  "analytics_access": true,
  "dashboard_access": false,
  "conversion_access": false,
  "admin_access": false
}
```

---

#### `agency_clients`

**Purpose:** Multi-tenant access control for agency → client relationships.

```sql
CREATE TABLE public.agency_clients (
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
```

**Access Model:**
- Agency organization members (with `is_org_admin = true`) can access client organization data
- Super admins can manage all agency relationships
- Cross-tenant queries use `can_access_organization(target_org_id, user_id)` function

**Example Relationship:**
```sql
-- Yodel Mobile (agency) → Demo Analytics (client)
INSERT INTO agency_clients (agency_org_id, client_org_id) VALUES
  ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', '550e8400-e29b-41d4-a716-446655440002');
```

---

#### `apps`

**Purpose:** App catalog with organization ownership.

```sql
CREATE TABLE public.apps (
  app_id TEXT PRIMARY KEY,
  display_name TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_apps_org_id ON apps(org_id);
CREATE INDEX idx_apps_category ON apps(category);
```

**Access Control:**
- Direct org members can read their apps
- Agency members can read client apps via `agency_clients` join
- Super admins have full access

---

### 2.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ORGANIZATION ROLES SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

auth.users                    organizations
┌──────────────┐              ┌───────────────────────┐
│ id (PK)      │              │ id (PK)               │
│ email        │              │ name                  │
└──────┬───────┘              │ slug (UNIQUE)         │
       │                      │ tier                  │
       │                      │ max_apps              │
       │                      │ settings (JSONB)      │
       │                      │ is_active             │
       │                      └───────┬───────────────┘
       │                              │
       │                              │
       │         user_roles           │
       │         ┌──────────────────┐ │
       └────────►│ user_id (FK/PK) ├─┘
                 │ organization_id ◄─────┐
                 │ role (app_role) │     │
                 └────────┬────────┘     │
                          │              │
                          │              │
        ┌─────────────────┼──────────────┼─────────────┐
        │                 │              │             │
        │                 │              │             │
        ▼                 ▼              ▼             │
organization_features  apps        agency_clients     │
┌────────────────────┐ ┌──────┐   ┌────────────────┐ │
│ organization_id FK │ │org_id│   │agency_org_id FK├─┤
│ feature_key        │ └──────┘   │client_org_id FK├─┘
│ is_enabled         │             └────────────────┘
└────────────────────┘

VIEWS:
┌───────────────────────────────────────────┐
│ user_permissions_unified (READ-ONLY VIEW) │
├───────────────────────────────────────────┤
│ Joins: user_roles + organizations         │
│ Computes: effective_role, is_super_admin  │
│ Purpose: Single-query permission lookup   │
└───────────────────────────────────────────┘
```

---

### 2.3 Table Relationships Summary

| Parent Table | Child Table | Relationship Type | Cascade Behavior |
|--------------|-------------|-------------------|------------------|
| auth.users | user_roles | 1:1 | ON DELETE CASCADE |
| organizations | user_roles | 1:N | ON DELETE CASCADE |
| organizations | organization_features | 1:N | ON DELETE CASCADE |
| organizations | apps | 1:N | ON DELETE CASCADE |
| organizations | agency_clients (agency) | 1:N | ON DELETE CASCADE |
| organizations | agency_clients (client) | 1:N | ON DELETE CASCADE |

---

## 3. Role Hierarchy

### 3.1 Role Definitions

The system implements a hierarchical role model with 6 distinct roles:

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

---

### 3.2 Role Details

#### 1. SUPER_ADMIN (Platform Super Admin)

**Database Value:** `SUPER_ADMIN` (enum), `organization_id IS NULL`
**Frontend Value:** `super_admin`
**Scope:** Platform-wide (cross-organization)

**Permissions:**
- Access ALL organizations (bypass RLS)
- Manage ALL users across organizations
- Approve/manage ALL apps
- View audit logs
- Create/delete organizations
- Manage agency relationships
- Override all feature flags

**Use Cases:**
- System administrators
- Platform engineers
- DevOps personnel

**Security Note:**
> Platform super admins have unrestricted access. Should be limited to 2-3 trusted personnel.

---

#### 2. ORG_ADMIN (Organization Administrator)

**Database Value:** `ORG_ADMIN` (enum), `organization_id NOT NULL`
**Frontend Value:** `org_admin`
**Scope:** Single organization

**Permissions:**
- Manage apps within organization
- Approve apps for organization
- View organization analytics
- Manage organization features (via RLS)
- Access agency client data (if agency)
- Invite/remove organization users

**Use Cases:**
- Organization owners
- Account managers
- Team leads

**Access Pattern:**
```sql
-- Org admin can manage apps in their org
SELECT * FROM apps WHERE org_id = (
  SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
);
```

---

#### 3. ASO_MANAGER

**Database Value:** `ASO_MANAGER` (enum), `organization_id NOT NULL`
**Frontend Value:** `aso_manager`
**Scope:** Single organization

**Permissions:**
- ASO operations (keyword research, optimization)
- App metadata management
- Performance analytics
- Creative review
- Competitive intelligence

**Use Cases:**
- ASO specialists
- App marketing managers
- Growth hackers

---

#### 4. ANALYST

**Database Value:** `ANALYST` (enum), `organization_id NOT NULL`
**Frontend Value:** `analyst`
**Scope:** Single organization

**Permissions:**
- Analytics dashboards (read-only)
- Data exports
- Report generation
- Conversion intelligence
- Performance metrics

**Use Cases:**
- Data analysts
- Business intelligence
- Reporting specialists

---

#### 5. VIEWER

**Database Value:** `VIEWER` (enum), `organization_id NOT NULL`
**Frontend Value:** `viewer`
**Scope:** Single organization

**Permissions:**
- Read-only analytics
- Basic dashboards
- App intelligence (view only)

**Use Cases:**
- Stakeholders
- Executives
- External reviewers

---

#### 6. CLIENT

**Database Value:** `CLIENT` (enum), `organization_id NOT NULL`
**Frontend Value:** `client`
**Scope:** Single organization

**Permissions:**
- Minimal read access
- Basic analytics
- Profile management

**Use Cases:**
- External clients
- Limited partners
- Trial users

---

### 3.3 Role Comparison Matrix

| Feature | SUPER_ADMIN | ORG_ADMIN | ASO_MANAGER | ANALYST | VIEWER | CLIENT |
|---------|-------------|-----------|-------------|---------|--------|--------|
| **Access Scope** | All Orgs | Single Org | Single Org | Single Org | Single Org | Single Org |
| **Manage Apps** | ✅ All | ✅ Own Org | ❌ | ❌ | ❌ | ❌ |
| **Approve Apps** | ✅ All | ✅ Own Org | ❌ | ❌ | ❌ | ❌ |
| **Analytics Dashboard** | ✅ All | ✅ Full | ✅ Full | ✅ Full | ✅ Read-Only | ✅ Basic |
| **ASO Tools** | ✅ All | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **AI Features** | ✅ All | ✅ Most | ✅ Basic | ❌ | ❌ | ❌ |
| **Keyword Intelligence** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Competitive Intel** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Feature Management** | ✅ All | ✅ Own Org | ❌ | ❌ | ❌ | ❌ |
| **User Management** | ✅ All | ✅ Own Org | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Agency Access** | ✅ All | ✅ Clients | ❌ | ❌ | ❌ | ❌ |

---

### 3.4 Role Inheritance

The system does NOT implement traditional role inheritance. Instead, it uses **permission accumulation** based on role:

```typescript
// From /src/constants/features.ts
export const ROLE_FEATURE_DEFAULTS: Record<UserRole, string[]> = {
  super_admin: Object.values(PLATFORM_FEATURES_ENHANCED), // All 24 features

  org_admin: [
    ...FEATURE_CATEGORIES.PERFORMANCE_INTELLIGENCE.features, // 5 features
    PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB,
    PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR,
    ...FEATURE_CATEGORIES.GROWTH_ACCELERATORS.features, // 10 features
    PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.PORTFOLIO_MANAGER,
    ...FEATURE_CATEGORIES.ACCOUNT.features, // 2 features
  ],

  aso_manager: [
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    PLATFORM_FEATURES_ENHANCED.PERFORMANCE_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB,
    PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR,
    PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.CREATIVE_REVIEW,
    PLATFORM_FEATURES_ENHANCED.ASO_CHAT,
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],

  analyst: [
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    PLATFORM_FEATURES_ENHANCED.CONVERSION_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE,
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],

  viewer: [
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE,
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],

  client: [
    PLATFORM_FEATURES_ENHANCED.ANALYTICS,
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],
};
```

**Key Principle:** Lower roles are subsets of higher roles, but explicit, not inherited.

---

## 4. Organization Structure

### 4.1 Organization Types

The system supports three organization tiers:

| Tier | Purpose | Max Apps | Features | Examples |
|------|---------|----------|----------|----------|
| **enterprise** | Production organizations | 1000+ | All features available | Yodel Mobile |
| **standard** | Regular clients | 50 | Standard feature set | Typical clients |
| **demo** | Testing/trials | 5-10 | Limited features | Demo Analytics, Next |

---

### 4.2 Organization Settings

Organizations store flexible configuration in the `settings` JSONB column:

```json
{
  "demo_mode": false,
  "bigquery_enabled": true,
  "features": ["analytics", "reporting", "bigquery"],
  "branding": {
    "logo_url": "https://...",
    "primary_color": "#1a73e8"
  },
  "integrations": {
    "slack_webhook": "https://hooks.slack.com/...",
    "google_analytics": "UA-XXXXX-Y"
  }
}
```

**Common Settings:**
- `demo_mode` (boolean): Enable demo data mode
- `bigquery_enabled` (boolean): Enable BigQuery integration
- `features` (array): Enabled feature keys
- `branding` (object): UI customization
- `integrations` (object): Third-party integrations

---

### 4.3 Multi-Tenancy Implementation

**Data Isolation Strategy:** Row-Level Security (RLS)

All tables with `org_id` or `organization_id` columns implement RLS policies:

```sql
-- Example: apps table RLS
CREATE POLICY "Org members read their apps" ON apps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND organization_id = apps.org_id
  )
  OR (SELECT sec.is_super_admin())
);
```

**Tenant Switching:**
- Users with multiple org access can switch via frontend context
- Backend validates access via `can_access_organization(target_org_id, user_id)`

---

## 5. User-Organization Relationships

### 5.1 User Assignment Model

**Current Model:** One user, one role, one organization (simplified for Phase 1)

```sql
-- User can have ONE active role
CREATE UNIQUE INDEX idx_user_roles_user_unique ON user_roles(user_id);
```

**Exception:** Platform super admins (`organization_id IS NULL`) can access all organizations.

---

### 5.2 Membership Resolution

**Frontend Hook:** `/src/hooks/usePermissions.ts`

```typescript
export const usePermissions = () => {
  const { user } = useAuth();

  const { data: permissions } = useQuery({
    queryKey: ['userPermissions', user?.id],
    queryFn: async () => {
      // Query unified view
      const { data: allPermissions } = await supabase
        .from('user_permissions_unified')
        .select('*')
        .eq('user_id', user.id);

      // Find primary permission (current org or super admin)
      const currentOrgPermission = allPermissions.find(p =>
        p.org_id && p.is_org_scoped_role
      );
      const superAdminPermission = allPermissions.find(p =>
        p.is_super_admin
      );
      const primaryPermission = currentOrgPermission ||
                                 superAdminPermission ||
                                 allPermissions[0];

      return {
        userId: user.id,
        organizationId: primaryPermission?.org_id,
        effectiveRole: primaryPermission?.effective_role,
        isSuperAdmin: primaryPermission?.is_super_admin,
        isOrganizationAdmin: primaryPermission?.is_org_admin,
        availableOrgs: extractUniqueOrgs(allPermissions),
      };
    }
  });

  return permissions;
};
```

**Resolution Priority:**
1. **Platform Super Admin** (`organization_id IS NULL` + `is_super_admin = true`)
2. **Organization-scoped roles** (user's primary org)
3. **Fallback to viewer** (if no permissions)

---

### 5.3 Agency-Client Relationships

**Cross-Tenant Access Model:**

```sql
-- Agency admin can access client org data
CREATE POLICY "Agency members read client apps" ON apps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN agency_clients ac ON ac.agency_org_id = ur.organization_id
    WHERE ur.user_id = auth.uid()
      AND ac.client_org_id = apps.org_id
      AND ac.is_active = true
  )
  OR (SELECT sec.is_super_admin())
);
```

**Access Flow:**
1. User logs in as `org_admin` of Agency A
2. Agency A has relationship with Client B (`agency_clients` table)
3. User queries Client B's apps
4. RLS policy allows access via agency relationship

**Security Boundary:**
- Only `is_org_admin = true` roles can access client data
- Agency relationship must be `is_active = true`
- Super admins can manage all relationships

---

## 6. Permission Resolution

### 6.1 Permission Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│           PERMISSION RESOLUTION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. User Authentication
   ├─> Supabase Auth (auth.users)
   └─> Extract user_id

2. Query user_permissions_unified
   ├─> SELECT * FROM user_permissions_unified WHERE user_id = ?
   └─> Returns: role, org_id, is_super_admin, effective_role

3. Determine Primary Permission
   ├─> IF is_super_admin AND is_platform_role → Platform Super Admin
   ├─> ELSE IF org_id IS NOT NULL → Organization Role
   └─> ELSE → Fallback to viewer

4. Load Organization Features (if org_id)
   ├─> SELECT * FROM organization_features WHERE organization_id = ?
   └─> Returns: feature_key, is_enabled

5. Compute Final Permissions
   ├─> Base permissions from role (ROLE_FEATURE_DEFAULTS)
   ├─> + Organization feature overrides
   └─> + Super admin bypass (all features)

6. Return Permission Object
   {
     userId: string,
     organizationId: string | null,
     effectiveRole: string,
     isSuperAdmin: boolean,
     isOrganizationAdmin: boolean,
     permissions: string[],
     features: string[],
     availableOrgs: Organization[]
   }
```

---

### 6.2 Effective Role Calculation

**Database View Logic:**

```sql
-- From user_permissions_unified view
CASE
  WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
  WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
  WHEN ur.role::text = 'ASO_MANAGER' THEN 'aso_manager'
  WHEN ur.role::text = 'ANALYST' THEN 'analyst'
  WHEN ur.role::text = 'VIEWER' THEN 'viewer'
  ELSE 'viewer'
END AS effective_role
```

**Case Normalization:**
- Database stores: `SUPER_ADMIN`, `ORG_ADMIN` (uppercase enum)
- Frontend expects: `super_admin`, `org_admin` (lowercase strings)
- View normalizes: Always returns lowercase `effective_role`

---

### 6.3 Super Admin Handling

**Platform Super Admin Detection:**

```sql
-- Helper function
CREATE FUNCTION sec.is_super_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text = 'super_admin'
      AND organization_id IS NULL  -- Critical: platform-level only
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Super Admin Bypass in RLS:**

```sql
-- All RLS policies include super admin escape hatch
CREATE POLICY "policy_name" ON table_name
FOR ALL USING (
  /* regular permission checks */
  OR (SELECT sec.is_super_admin())
);
```

**Frontend Super Admin Check:**

```typescript
// From usePermissions.ts
const isSuperAdmin = Boolean(
  primaryPermission?.is_super_admin &&
  primaryPermission?.is_platform_role
);

// Super admin always returns true for feature checks
if (isSuperAdmin) return true;
```

---

### 6.4 Edge Function Permission Resolution

**Shared Utility:** `/supabase/functions/_shared/auth-utils.ts`

```typescript
export async function resolveUserPermissions(
  supabase: SupabaseClient,
  user_id: string,
  requested_org_id?: string
): Promise<UserPermissions | null> {
  const { data: allPermissions } = await supabase
    .from('user_permissions_unified')
    .select('*')
    .eq('user_id', user_id);

  // If specific org requested
  if (requested_org_id) {
    const orgPermission = allPermissions.find(p =>
      p.org_id === requested_org_id
    );
    if (orgPermission) return orgPermission;

    // Check if platform super admin
    const superAdminPermission = allPermissions.find(p =>
      p.is_super_admin && p.is_platform_role
    );
    if (superAdminPermission) {
      return {
        ...superAdminPermission,
        org_id: requested_org_id, // Override for context
        hasImplicitAccess: true
      };
    }

    return null; // No access
  }

  // Return permission with precedence
  return allPermissions.sort((a, b) => {
    if (a.is_super_admin && a.is_platform_role) return -1;
    if (b.is_super_admin && b.is_platform_role) return 1;
    if (a.is_org_admin !== b.is_org_admin) return b.is_org_admin ? 1 : -1;
    return 0;
  })[0];
}
```

**Complete Auth Context:**

```typescript
export interface AuthContext {
  user: User;
  permissions: UserPermissions;
  requestedOrgId?: string;
  hasOrgAccess: boolean;
  features: Record<string, boolean>;
  isDemo: boolean;
}

export async function resolveAuthContext(
  supabase: SupabaseClient,
  requested_org_id?: string
): Promise<AuthContext | null> {
  const permissions = await resolveUserPermissions(supabase, user.id, requested_org_id);
  const features = await getOrganizationFeatures(supabase, permissions.org_id);
  const isDemo = await isDemoOrganization(supabase, permissions.org_id);

  return { user, permissions, features, isDemo, hasOrgAccess: true };
}
```

---

## 7. Feature Gating

### 7.1 Feature Categories

**24 Features in 5 Categories:**

| Category | Features | Purpose |
|----------|----------|---------|
| **Performance Intelligence** (5) | executive_dashboard, analytics, conversion_intelligence, performance_intelligence, predictive_forecasting | Metrics & dashboards |
| **AI Command Center** (4) | aso_ai_hub, chatgpt_visibility_audit, metadata_generator, strategic_audit_engine | AI-powered tools |
| **Growth Accelerators** (10) | keyword_intelligence, competitive_intelligence, creative_review, app_discovery, aso_chat, market_intelligence, reviews_public_rss_enabled, creative_analysis, keyword_rank_tracking, visibility_optimizer | UA & growth tools |
| **Control Center** (3) | app_intelligence, portfolio_manager, system_control | Management tools |
| **Account** (2) | profile_management, preferences | User settings |

---

### 7.2 Feature Access Control

**Three-Level Check:**

```typescript
// 1. Role-based defaults (from constants/features.ts)
const roleFeatures = ROLE_FEATURE_DEFAULTS[user.effectiveRole];

// 2. Organization feature flags (from organization_features table)
const orgFeatures = await getOrganizationFeatures(orgId);

// 3. Super admin bypass
if (user.isSuperAdmin) return true;

// Final check
const hasAccess = roleFeatures.includes(featureKey) &&
                  orgFeatures[featureKey] === true;
```

**Frontend Hook:**

```typescript
// From /src/hooks/useFeatureAccess.ts (inferred)
export const useFeatureAccess = (featureKey: string) => {
  const { effectiveRole, isSuperAdmin, organizationId } = usePermissions();

  // Super admin bypass
  if (isSuperAdmin) return true;

  // Check role defaults
  const roleHasFeature = featureEnabledForRole(featureKey, effectiveRole);
  if (!roleHasFeature) return false;

  // Check org feature flags
  const { data: orgFeatures } = useQuery({
    queryKey: ['orgFeatures', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('organization_features')
        .select('feature_key, is_enabled')
        .eq('organization_id', organizationId);
      return data;
    }
  });

  const orgFeature = orgFeatures?.find(f => f.feature_key === featureKey);
  return orgFeature?.is_enabled ?? false;
};
```

---

### 7.3 Feature Flag Management

**RLS Policy:**

```sql
CREATE POLICY "org_admins_can_manage_features" ON organization_features
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM org_users
    WHERE user_id = auth.uid()
      AND org_id = organization_features.organization_id
      AND role IN ('org_admin')
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND organization_id IS NULL
  )
);
```

**Management Flow:**
1. Super admin or org admin navigates to org settings
2. Fetches `organization_features` for org
3. Toggles `is_enabled` for feature keys
4. Updates propagate to all org users on next permission refresh

---

### 7.4 Default Features per Role

```typescript
// Super Admin: ALL 24 features
super_admin: Object.values(PLATFORM_FEATURES_ENHANCED)

// Org Admin: 19 features (excludes some AI features)
org_admin: [
  'executive_dashboard', 'analytics', 'conversion_intelligence',
  'performance_intelligence', 'predictive_forecasting',
  'aso_ai_hub', 'ai_metadata_generator',
  'keyword_intelligence', 'competitive_intelligence', 'creative_review',
  'app_discovery', 'aso_chat', 'market_intelligence',
  'reviews_public_rss_enabled', 'creative_analysis',
  'keyword_rank_tracking', 'visibility_optimizer',
  'app_intelligence', 'portfolio_manager',
  'profile_management', 'preferences'
]

// ASO Manager: 10 features
aso_manager: [
  'analytics', 'performance_intelligence',
  'aso_ai_hub', 'ai_metadata_generator',
  'keyword_intelligence', 'competitive_intelligence',
  'creative_review', 'aso_chat',
  'profile_management', 'preferences'
]

// Analyst: 6 features
analyst: [
  'analytics', 'conversion_intelligence',
  'competitive_intelligence', 'keyword_intelligence',
  'profile_management', 'preferences'
]

// Viewer: 4 features
viewer: [
  'analytics', 'app_intelligence',
  'profile_management', 'preferences'
]

// Client: 3 features
client: [
  'analytics',
  'profile_management', 'preferences'
]
```

---

## 8. Agency Model

### 8.1 Agency-Client Relationship

**Data Model:**

```sql
CREATE TABLE agency_clients (
  agency_org_id UUID NOT NULL,  -- Agency organization
  client_org_id UUID NOT NULL,  -- Client organization
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (agency_org_id, client_org_id)
);
```

**Example Setup:**

```
Agency: Yodel Mobile (7cccba3f-0a8f-446f-9dba-86e9cb68c92b)
  ├─> Client: Demo Analytics (550e8400-e29b-41d4-a716-446655440002)
  └─> Client: Client B (another-uuid-here)
```

---

### 8.2 Cross-Tenant Access Patterns

**Access Rule:** Agency org admins can access client organization data.

```sql
-- Helper function
CREATE FUNCTION can_access_organization(
  target_org_id UUID,
  user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
  -- Platform super admin
  IF EXISTS (
    SELECT 1 FROM user_permissions_unified
    WHERE user_id = can_access_organization.user_id
      AND is_super_admin = true
      AND is_platform_role = true
  ) THEN RETURN TRUE;
  END IF;

  -- Direct organization membership
  IF EXISTS (
    SELECT 1 FROM user_permissions_unified
    WHERE user_id = can_access_organization.user_id
      AND org_id = target_org_id
  ) THEN RETURN TRUE;
  END IF;

  -- Agency relationship access
  IF EXISTS (
    SELECT 1 FROM user_permissions_unified up
    JOIN agency_clients ac ON ac.agency_org_id = up.org_id
    WHERE up.user_id = can_access_organization.user_id
      AND ac.client_org_id = target_org_id
      AND ac.is_active = true
      AND up.is_org_admin = true  -- Only admins
  ) THEN RETURN TRUE;
  END IF;

  RETURN FALSE;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage in Queries:**

```sql
-- Get all accessible organizations for user
SELECT * FROM organizations
WHERE can_access_organization(id, auth.uid());

-- Check specific org access
SELECT can_access_organization('550e8400-e29b-41d4-a716-446655440002');
```

---

### 8.3 Agency Member Permissions on Client Data

**Permission Scope:**

| Operation | Agency Admin | Agency Member (non-admin) |
|-----------|--------------|---------------------------|
| Read client apps | ✅ | ❌ |
| Read client analytics | ✅ | ❌ |
| Manage client apps | ❌ (client's org admin only) | ❌ |
| Approve client apps | ❌ (client's org admin only) | ❌ |

**RLS Implementation:**

```sql
-- Example: Agency access to client apps
CREATE POLICY "Agency members read client apps" ON apps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN agency_clients ac ON ac.agency_org_id = ur.organization_id
    WHERE ur.user_id = auth.uid()
      AND ac.client_org_id = apps.org_id
      AND ac.is_active = true
      AND ur.role = 'ORG_ADMIN'  -- Only admins
  )
);
```

---

### 8.4 Security Boundaries

**Agency Model Security:**

1. **Read-Only Access:** Agency members have read-only access to client data (no mutations)
2. **Admin-Only:** Only `is_org_admin = true` can access client data
3. **Active Relationships:** `is_active = true` required in `agency_clients`
4. **Audit Trail:** All agency access logged via RLS policies
5. **Revocable:** Deactivate `agency_clients` row to revoke access

**Edge Cases:**
- **Client switches agency:** Update `agency_clients` mapping
- **Agency member demoted:** Loss of admin role = loss of client access
- **Client org deleted:** Cascade delete removes `agency_clients` rows

---

## 9. Data Flow Diagrams

### 9.1 User → Organization → Role → Permissions Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              PERMISSION RESOLUTION DATA FLOW                     │
└──────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   User      │
│ (auth.users)│
└──────┬──────┘
       │
       │ user_id
       ▼
┌─────────────────────┐
│   user_roles        │  ◄─── Single Source of Truth
│ ─────────────────   │
│ user_id             │
│ organization_id     │
│ role (app_role)     │
└──────┬──────────────┘
       │
       │ JOIN organizations
       ▼
┌────────────────────────────┐
│ user_permissions_unified   │  ◄─── Read-Optimized View
│ ──────────────────────────  │
│ user_id                    │
│ org_id                     │
│ org_name, org_slug         │
│ effective_role             │
│ is_super_admin             │
│ is_org_admin               │
│ is_platform_role           │
└──────┬─────────────────────┘
       │
       │ Frontend: usePermissions()
       ▼
┌──────────────────────────┐
│ Permission Object        │
│ ──────────────────────   │
│ userId                   │
│ organizationId           │
│ effectiveRole            │
│ isSuperAdmin             │
│ isOrganizationAdmin      │
│ availableOrgs[]          │
└──────┬───────────────────┘
       │
       │ + Load organization_features
       ▼
┌───────────────────────────┐
│ Final Permissions         │
│ ───────────────────────   │
│ Base role permissions     │
│ + Org feature overrides   │
│ + Super admin bypass      │
└───────────────────────────┘
       │
       │ Used by
       ▼
┌───────────────────────────┐
│ UI Components             │
│ ───────────────────────   │
│ <FeatureGuard>            │
│ <RoleGuard>               │
│ useFeatureAccess()        │
└───────────────────────────┘
```

---

### 9.2 Agency → Client Access Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              AGENCY CLIENT ACCESS DATA FLOW                      │
└──────────────────────────────────────────────────────────────────┘

User (Agency Org Admin)
       │
       │ 1. Authenticate
       ▼
┌─────────────────────┐
│   user_roles        │
│ ─────────────────   │
│ user_id: alice      │
│ org_id: Agency A    │
│ role: ORG_ADMIN     │
└──────┬──────────────┘
       │
       │ 2. Query: Can access Client B's data?
       ▼
┌────────────────────────────┐
│   agency_clients           │
│ ──────────────────────────  │
│ agency_org_id: Agency A    │
│ client_org_id: Client B    │
│ is_active: true            │
└──────┬─────────────────────┘
       │
       │ 3. RLS Check: EXISTS(agency_clients JOIN)
       ▼
┌──────────────────────────┐
│   apps (Client B)        │
│ ──────────────────────   │
│ app_id: com.client.app   │
│ org_id: Client B         │
└──────┬───────────────────┘
       │
       │ 4. Return data (read-only)
       ▼
┌───────────────────────────┐
│ Agency Admin UI           │
│ ───────────────────────   │
│ Display Client B apps     │
│ (No mutation allowed)     │
└───────────────────────────┘
```

**Key Steps:**
1. Agency admin authenticates with `org_id = Agency A`
2. Attempts to query Client B's data
3. RLS policy checks `agency_clients` for active relationship
4. If relationship exists + user is `ORG_ADMIN` → access granted
5. Frontend renders client data in read-only mode

---

### 9.3 Feature Flag Resolution Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              FEATURE FLAG RESOLUTION FLOW                        │
└──────────────────────────────────────────────────────────────────┘

Component Request: <FeatureGuard feature="analytics">
       │
       │ 1. Check useFeatureAccess("analytics")
       ▼
┌─────────────────────┐
│   usePermissions()  │
│ ─────────────────   │
│ effectiveRole       │
│ isSuperAdmin        │
│ organizationId      │
└──────┬──────────────┘
       │
       │ 2. Super admin check
       ▼
   Is Super Admin?
       ├─── YES ──> GRANT ACCESS ✅
       │
       └─── NO
            │
            │ 3. Check role defaults
            ▼
   ┌───────────────────────────┐
   │ ROLE_FEATURE_DEFAULTS     │
   │ ───────────────────────   │
   │ org_admin: [              │
   │   'analytics', ...        │
   │ ]                         │
   └──────┬────────────────────┘
          │
          │ Role has feature?
          ▼
       NO ──> DENY ACCESS ❌
          │
       YES
          │
          │ 4. Check org feature flags
          ▼
   ┌───────────────────────────────┐
   │ organization_features         │
   │ ───────────────────────────   │
   │ feature_key: 'analytics'      │
   │ is_enabled: true              │
   └──────┬────────────────────────┘
          │
          │ Org enabled feature?
          ▼
       YES ──> GRANT ACCESS ✅
          │
       NO ──> DENY ACCESS ❌
```

**Resolution Logic:**
1. **Super admin bypass:** Always grant access
2. **Role defaults:** Check if role has feature in `ROLE_FEATURE_DEFAULTS`
3. **Org overrides:** Check `organization_features.is_enabled`
4. **Final decision:** Role has feature AND org enabled it

---

## 10. Security Analysis

### 10.1 Row-Level Security (RLS) Implementation

**All sensitive tables have RLS enabled:**

```sql
-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- User roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Organization features
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;

-- Apps
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;

-- Agency clients
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;
```

---

### 10.2 Security Policies

#### Organizations Table

```sql
-- 1. Platform super admins: Full access
CREATE POLICY "platform_super_admin_full_access" ON organizations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_permissions_unified
    WHERE user_id = auth.uid()
      AND is_super_admin = true
      AND is_platform_role = true
  )
);

-- 2. Org members: Read own org
CREATE POLICY "org_members_read_own" ON organizations
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT org_id FROM user_permissions_unified
    WHERE user_id = auth.uid() AND org_id IS NOT NULL
  )
);

-- 3. Service role: Full access (migrations)
CREATE POLICY "service_role_full_access" ON organizations
FOR ALL TO service_role
USING (true);
```

---

#### Apps Table

```sql
-- 1. Org members read their apps
CREATE POLICY "Org members read their apps" ON apps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND organization_id = apps.org_id
  )
  OR (SELECT sec.is_super_admin())
);

-- 2. Agency members read client apps
CREATE POLICY "Agency members read client apps" ON apps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN agency_clients ac ON ac.agency_org_id = ur.organization_id
    WHERE ur.user_id = auth.uid()
      AND ac.client_org_id = apps.org_id
      AND ac.is_active = true
      AND ur.role = 'ORG_ADMIN'
  )
  OR (SELECT sec.is_super_admin())
);

-- 3. Org members manage their apps
CREATE POLICY "Org members manage their apps" ON apps
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND organization_id = apps.org_id
  )
  OR (SELECT sec.is_super_admin())
);
```

---

### 10.3 Security Functions

```sql
-- Super admin check (platform-level only)
CREATE FUNCTION sec.is_super_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text = 'super_admin'
      AND organization_id IS NULL  -- Critical!
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Organization access check (with agency support)
CREATE FUNCTION can_access_organization(
  target_org_id UUID,
  user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := FALSE;
BEGIN
  -- Platform super admin
  SELECT TRUE INTO has_access
  FROM user_permissions_unified
  WHERE user_permissions_unified.user_id = can_access_organization.user_id
    AND is_super_admin = true
    AND is_platform_role = true
  LIMIT 1;

  IF has_access THEN RETURN TRUE; END IF;

  -- Direct organization membership
  SELECT TRUE INTO has_access
  FROM user_permissions_unified
  WHERE user_permissions_unified.user_id = can_access_organization.user_id
    AND org_id = target_org_id
  LIMIT 1;

  IF has_access THEN RETURN TRUE; END IF;

  -- Agency relationship access
  SELECT TRUE INTO has_access
  FROM user_permissions_unified up
  JOIN agency_clients ac ON ac.agency_org_id = up.org_id
  WHERE up.user_id = can_access_organization.user_id
    AND ac.client_org_id = target_org_id
    AND ac.is_active = true
    AND up.is_org_admin = true
  LIMIT 1;

  RETURN COALESCE(has_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### 10.4 Security Best Practices

**Implemented Safeguards:**

1. **Single Source of Truth:** All role checks use `user_roles` table (no dual systems)
2. **RLS Everywhere:** All multi-tenant tables have RLS enabled
3. **Super Admin Isolation:** Platform super admins have `organization_id IS NULL` (prevents org-level privilege escalation)
4. **Function Security:** All security functions use `SECURITY DEFINER` with explicit `search_path`
5. **Agency Read-Only:** Agency access is read-only (no mutations allowed)
6. **Active Checks:** All relationships require `is_active = true`
7. **Audit Logging:** All security functions log access (via RLS policy execution logs)

**Potential Risks:**

1. **Super Admin Compromise:** If super admin account compromised, attacker has full access
   - **Mitigation:** Require MFA for super admins, limit to 2-3 accounts, audit logs
2. **Agency Relationship Abuse:** Malicious agency admin could exfiltrate client data
   - **Mitigation:** Read-only access, audit logs, `is_active` flag for quick revocation
3. **RLS Performance:** Complex RLS policies can slow queries
   - **Mitigation:** Indexed foreign keys, materialized view caching, query optimization

---

## 11. Migration History

### Phase 1: Initial Setup (2025-11-03)
- Created `organizations` table
- Created `organization_features` table
- Created feature gating system

**Migration:** `20251103200000_create_organization_features.sql`

---

### Phase 2: Apps and Super Admin (2025-12-01)
- Created `apps` table with org ownership
- Added `app_role` enum (`SUPER_ADMIN`, `ORG_ADMIN`, etc.)
- Created `sec.is_super_admin()` helper function
- Implemented RLS on `apps` table

**Migration:** `20251201090000_rls_apps_and_superadmin.sql`

---

### Phase 3: Agency Relationships (2025-12-15)
- Created `agency_clients` table
- Implemented cross-tenant access RLS policies
- Added agency-client access helpers

**Migration:** `20251215100000_agency_clients_and_apps.sql`

---

### Phase 4: Consolidate to user_roles SSOT (2025-12-05)
- **CRITICAL:** Migrated from dual system (`org_users` + `user_roles`) to single `user_roles` table
- Created `user_permissions_unified` view
- Deprecated `org_users` table (backed up as `org_users_deprecated`)
- Fixed case sensitivity issues (uppercase enum → lowercase normalized)

**Migration:** `20251205000000_consolidate_to_user_roles_ssot.sql`

**Impact:**
- ✅ Single source of truth
- ✅ Eliminated data inconsistencies
- ✅ Simplified permission queries
- ⚠️ Breaking change: All queries now use `user_roles` exclusively

---

### Phase 5: Organization Dataset and RLS (2025-12-21)
- Enhanced `organizations` table with `tier`, `max_apps`, `settings`
- Created baseline organizations (Yodel Mobile, Demo Analytics, Next)
- Implemented comprehensive RLS policies
- Added `can_access_organization()` function
- Added `get_accessible_organizations()` function
- Set up agency-client relationships

**Migration:** `20251221000000_fix_organization_dataset_and_rls.sql`

**Impact:**
- ✅ Production-ready organization structure
- ✅ Enterprise-scalable security model
- ✅ Agency model fully functional

---

### Migration Rollback Plan

If issues arise, rollback steps:

1. **Restore org_users:**
   ```sql
   ALTER TABLE org_users_deprecated RENAME TO org_users;
   ```

2. **Revert view:**
   ```sql
   DROP VIEW user_permissions_unified;
   -- Recreate old view (dual-source)
   ```

3. **Restore backups:**
   ```sql
   DELETE FROM user_roles;
   INSERT INTO user_roles SELECT * FROM user_roles_backup;
   ```

**Backup Retention:** 30 days (safe to drop after 2026-01-05)

---

## Appendix A: Quick Reference

### Common Queries

```sql
-- Get user's primary organization
SELECT org_id, org_name, effective_role
FROM user_permissions_unified
WHERE user_id = auth.uid() AND is_org_scoped_role = true
LIMIT 1;

-- Check if user is super admin
SELECT is_super_admin
FROM user_permissions_unified
WHERE user_id = auth.uid() AND is_platform_role = true;

-- Get all accessible organizations (including agency clients)
SELECT * FROM get_accessible_organizations(auth.uid());

-- Check org access
SELECT can_access_organization('7cccba3f-0a8f-446f-9dba-86e9cb68c92b');

-- Get org features
SELECT feature_key, is_enabled
FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
```

---

### Frontend Hooks

```typescript
// Get user permissions
const {
  organizationId,
  effectiveRole,
  isSuperAdmin
} = usePermissions();

// Check feature access
const hasAnalytics = useFeatureAccess('analytics');

// Conditional rendering
<FeatureGuard feature="analytics">
  <AnalyticsDashboard />
</FeatureGuard>

<RoleGuard roles={['org_admin', 'super_admin']}>
  <AdminPanel />
</RoleGuard>
```

---

### Edge Function Helpers

```typescript
import { resolveAuthContext } from '../_shared/auth-utils.ts';

// Get complete auth context
const authContext = await resolveAuthContext(supabase, requested_org_id);

// Check access
if (!requireOrgAccess(authContext, ['org_admin'])) {
  return createErrorResponse('unauthorized', 403);
}

// Check feature
if (!hasFeatureAccess(authContext, 'analytics')) {
  return createErrorResponse('feature_disabled', 403);
}
```

---

## Appendix B: Testing Checklist

### Permission Tests

- [ ] Super admin can access all organizations
- [ ] Org admin can access only their organization
- [ ] Agency admin can access client organizations
- [ ] Non-admin users cannot access agency client data
- [ ] Users with no role get viewer defaults
- [ ] Platform super admin has `organization_id IS NULL`
- [ ] Organization-scoped roles have `organization_id NOT NULL`

### Feature Gating Tests

- [ ] Super admin has access to all features
- [ ] Org admin respects role defaults
- [ ] Feature flags override role defaults
- [ ] Disabled org features block access
- [ ] AI insights respect `VITE_AI_INSIGHTS_ENABLED` env var

### Agency Tests

- [ ] Agency admin can read client apps
- [ ] Agency admin cannot mutate client apps
- [ ] Non-admin agency members cannot access client data
- [ ] Inactive agency relationships block access
- [ ] `can_access_organization()` returns correct results

### Security Tests

- [ ] RLS blocks cross-tenant queries
- [ ] Service role can bypass RLS (migrations only)
- [ ] `sec.is_super_admin()` requires `organization_id IS NULL`
- [ ] Anonymous users cannot access any data
- [ ] Authenticated users without roles get fallback permissions

---

## Appendix C: Troubleshooting

### Issue: User has NULL organization_id

**Symptoms:** User cannot access any data, `organizationId` is `null` in frontend.

**Diagnosis:**
```sql
SELECT * FROM user_roles WHERE user_id = 'USER_ID_HERE';
```

**Solution:**
1. Check if user has role assigned:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'USER_ID_HERE';
   ```
2. If missing, assign role:
   ```sql
   INSERT INTO user_roles (user_id, organization_id, role)
   VALUES ('USER_ID', 'ORG_ID', 'ORG_ADMIN');
   ```
3. If super admin, ensure `organization_id IS NULL`:
   ```sql
   UPDATE user_roles
   SET organization_id = NULL, role = 'SUPER_ADMIN'
   WHERE user_id = 'USER_ID';
   ```

---

### Issue: Permission view returns empty

**Symptoms:** `user_permissions_unified` returns no rows for user.

**Diagnosis:**
```sql
-- Check if user_roles has data
SELECT * FROM user_roles WHERE user_id = 'USER_ID_HERE';

-- Check if organizations exists
SELECT * FROM organizations WHERE id IN (
  SELECT organization_id FROM user_roles WHERE user_id = 'USER_ID_HERE'
);
```

**Solution:**
1. Verify `user_roles` has entry
2. Verify `organizations` exists (LEFT JOIN should still return row)
3. Check for enum case mismatch (should handle both cases)

---

### Issue: Agency access not working

**Symptoms:** Agency admin cannot see client data.

**Diagnosis:**
```sql
-- Check agency relationship
SELECT * FROM agency_clients
WHERE agency_org_id = 'AGENCY_ORG_ID'
  AND client_org_id = 'CLIENT_ORG_ID';

-- Check user role
SELECT role FROM user_roles
WHERE user_id = 'USER_ID'
  AND organization_id = 'AGENCY_ORG_ID';
```

**Solution:**
1. Verify `agency_clients` relationship exists and `is_active = true`
2. Verify user has `ORG_ADMIN` role (not lowercase)
3. Test with `can_access_organization()` function

---

## Appendix D: Performance Optimization

### Indexes

**Critical Indexes:**
```sql
-- user_roles
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- organization_features
CREATE INDEX idx_org_features_org_id ON organization_features(organization_id);
CREATE INDEX idx_org_features_key ON organization_features(feature_key);

-- apps
CREATE INDEX idx_apps_org_id ON apps(org_id);

-- agency_clients
CREATE INDEX idx_agency_clients_agency ON agency_clients(agency_org_id);
CREATE INDEX idx_agency_clients_client ON agency_clients(client_org_id);
```

---

### Query Optimization

**Use `user_permissions_unified` for reads:**
```sql
-- ✅ GOOD: Single query
SELECT * FROM user_permissions_unified WHERE user_id = auth.uid();

-- ❌ BAD: Multiple queries
SELECT * FROM user_roles WHERE user_id = auth.uid();
SELECT * FROM organizations WHERE id = ...;
```

**Cache permissions in frontend:**
```typescript
// React Query cache: 2 minutes
const { data: permissions } = useQuery({
  queryKey: ['userPermissions', user.id],
  queryFn: fetchPermissions,
  staleTime: 1000 * 60 * 2,  // 2 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-05 | Initial consolidation to `user_roles` SSOT |
| 2.0 | 2025-12-21 | Enhanced organization structure, agency model, comprehensive documentation |

---

**Document maintained by:** Platform Engineering Team
**Last reviewed:** 2025-12-21
**Next review:** 2026-01-21
