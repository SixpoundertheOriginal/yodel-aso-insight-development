---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Canonical: true
Supersedes: CURRENT_ARCHITECTURE.md
Purpose: Single source of truth for V1 production architecture
Audience: Developers, Architects, AI Agents
---

# Yodel ASO Insight - Architecture V1 (Production)

**Version:** 1.0 (Current Production)
**Last Updated:** January 19, 2025
**Status:** Production Ready
**Compliance:** SOC 2 (95%), ISO 27001 (90%), GDPR (85%)

> **Note:** This document describes the CURRENT production system (V1). Future architecture (V2/V3) is referenced in the Architecture Evolution section but not detailed here.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [System Overview](#system-overview)
3. [Technology Stack](#technology-stack)
4. [Authentication & Authorization](#authentication--authorization)
5. [Database Architecture](#database-architecture)
6. [Data Pipeline](#data-pipeline)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Services](#backend-services)
9. [Security Features](#security-features)
10. [Deployment](#deployment)
11. [Architecture Evolution](#architecture-evolution)

---

## Quick Reference

### Production Environment

**Supabase Instance:**
- URL: `bkbcqocpjahewqjmlgvf.supabase.co`
- Database: PostgreSQL 15+
- Auth: Supabase Auth (JWT + MFA)

**BigQuery Configuration:**
- Project: `aso-reporting-1`
- Dataset: `client_reports`
- Table: `aso_all_apple` (primary data source)
- Authentication: Service Account with BigQuery Data Viewer role

**Primary Production User:**
- Email: `cli@yodelmobile.com`
- Organization: Yodel Mobile (`7cccba3f-0a8f-446f-9dba-86e9cb68c92b`)
- Role: `ORG_ADMIN`
- Access: Dashboard V2 + Reviews

**Production Pages:**
- Dashboard V2: `/dashboard-v2` (default landing page)
- Reviews Management: `/growth-accelerators/reviews`
- Security Monitoring: `/admin/security` (admin only)
- Settings: `/settings` (MFA setup, profile)

### Key Architecture Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **Authorization SSOT:** `user_roles` table | Eliminated data inconsistencies from dual system | Single source of truth for permissions |
| **Stable API Contract:** `user_permissions_unified` view | Frontend isolated from table structure changes | Backend can refactor without breaking UI |
| **Frontend Auth:** `usePermissions()` hook (NOT `authorize` Edge Function) | Direct database queries faster than Edge Function round-trips | Sub-100ms permission checks |
| **Data Access:** Direct BigQuery integration (no caching layer) | Real-time data + low query volume | Simplified architecture, no sync issues |
| **Security:** RLS policies + MFA + session timeouts + audit logging | Defense-in-depth security model | SOC 2 compliance ready |

### Critical File Locations

**Frontend:**
- Auth Hook: `/src/hooks/usePermissions.ts` (PRIMARY permission check)
- Analytics Hook: `/src/hooks/useEnterpriseAnalytics.ts` (Dashboard V2 data)
- Dashboard Component: `/src/pages/ReportingDashboardV2.tsx`
- App Context: `/src/App.tsx` (provider hierarchy)

**Backend:**
- Edge Function: `/supabase/functions/bigquery-aso-data/index.ts` (808 lines)
- Auth Utilities: `/supabase/functions/_shared/auth-utils.ts`
- Migrations: `/supabase/migrations/` (chronological)

**Documentation:**
- Data Pipeline: `/docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md`
- Roles System: `/docs/02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md`
- BigQuery Reference: `/docs/reference/BIGQUERY_QUICK_REFERENCE.md`

---

## System Overview

### Current Production Status

The Yodel ASO Insight platform is a **production-ready enterprise ASO analytics system** serving Yodel Mobile and their managed clients with real-time App Store Optimization data from BigQuery.

**Production Features:**
- Dashboard V2 with BigQuery integration
- Reviews management (iTunes RSS)
- Multi-factor authentication (MFA)
- Session security (15-min idle, 8-hour absolute)
- Audit logging (SOC 2 compliant)
- Row-level security (RLS)
- Agency multi-tenant support

### User Base

**Primary Organization:** Yodel Mobile (Agency)
- Direct apps: 0 (agency doesn't own apps)
- Managed clients: 3 organizations
- Total accessible apps: 30 apps (from all clients)
- Admin users: 4 total
- MFA grace period: Expired December 8, 2025

**User Roles in Production:**
- **SUPER_ADMIN:** Platform-level admins (organization_id IS NULL)
- **ORG_ADMIN:** Organization administrators (primary role in production)
- **ASO_MANAGER:** ASO operations specialists
- **ANALYST:** Data analysis and reporting
- **VIEWER:** Read-only access
- **CLIENT:** Limited external access

### Feature Status Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard V2 | Production | Primary analytics interface, BigQuery-powered |
| Reviews Management | Production | iTunes RSS integration |
| MFA | Production | TOTP-based, required for admins |
| Session Security | Production | Enabled in production only |
| Audit Logging | Production | 7-year retention for compliance |
| Security Monitoring | Production | Admin dashboard at `/admin/security` |
| BigQuery Integration | Production | Direct connection via Edge Function |
| Agency Multi-Tenant | Production | Yodel Mobile manages 3 client orgs |
| Feature Flags | Planned | Table exists, full implementation pending |
| Encryption (App-Level) | Available | Infrastructure-level sufficient, app-level optional |

---

## Technology Stack

### Frontend Stack

**Core Framework:**
```
React 18.3 + TypeScript 5.6
├── Build Tool: Vite 5.4
├── UI Framework: shadcn/ui (Radix primitives)
├── Styling: Tailwind CSS 3.4
├── State Management: TanStack Query v5 + React Context
├── Routing: React Router DOM v6
├── Forms: React Hook Form + Zod validation
└── Charts: Recharts 2.x
```

**Key Dependencies:**
- **@tanstack/react-query:** Client-side caching and state management
- **@supabase/supabase-js:** Supabase client SDK
- **date-fns:** Date manipulation and formatting
- **lucide-react:** Icon library
- **recharts:** Data visualization

**Development Tools:**
- ESLint + Prettier for code quality
- TypeScript strict mode
- Vite HMR for fast development

### Backend Stack

**Supabase Platform:**
```
PostgreSQL 15+ Database
├── Authentication: Supabase Auth (JWT + MFA)
├── Row-Level Security: Enabled on all multi-tenant tables
├── Edge Functions: Deno v1.77.0 runtime
├── Storage: Supabase Storage with RLS
└── Real-time: WebSocket subscriptions (planned)
```

**Edge Functions Runtime:**
- Language: TypeScript
- Runtime: Deno (secure JavaScript/TypeScript runtime)
- Deployment: Supabase Edge Network
- Timeout: 120 seconds max

### Data Layer

**BigQuery Analytics Warehouse:**
- Project: `aso-reporting-1`
- Dataset: `client_reports`
- Primary Table: `aso_all_apple`
- Query Cost: ~$5/TB scanned (cached to reduce costs)
- Latency: 200-500ms per query

**Table Schema (7 columns):**
| Column | Type | Description |
|--------|------|-------------|
| `date` | DATE | Metric date |
| `app_id` | STRING | App identifier |
| `client` | STRING | Client/org name (fallback) |
| `traffic_source` | STRING | Acquisition channel |
| `impressions` | INTEGER | Product page impressions |
| `product_page_views` | INTEGER | Distinct page views |
| `downloads` | INTEGER | App installations |
| `conversion_rate` | FLOAT | downloads / product_page_views |

### External Integrations

**Current:**
- **BigQuery:** Primary analytics data source
- **iTunes RSS:** Apple App Store review feeds

**Planned:**
- App Store Connect API (official Apple integration)
- Google Play Console API
- Slack notifications
- Email alerts

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   USER AUTHENTICATION FLOW                  │
└─────────────────────────────────────────────────────────────┘

1. User navigates to application
   ↓
2. Redirected to /login if not authenticated
   ↓
3. Email + Password Authentication (Supabase Auth)
   ↓
4. JWT Token Generated
   ├─> access_token (short-lived)
   └─> refresh_token (long-lived)
   ↓
5. Check if MFA Enabled
   ├─> YES → Require TOTP Verification → Dashboard
   └─> NO → Check MFA Grace Period
       ├─> Grace Period Active → Show Banner → Dashboard
       └─> Grace Period Expired → Force MFA Setup → Dashboard
   ↓
6. Session Security Monitoring Starts
   ├─> Idle Timeout: 15 minutes
   ├─> Absolute Timeout: 8 hours
   └─> Activity Tracking: Mouse, keyboard, touch, scroll
   ↓
7. User Access Granted to Dashboard V2
```

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
- Session extension: Click "Stay Logged In" to reset timer
- Forced logout: After idle or absolute timeout expires
- Audit log entry: Session start/end/timeout recorded

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
-- mfa_enforcement table tracks admin user MFA status
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
- Duration: 30 days from November 8, 2025
- Expiration: December 8, 2025 (past in production)
- Reminders: Daily banner on dashboard
- Enforcement: Hard block after expiration

**Setup Flow:**
1. Admin user logs in without MFA
2. Banner appears: "MFA Required - X days remaining"
3. User clicks "Set Up MFA" → Navigates to `/settings`
4. QR code generated with TOTP secret
5. User scans with authenticator app
6. User enters 6-digit code to verify
7. MFA enabled, grace period cleared
8. Future logins require TOTP code

### Authorization Model

#### Single Source of Truth: `user_roles` Table

**Status:** ACTIVE (migrated December 5, 2025)
**Replaces:** `org_users` table (deprecated)

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

#### Unified Permission View

**Purpose:** Stable API contract between backend and frontend

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
- Computed boolean flags (is_super_admin, is_org_admin)
- Organization metadata (name, slug) included
- Frontend isolated from table structure changes

#### Frontend Permission Hook

**Primary Authorization Method:** `usePermissions()` hook

**Location:** `/src/hooks/usePermissions.ts`

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

**Usage Pattern:**
```typescript
function DashboardPage() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <Loading />;
  if (!permissions?.isOrgAdmin) return <Navigate to="/no-access" />;

  return (
    <Dashboard
      organizationId={permissions.organizationId}
      role={permissions.role}
    />
  );
}
```

**Important Note:** The `authorize` Edge Function exists but is **NOT actively used** in production. The `usePermissions()` hook provides faster, more efficient permission checks by querying the database directly.

### Role Hierarchy and Permissions

#### Role Definitions

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

#### Permission Comparison Matrix

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

---

## Database Architecture

### Core Tables

#### 1. `organizations` (Multi-Tenant Registry)

**Purpose:** Central registry for all tenants in the system

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

-- Indexes
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

**Known Organizations:**
| ID | Name | Slug | Tier | Apps |
|----|------|------|------|------|
| `7cccba3f-0a8f-446f-9dba-86e9cb68c92b` | Yodel Mobile | yodel-mobile | enterprise | 30 (via clients) |
| `550e8400-e29b-41d4-a716-446655440002` | Demo Analytics | demo-analytics | demo | 10 |
| `11111111-1111-1111-1111-111111111111` | Next | next | demo | 5 |

**Settings JSONB Examples:**
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

#### 2. `user_roles` (SSOT for Authorization)

**Status:** ACTIVE (Primary authorization table)
**RLS:** Enabled

```sql
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

#### 3. `org_app_access` (App Scoping)

**Purpose:** Maps organizations to BigQuery app IDs for data access control

**RLS:** Enabled
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

-- Indexes
CREATE INDEX idx_org_app_access_org ON org_app_access(organization_id);
CREATE INDEX idx_org_app_access_app ON org_app_access(app_id);
CREATE INDEX idx_org_app_access_active ON org_app_access(organization_id, app_id)
  WHERE detached_at IS NULL;
```

**Critical Fix Applied (November 2025):**
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

#### 4. `agency_clients` (Multi-Tenant Cross-Access)

**Purpose:** Agency → Client relationships for cross-tenant access

**RLS:** Enabled

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

#### 5. `audit_logs` (SOC 2 Compliance)

**Purpose:** Immutable audit trail for compliance

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

-- Indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
```

**Logging Function:**
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

**Common Actions Logged:**
- `login` / `logout` / `session_timeout`
- `view_dashboard_v2` / `view_reviews`
- `mfa_enabled` / `mfa_verified`
- `app_attached` / `app_detached`
- `permission_changed` (planned)

**Query Examples:**
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

#### 6. `mfa_enforcement` (MFA Tracking)

**Purpose:** Track MFA enrollment for admin users

**RLS:** Enabled

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

-- Index
CREATE INDEX idx_mfa_enforcement_grace ON mfa_enforcement(grace_period_ends_at)
  WHERE mfa_enabled_at IS NULL AND grace_period_ends_at IS NOT NULL;
```

**Usage Pattern:**
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
```

#### 7. `encryption_keys` (Optional Defense-in-Depth)

**Purpose:** Application-level encryption key management

**RLS:** Enabled (service_role only)
**Status:** Infrastructure-level encryption sufficient (not actively used)

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

-- RLS: Only service_role can access
CREATE POLICY "service_role_only"
ON encryption_keys FOR ALL
TO service_role
USING (true);
```

**Note:** Migration created but not actively used. Supabase infrastructure-level AES-256 encryption is sufficient for current compliance needs.

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CORE DATABASE ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────┘

auth.users                    organizations
┌──────────────┐              ┌───────────────────────┐
│ id (PK)      │              │ id (PK)               │
│ email        │              │ name                  │
│ encrypted_pw │              │ slug (UNIQUE)         │
└──────┬───────┘              │ tier                  │
       │                      │ max_apps              │
       │                      │ settings (JSONB)      │
       │                      │ is_active             │
       │                      └───────┬───────────────┘
       │                              │
       │         user_roles           │
       │         ┌──────────────────┐ │
       └────────►│ user_id (PK/FK) ├─┘
                 │ organization_id │◄────┐
                 │ role (app_role) │     │
                 └────────┬────────┘     │
                          │              │
        ┌─────────────────┼──────────────┼──────────────┐
        │                 │              │              │
        ▼                 ▼              ▼              │
  audit_logs      mfa_enforcement  org_app_access      │
  ┌─────────┐     ┌──────────┐    ┌──────────────┐    │
  │user_id  │     │user_id   │    │organization_id├────┤
  │org_id   │     │role      │    │app_id        │    │
  │action   │     │grace_ends│    │attached_at   │    │
  └─────────┘     └──────────┘    │detached_at   │    │
                                  └──────────────┘    │
                                                       │
                        agency_clients                 │
                        ┌────────────────────┐         │
                        │agency_org_id (FK)  ├─────────┤
                        │client_org_id (FK)  ├─────────┘
                        │is_active           │
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

### Database Security Functions

#### `sec.is_super_admin()` - Super Admin Check

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

#### `can_access_organization()` - Organization Access Check

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

**Usage Examples:**
```sql
-- Check if current user can access organization
SELECT can_access_organization('7cccba3f-0a8f-446f-9dba-86e9cb68c92b');

-- Get all accessible organizations for user
SELECT * FROM organizations
WHERE can_access_organization(id);
```

---

## Data Pipeline

### Complete 7-Layer Architecture

The data pipeline moves ASO analytics data from BigQuery to Dashboard V2 through seven distinct processing layers, each with specific responsibilities.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     DATA PIPELINE ARCHITECTURE                           │
└──────────────────────────────────────────────────────────────────────────┘

LAYER 1: BigQuery (Raw Data Source)
┌────────────────────────────────────────────┐
│ Project: aso-reporting-1                   │
│ Dataset: client_reports                    │
│ Table:   aso_all_apple                     │
│ Schema:  7 columns (date, app_id, etc.)    │
└────────────┬───────────────────────────────┘
             │ OAuth2 + Service Account
             ↓
LAYER 2: Edge Function (bigquery-aso-data)
┌────────────────────────────────────────────┐
│ Authentication: JWT validation             │
│ Authorization: RLS policy check            │
│ Org Scoping: User/super admin/agency       │
│ Agency Expansion: Join agency_clients      │
│ App Validation: org_app_access check       │
│ Query Execution: Parameterized BigQuery    │
│ Audit Logging: SOC 2 compliance            │
│ Hot Cache: 30s TTL                         │
└────────────┬───────────────────────────────┘
             │ HTTP POST (JSON)
             ↓
LAYER 3: React Query (Client-Side Cache)
┌────────────────────────────────────────────┐
│ Hook: useEnterpriseAnalytics               │
│ Stale-While-Revalidate: 30min TTL          │
│ Loading/Error States: Managed              │
│ Refetch on Focus: Disabled                 │
│ Query Key: [org, dateRange] only           │
└────────────┬───────────────────────────────┘
             │ useMemo transformation
             ↓
LAYER 4: Data Transformation
┌────────────────────────────────────────────┐
│ Client-Side Filtering: App + traffic       │
│ Summary Aggregation: calculateSummary()    │
│ Time Series: filterTimeseries()            │
│ Complete Date Range: No sparse dates       │
│ Safe Division: CVR calculations            │
└────────────┬───────────────────────────────┘
             │ React state
             ↓
LAYER 5: Component State Management
┌────────────────────────────────────────────┐
│ Component: ReportingDashboardV2.tsx        │
│ Filter State: dateRange, appIds, sources   │
│ Derived KPIs: Two-path metrics             │
│ ASO Intelligence: Stability, opportunities │
└────────────┬───────────────────────────────┘
             │ Props cascade
             ↓
LAYER 6: Presentation Components
┌────────────────────────────────────────────┐
│ AsoMetricCard: KPI display                 │
│ KpiTrendChart: Time series charts          │
│ TrafficSourceChart: Breakdown visualization│
│ ConversionFunnel: Funnel analysis          │
└────────────┬───────────────────────────────┘
             │ User interaction
             ↓
LAYER 7: User Interface (Browser)
┌────────────────────────────────────────────┐
│ Dashboard: /dashboard-v2                   │
│ User sees: Metrics, trends, insights       │
└────────────────────────────────────────────┘
```

### Layer 1: BigQuery (Raw Data Source)

**Configuration:**
- **Project:** `aso-reporting-1`
- **Dataset:** `client_reports`
- **Table:** `aso_all_apple` (changed from `aso_organic_apple` in Nov 2025)
- **Access:** Service Account with BigQuery Data Viewer role

**Schema (7 Columns):**
```
┌─────────────────────┬──────────┬────────────────────────────────┐
│ Column              │ Type     │ Description                    │
├─────────────────────┼──────────┼────────────────────────────────┤
│ date                │ DATE     │ Metric date (YYYY-MM-DD)       │
│ app_id              │ STRING   │ App identifier                 │
│ client              │ STRING   │ Client/org name (fallback)     │
│ traffic_source      │ STRING   │ Acquisition channel            │
│ impressions         │ INTEGER  │ Product page impressions       │
│ product_page_views  │ INTEGER  │ Distinct page views            │
│ downloads           │ INTEGER  │ App installations              │
│ conversion_rate     │ FLOAT    │ downloads / product_page_views │
└─────────────────────┴──────────┴────────────────────────────────┘
```

**Raw Data Example:**
```
date=2024-11-14 | app_id=Mixbook | traffic_source=App Store Search |
impressions=15000 | product_page_views=5000 | downloads=750 | conversion_rate=0.15
```

**Cost & Performance:**
- Query cost: ~$5/TB scanned
- Typical latency: 200-500ms
- Cached queries: Significantly faster

### Layer 2: Edge Function (bigquery-aso-data)

**Location:** `/supabase/functions/bigquery-aso-data/index.ts` (808 lines)
**Runtime:** Deno v1.77.0
**Deployment:** Supabase Edge Network

#### Request Flow (16 Steps)

```typescript
// 1. CORS preflight handling
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}

// 2. Parse request body
const {
  organization_id,  // or org_id, or organizationId (backwards compat)
  app_ids,         // or selectedApps
  date_range,      // or dateRange
  trafficSources   // optional filter (not in cache key)
} = await req.json();

// 3. Authenticate user (JWT from Authorization header)
const { data: { user }, error: userError } =
  await supabaseClient.auth.getUser();

// 4. Check if user is super admin
const { data: isSuperAdmin } =
  await supabaseClient.rpc('is_super_admin');

// 5. Resolve organization context
if (isSuperAdmin && !requestedOrgId) {
  return { error: "Platform admin must select an organization" };
}
const resolvedOrgId = isSuperAdmin ? requestedOrgId : userOrgId;

// 6. Check for agency relationships
const { data: managedClients } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId)
  .eq("is_active", true);

// 7. Expand organizations to query (agency + clients)
let organizationsToQuery = [resolvedOrgId];
if (managedClients?.length > 0) {
  const clientOrgIds = managedClients.map(m => m.client_org_id);
  organizationsToQuery = [resolvedOrgId, ...clientOrgIds];
}

// 8. Get app access for ALL organizations
const { data: accessData } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)
  .is("detached_at", null);
// → RLS policy "users_read_app_access" applies automatically

// 9. Filter to allowed apps only
const allowedAppIds = accessData.map(item => item.app_id);
const appIdsForQuery = requestedAppIds.length > 0
  ? requestedAppIds.filter(id => allowedAppIds.includes(id))
  : allowedAppIds;

// 10. Check hot cache (30s TTL)
const cacheKey = generateCacheKey(
  resolvedOrgId, appIdsForQuery, startDate, endDate, trafficSources
);
const cachedResponse = getCachedData(cacheKey);
if (cachedResponse) {
  return cachedResponse; // Skip BigQuery query
}

// 11. Execute BigQuery query
const query = `
  SELECT
    date,
    COALESCE(app_id, client) AS app_id,
    traffic_source,
    impressions,
    product_page_views,
    downloads,
    SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
  FROM \`${projectId}.client_reports.aso_all_apple\`
  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
  ORDER BY date DESC
`;

// 12. Query available traffic sources (separate query)
const trafficSourceQuery = `
  SELECT DISTINCT traffic_source
  FROM \`${projectId}.client_reports.aso_all_apple\`
  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
    AND date BETWEEN @start_date AND @end_date
`;

// 13. Map BigQuery rows to response format
const mappedData = mapBigQueryRows(jobResponse.rows);

// 14. Cache response for 30 seconds
setCachedData(cacheKey, responsePayload);

// 15. Audit log (SOC 2 compliance)
console.log("[AUDIT]", JSON.stringify({
  request_id: requestId,
  timestamp: new Date().toISOString(),
  org_id: resolvedOrgId,
  user_id: user.id,
  app_ids: appIdsForQuery,
  date_range: { start: startDate, end: endDate },
  duration_ms: queryDurationMs,
  cache_hit: false,
  row_count: mappedData.length,
}));

// 16. Return response
return new Response(JSON.stringify(responsePayload), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
```

#### Response Payload Structure

```typescript
{
  data: BigQueryDataPoint[],  // Mapped rows from BigQuery
  scope: {
    organization_id: string,
    org_id: string,  // Duplicate for backwards compat
    app_ids: string[],
    date_range: { start: string, end: string },
    scope_source: "user_membership" | "platform_admin_selection",
    metrics: null,
    traffic_sources: null
  },
  meta: {
    request_id: string,
    timestamp: string,
    data_source: "bigquery",
    row_count: number,
    app_ids: string[],
    app_count: number,
    query_duration_ms: number,
    org_id: string,
    discovery_method: "user_membership" | "agency_expansion",
    discovered_apps: number,
    available_traffic_sources: string[],
    all_accessible_app_ids: string[],
    total_accessible_apps: number
  }
}
```

#### Security Features

- JWT authentication on every request
- RLS policy enforcement via `org_app_access`
- Agency relationship validation
- SQL injection prevention (parameterized queries)
- Audit logging (every request logged)
- Rate limiting (Supabase Edge Function limits)

### Layer 3: React Query (Client-Side Caching)

**Hook:** `useEnterpriseAnalytics`
**Location:** `/src/hooks/useEnterpriseAnalytics.ts`
**Library:** @tanstack/react-query v5

#### Query Configuration

```typescript
const query = useQuery<EnterpriseAnalyticsResponse, Error>({
  queryKey: [
    'enterprise-analytics-v3',  // Version for client-side filtering
    organizationId,
    dateRange.start,
    dateRange.end,
    // IMPORTANT: appIds and trafficSources NOT in cache key
    // This allows instant filter changes without server refetch
  ],

  queryFn: async () => {
    const { data: response, error } = await supabase.functions.invoke(
      'bigquery-aso-data',
      {
        body: {
          org_id: organizationId,
          date_range: dateRange,
          // NO app_ids or traffic_source filters sent to server
          // Server returns ALL data, client filters as needed
        }
      }
    );

    if (error) throw error;
    return response;
  },

  enabled: !!organizationId && !!dateRange.start && !!dateRange.end,
  staleTime: 30 * 60 * 1000,      // 30 minutes
  gcTime: 60 * 60 * 1000,         // 60 minutes
  retry: 2,
  refetchOnWindowFocus: false,    // Disabled for performance
});
```

#### Caching Behavior

| Event | Behavior | Reason |
|-------|----------|--------|
| Initial load | Fetch from Edge Function (500ms) | Cache empty |
| Change app filter | **NO refetch** (~5ms useMemo) | Client-side filtering |
| Change traffic source | **NO refetch** (~5ms useMemo) | Client-side filtering |
| Change date range | **Refetch** (500ms) | New cache key |
| Change organization | **Refetch** (500ms) | New cache key |
| 30 minutes pass | Stale, refetch on next access | Analytics data updates daily |
| Window focus | **NO refetch** | Disabled for performance |
| Re-open tab (<30 min) | Use cached data (~50ms) | Stale-while-revalidate |

**Performance Impact:**
- App/traffic filter changes: **100x faster** (500ms → 5ms)
- Dashboard refresh: **50x faster** (500ms → 10ms)
- Re-open tab: **10x faster** (500ms → 50ms)

### Layer 4: Data Transformation Layer

**Location:** `useEnterpriseAnalytics` hook (client-side)
**Purpose:** Filter and aggregate data without server round-trips

#### Transformation Pipeline

```typescript
const filteredData = useMemo(() => {
  if (!query.data) return null;

  const data = query.data as EnterpriseAnalyticsResponse;

  // PHASE 1: Check if filters applied
  const hasAppFilter = appIds.length > 0;
  const hasTrafficFilter = trafficSources.length > 0;

  if (!hasAppFilter && !hasTrafficFilter) {
    return data; // No filtering needed
  }

  // PHASE 2: Filter raw data
  let filteredRawData = data.rawData;

  if (hasAppFilter) {
    filteredRawData = filteredRawData.filter((row: BigQueryDataPoint) =>
      appIds.includes(row.app_id)
    );
  }

  if (hasTrafficFilter) {
    filteredRawData = filteredRawData.filter((row: BigQueryDataPoint) =>
      trafficSources.includes(row.traffic_source)
    );
  }

  // PHASE 3: Recalculate aggregations
  return {
    ...data,
    rawData: filteredRawData,
    processedData: {
      ...data.processedData,
      summary: calculateSummary(filteredRawData),
      timeseries: filterTimeseries(filteredRawData, dateRange),
      traffic_sources: data.processedData.traffic_sources.filter(ts =>
        !hasTrafficFilter || trafficSources.includes(ts.traffic_source)
      )
    }
  };
}, [query.data, appIds, trafficSources, dateRange]);
```

#### Helper Functions

##### calculateSummary()

```typescript
function calculateSummary(data: BigQueryDataPoint[]): ProcessedSummary {
  // Aggregate totals
  const totals = data.reduce((acc, row) => ({
    impressions: acc.impressions + (row.impressions || 0),
    installs: acc.installs + (row.downloads || 0),
    downloads: acc.downloads + (row.downloads || 0),
    product_page_views: acc.product_page_views + (row.product_page_views || 0)
  }), { impressions: 0, installs: 0, downloads: 0, product_page_views: 0 });

  // Safe division for CVR
  const cvr = totals.impressions > 0
    ? (totals.installs / totals.impressions) * 100
    : 0;

  return {
    impressions: { value: totals.impressions, delta: 0 },
    installs: { value: totals.installs, delta: 0 },
    downloads: { value: totals.downloads, delta: 0 },
    product_page_views: { value: totals.product_page_views, delta: 0 },
    cvr: { value: cvr, delta: 0 },
    conversion_rate: { value: cvr, delta: 0 }
  };
}
```

##### filterTimeseries()

```typescript
function filterTimeseries(
  data: BigQueryDataPoint[],
  dateRange: DateRange
): ProcessedTimeSeriesPoint[] {
  // CRITICAL: Generate ALL dates in range first (prevents sparse dates)
  const allDates: string[] = [];
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    allDates.push(d.toISOString().split('T')[0]);
  }

  // Initialize all dates with zero values
  const grouped: Record<string, any> = {};
  allDates.forEach(date => {
    grouped[date] = {
      date,
      impressions: 0,
      installs: 0,
      downloads: 0,
      product_page_views: 0
    };
  });

  // Aggregate data for dates that have rows
  data.forEach((row: BigQueryDataPoint) => {
    const date = row.date;
    if (grouped[date]) {
      grouped[date].impressions += row.impressions ?? 0;
      grouped[date].installs += row.downloads ?? 0;
      grouped[date].downloads += row.downloads ?? 0;
      grouped[date].product_page_views += row.product_page_views ?? 0;
    }
  });

  // Calculate CVR for each day (safe division)
  return Object.values(grouped).map((day: any) => ({
    ...day,
    conversion_rate: day.impressions > 0
      ? (day.installs / day.impressions) * 100
      : 0,
    cvr: day.impressions > 0
      ? (day.installs / day.impressions) * 100
      : 0
  })).sort((a: any, b: any) => a.date.localeCompare(b.date));
}
```

**Why Generate ALL Dates?**
- BigQuery returns only dates with data (sparse)
- Charts need complete date range (no gaps)
- Zero values for missing dates prevent chart breaks
- ASO Intelligence Layer requires complete time series

### Layer 5: Component State Management

**Component:** `ReportingDashboardV2.tsx`
**Location:** `/src/pages/ReportingDashboardV2.tsx`
**Lines:** 500+ lines

#### State Variables

```typescript
// Filter State
const [dateRange, setDateRange] = useState({
  start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  end: format(new Date(), 'yyyy-MM-dd')
});
const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
const [selectedTrafficSources, setSelectedTrafficSources] = useState<string[]>([]);

// Available Apps (from useAvailableApps hook)
const { data: availableApps = [], isLoading: appsLoading } = useAvailableApps();

// Analytics Data (from useEnterpriseAnalytics hook)
const { data, isLoading, error, refetch } = useEnterpriseAnalytics({
  organizationId: organizationId || '',
  dateRange,
  trafficSources: selectedTrafficSources,
  appIds: selectedAppIds
});

// Period Comparison Data (for deltas)
const { data: comparisonData, isLoading: isComparisonLoading } =
  usePeriodComparison(
    organizationId || '',
    dateRange,
    selectedAppIds,
    !!organizationId && !isLoading
  );
```

#### Derived Calculations

```typescript
// Two-Path Metrics (Search vs Browse)
const twoPathMetrics = useMemo(() => {
  if (!data?.rawData) return null;
  return calculateTwoPathMetricsFromData(data.rawData);
}, [data?.rawData]);

// Derived KPIs (Efficiency, Reach, Conversion)
const derivedKPIs = useMemo(() => {
  if (!data?.rawData) return null;
  return calculateDerivedKPIs({
    impressions: data.processedData.summary.impressions.value,
    downloads: data.processedData.summary.downloads.value,
    product_page_views: data.processedData.summary.product_page_views.value,
    cvr: data.processedData.summary.cvr.value
  });
}, [data]);

// ASO Intelligence (Stability, Opportunity Maps)
const stabilityScore = useMemo(() => {
  if (!data?.processedData.timeseries) return null;
  return calculateStabilityScore(data.processedData.timeseries);
}, [data?.processedData.timeseries]);

const opportunityMap = useMemo(() => {
  if (!data?.processedData.traffic_sources) return null;
  return calculateOpportunityMap(data.processedData.traffic_sources);
}, [data?.processedData.traffic_sources]);
```

### Layer 6: Presentation Components

**Component Hierarchy:**
```
ReportingDashboardV2
├── DateRangePicker (date selection)
├── CompactAppSelector (dual-mode: single/compare)
│   ├── SegmentedControl (mode switch)
│   ├── Recent Apps Section
│   └── Apply/Cancel buttons (compare mode)
├── CompactTrafficSourceSelector (multi-select)
├── AsoMetricCard (Search & Browse KPIs)
│   ├── Metric value + delta
│   ├── Trend indicator
│   └── Mini sparkline
├── KpiTrendChart (time series visualization)
│   └── Recharts AreaChart
├── TrafficSourceComparisonChart
│   └── Recharts BarChart
├── ConversionFunnelChart
│   └── Custom funnel visualization
├── TwoPathFunnelCard (Search vs Browse)
│   └── Side-by-side funnel comparison
├── DerivedKpiGrid
│   └── Efficiency, Reach, Conversion metrics
├── StabilityScoreCard
│   └── Volatility analysis
└── OpportunityMapCard
    └── Growth opportunity heatmap
```

### Layer 7: User Interface (Browser)

**Production URL:** `/dashboard-v2` (default landing page for Yodel Mobile users)

**User Sees:**
- ASO Organic Visibility metrics (impressions, downloads, CVR)
- Search vs Browse performance (two-path funnel)
- Traffic source breakdown (search, browse, referrer, etc.)
- Time series trends (daily metrics over date range)
- Conversion funnel (impressions → PPV → downloads)
- Derived KPIs (efficiency, reach, conversion)
- Stability scores (volatility analysis)
- Opportunity maps (growth opportunities)

### Three-Layer Caching Strategy

```
┌──────────────────────────────────────────────────────────┐
│ LAYER 1: Edge Function Hot Cache (30 seconds)           │
│ Purpose: Reduce BigQuery costs                          │
│ Scope:   Per org + apps + date range                    │
│ Key:     `${orgId}:${apps}:${startDate}:${endDate}`    │
│ Eviction: Time-based (30s)                              │
│ Hit Rate: ~60-70% (dashboard refresh, etc.)             │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ LAYER 2: React Query Cache (30 minutes)                 │
│ Purpose: Instant UI updates, background refetch         │
│ Scope:   Per org + date range (NO apps/sources in key)  │
│ Key:     ['enterprise-analytics-v3', orgId, dates]      │
│ Behavior: Serve stale instantly, refetch in background  │
│ Hit Rate: ~80-90% (same session, filter changes)        │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ LAYER 3: Client-Side Memo (React useMemo)               │
│ Purpose: Avoid redundant calculations                   │
│ Scope:   Per query.data + appIds + trafficSources       │
│ Behavior: Recalculate only when dependencies change     │
│ Hit Rate: ~95-99% (component re-renders)                │
└──────────────────────────────────────────────────────────┘
```

**Cost Impact:**
- Without caching: $100-150/month (5-7x more BigQuery queries)
- With 3-layer caching: $12-25/month (current production)

### Agency Multi-Tenant Support

#### Agency Architecture

```
Yodel Mobile (Agency)
├── Organization ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
├── Direct Apps: 0 (agency doesn't own apps)
├── Managed Clients: 3
│   ├── Client 1 (dbdb0cc5...) → 23 apps
│   ├── Client 2 (550e8400...) → 5 apps
│   └── Client 3 (f47ac10b...) → 2 apps
└── Total Accessible Apps: 30 (23 + 5 + 2)
```

#### Agency Expansion Logic

```typescript
// Edge Function: Automatic client expansion
const { data: managedClients } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId)  // Yodel Mobile
  .eq("is_active", true);

if (managedClients && managedClients.length > 0) {
  const clientOrgIds = managedClients.map(m => m.client_org_id);
  organizationsToQuery = [resolvedOrgId, ...clientOrgIds];
  // → [Yodel Mobile, Client 1, Client 2, Client 3]
}

// Query org_app_access for ALL organizations
const { data: accessData } = await supabaseClient
  .from("org_app_access")
  .select("app_id")
  .in("organization_id", organizationsToQuery)
  .is("detached_at", null);
// → Returns apps from all 4 organizations
// → RLS policy automatically handles agency relationships
```

#### Agency User Flow

```
1. CLI User (cli@yodelmobile.com) logs in
   ↓
2. Edge Function: Check user_roles table
   → Role: ORG_ADMIN
   → Organization: Yodel Mobile (7cccba3f...)
   ↓
3. Edge Function: Check agency_clients table
   → agency_org_id = 7cccba3f... (Yodel Mobile)
   → client_org_ids = [dbdb0cc5..., 550e8400..., f47ac10b...]
   ↓
4. Edge Function: Build organizationsToQuery
   → [7cccba3f..., dbdb0cc5..., 550e8400..., f47ac10b...]
   ↓
5. Edge Function: Query org_app_access
   → .in("organization_id", organizationsToQuery)
   → RLS policy "users_read_app_access" applies
   ↓
6. RLS Policy: Check if user can access each row
   → User in Yodel Mobile? YES
   → Yodel Mobile is agency for Client 1? YES
   → Yodel Mobile is agency for Client 2? YES
   → Yodel Mobile is agency for Client 3? YES
   ↓
7. Result: Return all 30 apps from all 4 organizations
   ↓
8. Dashboard V2: Display all 30 apps in app selector
```

### Performance Metrics

**Query Performance (Production):**
| Metric | Value | Notes |
|--------|-------|-------|
| BigQuery Query Time | 200-500ms | Depends on date range and app count |
| Edge Function Processing | 50-100ms | Auth, RLS, serialization |
| Total Backend Latency | 250-600ms | BigQuery + Edge Function |
| React Query Cache Hit | ~5-10ms | Instant from memory |
| Client-Side Filtering | ~1-5ms | useMemo recalculation |
| Full Page Load (Cold) | ~800ms | Backend + React render |
| Full Page Load (Warm) | ~50ms | Cached data |

**Data Volume (Typical):**
- Apps per Org: 5-10 apps (30 for agency)
- Date Range: 30 days default
- Traffic Sources: 3-5 sources
- Rows Returned: 100-500 rows
- Response Size: 50-200 KB

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/              # Reusable UI components
│   ├── auth/               # Authentication components
│   │   ├── SessionSecurityProvider.tsx
│   │   ├── SessionTimeoutWarning.tsx
│   │   ├── MFASetup.tsx
│   │   ├── MFAVerification.tsx
│   │   └── MFAGracePeriodBanner.tsx
│   ├── ui/                 # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (20+ components)
│   ├── analytics/          # Chart components
│   │   ├── AsoMetricCard.tsx
│   │   ├── KpiTrendChart.tsx
│   │   ├── TrafficSourceChart.tsx
│   │   └── ConversionFunnelChart.tsx
│   └── dashboard/          # Dashboard-specific components
│       ├── CompactAppSelector.tsx
│       ├── CompactTrafficSourceSelector.tsx
│       └── DateRangePicker.tsx
├── context/                # React Context providers
│   ├── AuthContext.tsx
│   ├── AppContext.tsx
│   └── BigQueryAppContext.tsx
├── hooks/                  # Custom React hooks
│   ├── usePermissions.ts           # PRIMARY permission check
│   ├── useEnterpriseAnalytics.ts   # Dashboard V2 data
│   ├── useSessionSecurity.ts       # Session timeout logic
│   ├── useAvailableApps.ts         # App list for selector
│   └── usePeriodComparison.ts      # Delta calculations
├── integrations/           # External service clients
│   └── supabase/
│       └── client.ts
├── layouts/                # Page layouts
│   └── MainLayout.tsx
├── pages/                  # Route components
│   ├── ReportingDashboardV2.tsx    # PRIMARY production page
│   ├── growth-accelerators/
│   │   └── reviews.tsx              # Reviews page
│   ├── SecurityMonitoring.tsx       # Admin security dashboard
│   └── settings.tsx                 # MFA setup, profile
├── lib/                    # Utility functions
│   └── utils.ts
├── types/                  # TypeScript type definitions
│   └── index.ts
└── App.tsx                 # Root component with providers
```

### Context Provider Hierarchy

**Correct Provider Order (Critical for Functionality):**

```tsx
// App.tsx structure
<QueryClientProvider client={queryClient}>
  <TooltipProvider>
    <BrowserRouter>
      <AuthProvider>                    // 1. User authentication (outermost)
        <SessionSecurityProvider>       // 2. Session timeouts
          <SuperAdminProvider>          // 3. Super admin detection
            <BigQueryAppProvider>       // 4. App access data
              <AsoDataProvider>         // 5. ASO data context
                <AppProvider>           // 6. General app state
                  <Routes />
                </AppProvider>
              </AsoDataProvider>
            </BigQueryAppProvider>
          </SuperAdminProvider>
        </SessionSecurityProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
</QueryClientProvider>
```

**Provider Order Rationale:**
1. `QueryClientProvider` - Must be outermost for React Query
2. `AuthProvider` - User context needed by all other providers
3. `SessionSecurityProvider` - Depends on AuthProvider for user
4. `SuperAdminProvider` - Depends on user for role check
5. `BigQueryAppProvider` - Depends on user for org_app_access lookup
6. Other providers - Feature-specific context

### Key Hooks

#### usePermissions() - Primary Authorization Hook

**Purpose:** Centralized permission checking for entire application

**Location:** `/src/hooks/usePermissions.ts`

**Returns:**
```typescript
{
  permissions: {
    userId: string,
    organizationId: string | null,     // Current org UUID
    orgName: string | null,            // Organization name
    role: string | null,               // User's role
    isSuperAdmin: boolean,             // Platform-wide access
    isOrgAdmin: boolean,               // Org-level admin
    isOrgScoped: boolean,              // Has organization
    roleSource: string,                // 'user_roles'
    effectiveRole: string,             // Computed role (lowercase)
    availableOrgs: Array<{id, name, slug}>
  },
  isLoading: boolean,
  error: Error | null
}
```

**Usage Pattern:**
```typescript
function ProtectedPage() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <Loading />;
  if (!permissions?.isOrgAdmin) return <Navigate to="/no-access" />;

  return <AdminContent orgId={permissions.organizationId} />;
}
```

#### useEnterpriseAnalytics() - Dashboard V2 Data Hook

**Purpose:** BigQuery analytics data retrieval with client-side filtering

**Location:** `/src/hooks/useEnterpriseAnalytics.ts`

**Features:**
- Triple filtering: organization → apps → traffic sources
- Direct Edge Function integration
- Client-side filtering (no server refetch on filter change)
- Error handling and loading states
- Stale-while-revalidate caching

**Usage:**
```typescript
const { data, isLoading, error } = useEnterpriseAnalytics({
  organizationId: permissions.organizationId,
  dateRange: { start: '2025-01-01', end: '2025-01-31' },
  trafficSources: ['search', 'browse'],  // Optional client-side filter
  appIds: ['app1', 'app2']               // Optional client-side filter
});
```

**Response Structure:**
```typescript
{
  rawData: BigQueryDataPoint[],  // Raw rows from BigQuery
  processedData: {
    summary: {
      impressions: { value: number, delta: number },
      downloads: { value: number, delta: number },
      product_page_views: { value: number, delta: number },
      cvr: { value: number, delta: number }
    },
    timeseries: Array<{
      date: string,
      impressions: number,
      downloads: number,
      product_page_views: number,
      cvr: number
    }>,
    traffic_sources: Array<{
      traffic_source: string,
      impressions: number,
      downloads: number,
      cvr: number
    }>
  },
  meta: {
    raw_rows: number,
    data_source: 'bigquery',
    all_accessible_app_ids: string[],
    query_duration_ms: number
  }
}
```

#### useSessionSecurity() - Session Timeout Management

**Purpose:** Track user activity and enforce session timeouts

**Features:**
- Idle timeout: 15 minutes of inactivity
- Absolute timeout: 8 hours maximum session
- Warning modal: 2 minutes before auto-logout
- Activity tracking: Mouse, keyboard, touch, scroll
- Production-only: Disabled in development

**Usage:**
```typescript
// Automatically active in production via SessionSecurityProvider
// No manual hook call needed - provider wraps entire app
```

### Component Patterns

#### Feature Guard Component

```typescript
// Conditional rendering based on feature access
<FeatureGuard feature="analytics">
  <AnalyticsDashboard />
</FeatureGuard>

// With fallback
<FeatureGuard
  feature="analytics"
  fallback={<UpgradePrompt feature="analytics" />}
>
  <AnalyticsDashboard />
</FeatureGuard>
```

#### Role Guard Component

```typescript
// Conditional rendering based on role
<RoleGuard roles={['org_admin', 'super_admin']}>
  <AdminPanel />
</RoleGuard>

// With fallback
<RoleGuard
  roles={['org_admin', 'super_admin']}
  fallback={<NoAccess />}
>
  <AdminPanel />
</RoleGuard>
```

---

## Backend Services

### Edge Functions (Supabase Deno Runtime)

**Deployment:** Supabase Edge Network
**Runtime:** Deno v1.77.0
**Language:** TypeScript
**Max Execution Time:** 120 seconds

#### 1. bigquery-aso-data (Production)

**Purpose:** Dashboard V2 data retrieval from BigQuery

**Route:** `/functions/v1/bigquery-aso-data`
**Method:** POST
**Authentication:** JWT required
**Authorization:** Checks `org_app_access` table

**Request:**
```typescript
{
  organizationId: string,          // or org_id, or organization_id
  startDate: string,               // YYYY-MM-DD
  endDate: string,                 // YYYY-MM-DD
  trafficSources?: string[],       // Optional filter (not in cache key)
  appIds?: string[]                // Optional filter (not in cache key)
}
```

**Response:**
```typescript
{
  data: BigQueryDataPoint[],
  scope: {
    organization_id: string,
    app_ids: string[],
    date_range: { start: string, end: string },
    scope_source: "user_membership" | "platform_admin_selection"
  },
  meta: {
    request_id: string,
    timestamp: string,
    data_source: "bigquery",
    row_count: number,
    query_duration_ms: number,
    all_accessible_app_ids: string[],
    available_traffic_sources: string[]
  }
}
```

**Security Features:**
- JWT authentication (every request)
- RLS policy enforcement (automatic via `org_app_access`)
- Organization-scoped access
- App-level filtering
- SQL injection prevention (parameterized queries)
- Audit logging (every request logged)
- Rate limiting (Supabase Edge Function limits)

**BigQuery Query:**
```sql
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  impressions,
  product_page_views,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `aso-reporting-1.client_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
  AND date BETWEEN @start_date AND @end_date
ORDER BY date DESC
```

**Critical Fix Applied (November 2025):**
- Changed from `aso_organic_apple` to `aso_all_apple`
- Includes all traffic sources (search, browse, referrer, etc.)
- Enables traffic source filtering in UI

#### 2. authorize (Not Actively Used)

**Purpose:** Centralized permission validation

**Status:** Created but not integrated
**Reason:** Frontend uses `usePermissions()` hook directly (faster)

**Location:** `/supabase/functions/authorize/index.ts`

**Note:** This function exists for potential future use but is **NOT actively used** in production. The `usePermissions()` hook provides faster, more efficient permission checks.

### Shared Utilities

**Location:** `/supabase/functions/_shared/`

#### auth-utils.ts - Permission Resolution

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
        org_id: requested_org_id,  // Override for context
        hasImplicitAccess: true
      };
    }

    return null; // No access
  }

  // Return primary permission
  return allPermissions.sort((a, b) => {
    if (a.is_super_admin && a.is_platform_role) return -1;
    if (b.is_super_admin && b.is_platform_role) return 1;
    if (a.is_org_admin !== b.is_org_admin) return b.is_org_admin ? 1 : -1;
    return 0;
  })[0];
}
```

---

## Security Features

### 1. Row-Level Security (RLS)

**Tables with RLS Enabled:**

| Table | Policy Type | Scope | Super Admin Bypass |
|-------|------------|-------|-------------------|
| `organizations` | SELECT | Own org or super admin | ✅ |
| `user_roles` | ALL | Own roles or super admin | ✅ |
| `org_app_access` | SELECT | Own org apps or agency clients or super admin | ✅ |
| `audit_logs` | INSERT/SELECT | Own org logs or super admin | ✅ |
| `mfa_enforcement` | ALL | Own record or super admin | ✅ |
| `agency_clients` | SELECT | Agency or client org or super admin | ✅ |

#### Example RLS Policies

**Organizations Table:**
```sql
-- Users see their own organization
CREATE POLICY "users_see_own_organization"
ON organizations FOR SELECT TO authenticated
USING (
  id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
  )
);
```

**Org App Access Table (with Agency Support):**
```sql
CREATE POLICY "users_read_app_access"
ON org_app_access FOR SELECT
USING (
  -- User is in this organization
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR
  -- User's organization is an agency managing this client
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

### 2. Encryption

#### Infrastructure Level (Supabase)

**Provider:** Supabase / AWS
**Algorithm:** AES-256
**Scope:** All database tables (automatic)
**Compliance:** GDPR, ISO 27001, SOC 2 certified

**Features:**
- Encryption at rest (all data)
- Encryption in transit (TLS 1.3)
- Automatic key rotation
- Hardware security modules (HSMs)

#### Application Level (Optional)

**Migration:** `20251109030000_enable_pii_encryption.sql`
**Status:** Not actively used (infrastructure encryption sufficient)
**Purpose:** Optional defense-in-depth for Phase 3

**When to Use:**
- Storing sensitive PII (SSN, credit cards, etc.)
- Regulatory requirements for double encryption
- Defense-in-depth security strategy

### 3. Audit Logging

**Coverage:**
- ✅ Dashboard V2 views
- ✅ Login attempts (success/failure)
- ✅ MFA enrollment/verification
- ✅ Session start/end/timeout
- ✅ App access changes (attach/detach)
- ⏳ Permission changes (planned)

**Retention:** 7 years (compliance requirement)

**Audit Log Query Examples:**
```sql
-- Recent user activity
SELECT
  action,
  resource_type,
  status,
  created_at
FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;

-- Failed login attempts (24 hours)
SELECT
  user_email,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempt,
  ARRAY_AGG(DISTINCT ip_address::text) as ip_addresses
FROM audit_logs
WHERE action = 'login'
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 5
ORDER BY attempt_count DESC;

-- Organization dashboard usage (30 days)
SELECT
  o.name as org_name,
  COUNT(*) as view_count,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as day
FROM audit_logs al
JOIN organizations o ON o.id = al.organization_id
WHERE action = 'view_dashboard_v2'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY o.name, DATE_TRUNC('day', created_at)
ORDER BY day DESC, view_count DESC;
```

### 4. Multi-Factor Authentication (MFA)

**Implementation:** TOTP-based (RFC 6238)

**Supported Apps:**
- Google Authenticator
- Authy
- 1Password
- Microsoft Authenticator
- Any RFC 6238 compliant app

**Enforcement:**
```sql
-- Admin users must enable MFA
SELECT
  u.email,
  me.grace_period_ends_at,
  me.mfa_enabled_at,
  CASE
    WHEN me.mfa_enabled_at IS NOT NULL THEN 'Enabled'
    WHEN me.grace_period_ends_at > NOW() THEN 'Grace Period'
    ELSE 'Required'
  END as mfa_status
FROM mfa_enforcement me
JOIN auth.users u ON u.id = me.user_id
WHERE me.role IN ('ORG_ADMIN', 'SUPER_ADMIN');
```

**Setup Flow:**
1. Admin user logs in without MFA
2. Banner appears: "MFA Required - X days remaining"
3. User clicks "Set Up MFA" → Navigates to `/settings`
4. QR code generated with TOTP secret
5. User scans with authenticator app
6. User enters 6-digit code to verify
7. MFA enabled, grace period cleared
8. Future logins require TOTP code

**Security Benefits:**
- Prevents account takeover (even if password compromised)
- Compliance requirement (SOC 2, ISO 27001)
- Industry best practice
- Zero-trust security model

### 5. Session Security

**Configuration (Production Only):**
- **Idle Timeout:** 15 minutes of inactivity
- **Absolute Timeout:** 8 hours maximum session
- **Warning Time:** 2 minutes before auto-logout
- **Activity Tracking:** Mouse, keyboard, touch, scroll events

**Implementation:**
```typescript
// SessionSecurityProvider.tsx
const SessionSecurityProvider = ({ children }) => {
  const { user, signOut } = useAuth();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !user) return;

    // Track activity
    const updateActivity = () => setLastActivity(Date.now());
    const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event =>
      window.addEventListener(event, updateActivity)
    );

    // Check timeouts
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;

      if (idleTime > 15 * 60 * 1000) {  // 15 minutes
        signOut();
        logAuditEvent('session_timeout');
      } else if (idleTime > 13 * 60 * 1000) {  // 13 minutes (warning)
        setShowWarning(true);
      }
    }, 10000);  // Check every 10 seconds

    return () => {
      events.forEach(event =>
        window.removeEventListener(event, updateActivity)
      );
      clearInterval(interval);
    };
  }, [user, lastActivity]);

  return (
    <>
      {children}
      {showWarning && (
        <SessionTimeoutWarning
          onExtend={() => {
            setLastActivity(Date.now());
            setShowWarning(false);
          }}
        />
      )}
    </>
  );
};
```

**User Experience:**
- Activity resets timer (seamless for active users)
- Warning modal 2 minutes before logout
- "Stay Logged In" button extends session
- Forced logout after timeout
- Audit log entry created

### 6. Security Monitoring Dashboard

**Route:** `/admin/security`
**Access:** ORG_ADMIN and SUPER_ADMIN only

**Features:**
1. **Audit Logs Tab:**
   - Last 100 security events
   - Filter by action, status, user
   - Real-time updates

2. **Failed Logins Tab:**
   - 24-hour window
   - Grouped by user email
   - Shows IP addresses and user agents
   - Highlights suspicious activity (5+ attempts)

3. **MFA Status Tab:**
   - Admin user MFA enrollment
   - Grace period tracking
   - Enforcement status

4. **Session Activity Tab:**
   - Active sessions count
   - Session start/timeout events
   - Average session duration

**Query Examples:**
```sql
-- Suspicious failed login attempts
SELECT
  user_email,
  COUNT(*) as attempts,
  COUNT(DISTINCT ip_address) as unique_ips,
  ARRAY_AGG(DISTINCT ip_address::text) as ip_addresses
FROM audit_logs
WHERE action = 'login'
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 5
ORDER BY attempts DESC;
```

---

## Deployment

### Environments

**Production:** `bkbcqocpjahewqjmlgvf.supabase.co`
**Note:** Single environment (no separate staging)

### Deployment Process

#### Frontend Deployment

```bash
# Build for production
npm run build

# Output directory: dist/
# Deploy to hosting provider (Vercel, Netlify, etc.)

# Vercel example:
vercel --prod

# Netlify example:
netlify deploy --prod --dir=dist
```

**Build Configuration:**
```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

#### Database Migrations

```bash
# Link to Supabase project
supabase link --project-ref bkbcqocpjahewqjmlgvf

# Apply all pending migrations
supabase db push

# Apply specific migration
supabase migration up --db-url "postgresql://..."

# Rollback last migration
supabase migration down --db-url "postgresql://..."

# Create new migration
supabase migration new migration_name
```

**Migration Naming Convention:**
```
YYYYMMDDHHMMSS_description.sql

Example:
20251109030000_enable_pii_encryption.sql
```

#### Edge Functions Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy bigquery-aso-data

# Deploy with environment variables
supabase secrets set KEY=VALUE
supabase functions deploy bigquery-aso-data

# View function logs
supabase functions logs bigquery-aso-data --tail
```

**Function Structure:**
```
supabase/functions/
├── bigquery-aso-data/
│   └── index.ts
├── authorize/
│   └── index.ts
└── _shared/
    └── auth-utils.ts
```

### Environment Variables

#### Frontend (.env or .env.production)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Environment
NODE_ENV=production

# Optional Features
VITE_ADMIN_DIAGNOSTICS_ENABLED=false
```

#### Edge Functions (Supabase Dashboard Secrets)

```bash
# Set via Supabase CLI or Dashboard
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase secrets set BIGQUERY_PROJECT_ID=aso-reporting-1
supabase secrets set BIGQUERY_DATASET=client_reports
supabase secrets set BIGQUERY_CREDENTIALS=<json-key-base64>
```

**View Current Secrets:**
```bash
supabase secrets list
```

**Delete Secret:**
```bash
supabase secrets unset SECRET_NAME
```

### CI/CD Pipeline (Recommended)

**GitHub Actions Example:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: vercel/vercel-action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'

  deploy-edge-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

### Migration History

**Recent Migrations (November 2025 - December 2025):**

1. **20251109000000_add_rls_organizations.sql**
   - Enabled RLS on organizations table
   - Created SELECT policies

2. **20251109010000_create_audit_logs.sql**
   - Created audit_logs table
   - Added log_audit_event function
   - Created audit_logs_recent view

3. **20251109020000_add_mfa_enforcement.sql**
   - Created mfa_enforcement table
   - Populated existing admin users with 30-day grace period

4. **20251109030000_enable_pii_encryption.sql**
   - Created encryption infrastructure (optional)
   - Status: Not actively used

5. **20251108110000_cleanup_demo_apps_from_org_app_access.sql**
   - Removed demo app IDs from org_app_access
   - Prevents Dashboard V2 data confusion

6. **20251108100000_fix_org_app_access_rls.sql**
   - Fixed RLS policies on org_app_access

7. **20251108235000_hotfix_restore_view_schema.sql**
   - Fixed user_permissions_unified view schema
   - Restored correct column names (org_id, flags)

8. **20251205000000_consolidate_to_user_roles_ssot.sql**
   - **CRITICAL:** Migrated from dual system to single `user_roles` table
   - Created `user_permissions_unified` view
   - Deprecated `org_users` table

9. **20251221000000_fix_organization_dataset_and_rls.sql**
   - Enhanced organizations table
   - Created baseline organizations
   - Implemented comprehensive RLS policies

---

## Architecture Evolution

### Current: V1 (Production)

This document describes **V1** - the current production system deployed and serving users as of January 19, 2025.

**V1 Characteristics:**
- Direct BigQuery integration (no caching layer between BigQuery and Edge Function)
- `user_roles` table as Single Source of Truth (SSOT)
- RLS-based security on all multi-tenant tables
- Session management (15-min idle, 8-hour absolute)
- Audit logging (7-year retention)
- MFA enforcement for admin users
- Agency multi-tenant support (Yodel Mobile → 3 clients → 30 apps)
- Dashboard V2 as primary production interface
- Three-layer caching (Edge Function 30s + React Query 30min + useMemo)

**Production Status:**
- ✅ Serving real users (Yodel Mobile + managed clients)
- ✅ SOC 2 compliance ready (95%)
- ✅ ISO 27001 compliance (90%)
- ✅ GDPR compliance (85%)
- ✅ Performance optimized (50-800ms page loads)
- ✅ Cost optimized ($12-25/month vs $100-150 without caching)

### Future: V2/V3 (Planned)

Future architecture iterations (V2, V3) will be documented separately when planned/implemented. These versions are **NOT currently in production** and are subject to change based on business requirements.

**Potential Areas of Evolution:**

#### V2 Candidates (Next 6 Months)
- **Feature Flag System:** Full implementation with UI management
- **Advanced Analytics:** Machine learning-powered insights
- **Real-Time Updates:** WebSocket integration for live data
- **Multi-Region Support:** EU data residency for GDPR
- **Enhanced Caching:** Redis layer for shared cache across Edge Function instances
- **Performance Monitoring:** APM integration (Datadog, New Relic)
- **A/B Testing Framework:** Experiment management system

#### V3 Candidates (Next 12 Months)
- **Microservices Architecture:** Separate services for analytics, auth, reporting
- **GraphQL API:** Replace REST Edge Functions with GraphQL
- **Event Sourcing:** Immutable event log for all state changes
- **CQRS Pattern:** Separate read and write models
- **Advanced Security:** Application-level encryption for PII
- **AI-Powered Insights:** ChatGPT integration for ASO recommendations
- **Mobile Apps:** Native iOS/Android apps
- **White-Label Solution:** Rebrandable platform for agencies

**Important Note:** V2/V3 details are intentionally not included in this V1 document to maintain clarity on what is **CURRENTLY in production**. When V2 features are implemented, they will be documented in `ARCHITECTURE_V2.md`.

### Upgrade Path Considerations

**When moving from V1 to V2:**
- Maintain backwards compatibility for 6 months minimum
- Feature flags control rollout of V2 features
- Gradual migration (not big-bang)
- A/B testing for critical features
- Performance benchmarking (V1 vs V2)
- User feedback loops

**Breaking Changes Allowed in V2:**
- Database schema changes (with migrations)
- API contract changes (with deprecation warnings)
- Authentication flow changes (with grace period)
- UI redesigns (with opt-in period)

**No Breaking Changes for V2:**
- Data loss
- Security downgrades
- Performance regressions
- Compliance violations

---

## Key Design Decisions

### Why `user_roles` as SSOT?

**Previous:** Multiple tables (`org_users`, `user_permissions`, etc.)
**Current:** Single `user_roles` table

**Reason:**
- Eliminated data inconsistencies between tables
- Simplified permission queries (single JOIN vs multiple)
- Single source of truth reduces bugs
- Easier to maintain and audit
- Clear ownership of role data

**Impact:**
- Migration from `org_users` to `user_roles` (December 5, 2025)
- All permission checks now use `user_permissions_unified` view
- Frontend and backend aligned on single data source

### Why `user_permissions_unified` View?

**Purpose:** Stable API contract between backend and frontend

**Benefits:**
- Frontend doesn't need to know about table structure changes
- Can rename/restructure tables without breaking frontend
- Computed fields (is_super_admin, is_org_admin) in one place
- Type-safe interface
- Performance optimization (single query)

**Example:**
```sql
-- Frontend queries view (not tables directly)
SELECT * FROM user_permissions_unified WHERE user_id = auth.uid();

-- Backend can refactor tables without breaking frontend
-- ALTER TABLE user_roles ... (frontend unaffected)
```

### Why Direct BigQuery Integration?

**Alternative:** Intermediary caching layer (Redis, PostgreSQL, etc.)

**Chosen:** Direct BigQuery connection via Edge Function

**Reason:**
- Real-time data requirements (no stale cache issues)
- Low query volume (single user: 4 admin users × 10 queries/day = 40 queries/day)
- BigQuery performance sufficient (200-500ms)
- Reduces architectural complexity
- Eliminates cache invalidation problems
- No sync issues between cache and source of truth

**Cost Analysis:**
- Direct queries: $12-25/month (with 30s Edge Function cache)
- Intermediate cache: $50-100/month (Redis + sync logic + maintenance)
- BigQuery cost: ~$5/TB scanned (~1-5 GB/day = $0.02-0.10/day)

### Why Session Security Disabled in Development?

**Production:** Enabled (15 min idle, 8 hour absolute)
**Development:** Disabled

**Reason:**
- Developers need uninterrupted testing
- Frequent page reloads during development (would trigger timeouts)
- Security not needed on localhost
- Faster development workflow
- Production parity maintained via environment variable

**Implementation:**
```typescript
if (import.meta.env.PROD && user) {
  enableSessionSecurity();
}
```

### Why Client-Side Filtering (No Server Refetch)?

**Alternative:** Send app/traffic filters to Edge Function, refetch from BigQuery

**Chosen:** Fetch all data once, filter client-side

**Reason:**
- 100x faster filter changes (500ms → 5ms)
- Better user experience (instant updates)
- Reduced BigQuery costs (fewer queries)
- Simpler Edge Function logic
- Lower server load

**Trade-off:**
- Larger initial response (fetch all data for org)
- Acceptable: Typical response 50-200 KB (manageable)

**When to Use Server-Side Filtering:**
- Very large datasets (>10,000 rows)
- Privacy requirements (client can't see all data)
- Network bandwidth constraints

---

## Cross-References

**Related Documentation:**
- **Data Pipeline:** `/docs/03-features/dashboard-v2/DATA_PIPELINE_AUDIT.md` (January 19, 2025)
- **Roles System:** `/docs/02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md` (December 21, 2025)
- **BigQuery Reference:** `/docs/reference/BIGQUERY_QUICK_REFERENCE.md`
- **Development Guide:** `DEVELOPMENT_GUIDE.md`
- **Security Implementation:** `PHASE2_COMPLETE_SUMMARY.md`
- **Encryption Status:** `ENCRYPTION_STATUS.md`

**Source Code References:**
- **Frontend Auth:** `/src/hooks/usePermissions.ts`
- **Dashboard:** `/src/pages/ReportingDashboardV2.tsx`
- **Edge Function:** `/supabase/functions/bigquery-aso-data/index.ts`
- **Database View:** Look for `user_permissions_unified` in migrations

---

**Document Version:** 1.0
**Status:** ACTIVE (Canonical)
**Last Updated:** January 19, 2025
**Next Review:** February 19, 2025
**Maintained By:** Platform Engineering Team

---

**End of ARCHITECTURE_V1.md**
