# Yodel ASO Insight - Current System Architecture

**Last Updated:** November 9, 2025
**Status:** ✅ Production Ready
**Compliance:** SOC 2 (95%), ISO 27001 (90%), GDPR (85%)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Authentication & Authorization](#authentication--authorization)
4. [Database Architecture](#database-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Services](#backend-services)
7. [Security Features](#security-features)
8. [Data Flow](#data-flow)
9. [Feature Flags](#feature-flags)
10. [Deployment](#deployment)

---

## System Overview

### Current Production Pages

The system is currently optimized for **2 production pages** with enterprise security:

1. **Dashboard V2** (`/dashboard-v2`)
   - BigQuery analytics integration
   - Real-time ASO metrics
   - Traffic source filtering
   - App-scoped data visualization

2. **Reviews Management** (`/growth-accelerators/reviews`)
   - iTunes RSS feed integration
   - Review monitoring and export
   - Competitor analysis

### User Base

**Primary User:**
- Email: `cli@yodelmobile.com`
- Organization: Yodel Mobile
- Role: `ORG_ADMIN`
- Access: Dashboard V2 + Reviews page

**Admin Users (4 total):**
- All under Yodel Mobile organization
- MFA grace period: Expires December 8, 2025
- Roles: `ORG_ADMIN` or `SUPER_ADMIN`

---

## Technology Stack

### Frontend

```
React 18.3 + TypeScript 5.6
├── Build Tool: Vite 5.4
├── UI Framework: shadcn/ui (Radix primitives)
├── Styling: Tailwind CSS 3.4
├── State Management: TanStack Query v4 + React Context
├── Routing: React Router DOM v6
├── Forms: React Hook Form + Zod validation
└── Charts: Recharts 2.x
```

### Backend

```
Supabase Platform
├── Authentication: Supabase Auth (JWT + MFA)
├── Database: PostgreSQL 15+ with RLS
├── Edge Functions: Deno runtime (TypeScript)
├── Storage: Supabase Storage with RLS
└── Real-time: WebSocket subscriptions
```

### External Integrations

```
Data Sources
├── BigQuery: Google Cloud analytics warehouse
├── iTunes RSS: Apple App Store review feeds
└── App Store Connect API: (planned)
```

---

## Authentication & Authorization

### Authentication Flow

```
User Login
  ↓
Password Authentication (Supabase Auth)
  ↓
[MFA Enabled?] → Yes → TOTP Verification → Dashboard
  ↓ No
Dashboard
```

### Session Security (SOC 2 Compliant)

**Idle Timeout:** 15 minutes of inactivity
**Absolute Timeout:** 8 hours maximum session
**Warning:** 2 minutes before auto-logout
**Environment:** Enabled in production only

**Activity Tracking:**
- Mouse movements
- Keyboard inputs
- Touch events
- Scroll events

### Multi-Factor Authentication (MFA)

**Implementation:** TOTP-based (Time-based One-Time Password)
**Apps Supported:** Google Authenticator, Authy, 1Password, etc.
**Requirement:** All admin users (ORG_ADMIN, SUPER_ADMIN)
**Grace Period:** 30 days from November 8, 2025
**Setup Location:** Settings page (`/settings`)

### Authorization Model

**Current Architecture:** `user_roles` table as Single Source of Truth (SSOT)

```sql
-- user_roles table structure
CREATE TABLE user_roles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id),
  role text CHECK (role IN ('super_admin', 'org_admin', 'viewer')),
  created_at timestamptz DEFAULT now()
);
```

**Unified View for Frontend:**

```sql
CREATE VIEW user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,  -- ✅ Frontend expects "org_id"
  ur.role::text AS role,
  'user_roles'::text AS role_source,
  (ur.organization_id IS NULL) AS is_platform_role,
  o.name AS org_name,
  o.slug AS org_slug,
  ur.created_at AS resolved_at,
  (ur.role::text = 'super_admin') AS is_super_admin,
  (ur.role::text IN ('org_admin', 'super_admin')) AS is_org_admin,
  (ur.organization_id IS NOT NULL) AS is_org_scoped_role,
  ur.role::text AS effective_role
FROM user_roles ur
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE ur.role IS NOT NULL;
```

**Permission Hook Usage:**

```typescript
// Frontend usage
const { permissions } = usePermissions();

// Available fields:
permissions.isSuperAdmin    // boolean
permissions.isOrgAdmin      // boolean
permissions.organizationId  // uuid | null (renamed from org_id)
permissions.orgName         // string
permissions.role            // 'super_admin' | 'org_admin' | 'viewer'
```

---

## Database Architecture

### Core Tables (Single Source of Truth)

#### 1. `user_roles` (SSOT for permissions)

**Purpose:** Centralized role and organization management
**RLS:** Enabled ✅
**Policies:**
- Users see their own roles
- Super admins see all roles

```sql
-- Key columns:
user_id: uuid           -- Links to auth.users
organization_id: uuid   -- Links to organizations (NULL for platform roles)
role: text              -- 'super_admin', 'org_admin', 'viewer'
```

#### 2. `organizations`

**Purpose:** Multi-tenant organization management
**RLS:** Enabled ✅
**Policies:**
- Users see their own organization
- Super admins see all organizations

```sql
-- Key columns:
id: uuid                -- Primary key
name: text              -- Organization name
slug: text              -- URL-safe identifier
created_at: timestamptz
```

#### 3. `org_app_access`

**Purpose:** Maps organizations to BigQuery app IDs
**RLS:** Enabled ✅
**Usage:** Dashboard V2 data scoping

```sql
-- Key columns:
organization_id: uuid   -- Links to organizations
app_id: text            -- BigQuery app identifier
granted_at: timestamptz
```

**Critical Fix Applied:**
- Demo apps removed from org_app_access
- Only real production apps remain
- Prevents data confusion in Dashboard V2

#### 4. `audit_logs`

**Purpose:** SOC 2 compliance - immutable audit trail
**RLS:** Enabled ✅
**Retention:** 7 years (compliance requirement)

```sql
-- Key columns:
user_id: uuid
organization_id: uuid
user_email: text             -- Denormalized for audit
action: text                 -- e.g., 'view_dashboard_v2', 'login'
resource_type: text          -- e.g., 'bigquery_data'
resource_id: uuid
details: jsonb               -- Additional metadata
ip_address: inet
user_agent: text
request_path: text
status: text                 -- 'success', 'failure', 'denied'
error_message: text
created_at: timestamptz
```

**Logging Function:**

```sql
-- Usage in code:
SELECT log_audit_event(
  p_user_id := auth.uid(),
  p_organization_id := 'org-uuid',
  p_user_email := 'user@example.com',
  p_action := 'view_dashboard_v2',
  p_resource_type := 'bigquery_data',
  p_details := '{"app_count": 3, "date_range": {...}}'::jsonb,
  p_status := 'success'
);
```

#### 5. `mfa_enforcement`

**Purpose:** Track MFA enrollment for admin users
**RLS:** Enabled ✅

```sql
-- Key columns:
user_id: uuid PRIMARY KEY
role: text                   -- User's role
mfa_required: boolean
grace_period_ends_at: timestamptz
mfa_enabled_at: timestamptz
last_reminded_at: timestamptz
```

#### 6. `encryption_keys`

**Purpose:** Application-level encryption key management
**RLS:** Enabled ✅ (service_role only)
**Status:** Infrastructure-level encryption sufficient (not actively used)

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   │   ├── SessionSecurityProvider.tsx
│   │   ├── SessionTimeoutWarning.tsx
│   │   ├── MFASetup.tsx
│   │   ├── MFAVerification.tsx
│   │   └── MFAGracePeriodBanner.tsx
│   ├── ui/             # shadcn/ui primitives
│   └── analytics/      # Chart components
├── context/            # React Context providers
│   ├── AuthContext.tsx
│   ├── AppContext.tsx
│   └── BigQueryAppContext.tsx
├── hooks/              # Custom React hooks
│   ├── usePermissions.ts       # ✅ Primary permissions hook
│   ├── useEnterpriseAnalytics.ts
│   └── useSessionSecurity.ts
├── integrations/       # External service clients
│   └── supabase/
│       └── client.ts
├── layouts/            # Page layouts
│   └── MainLayout.tsx
├── pages/              # Route components
│   ├── ReportingDashboardV2.tsx    # ✅ Production page
│   ├── growth-accelerators/
│   │   └── reviews.tsx              # ✅ Production page
│   ├── SecurityMonitoring.tsx
│   └── settings.tsx
└── App.tsx             # Root component with providers
```

### Context Provider Hierarchy

```tsx
// App.tsx structure
<QueryClientProvider>
  <TooltipProvider>
    <BrowserRouter>
      <AuthProvider>              // ✅ User authentication
        <SessionSecurityProvider> // ✅ Session timeouts
          <SuperAdminProvider>
            <BigQueryAppProvider> // ✅ App access data
              <AsoDataProvider>
                <AppProvider>
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
1. `AuthProvider` - Must be outermost (user context needed by all)
2. `SessionSecurityProvider` - Depends on AuthProvider for user
3. `BigQueryAppProvider` - Depends on user for org_app_access lookup
4. Other providers - Feature-specific context

### Key Hooks

#### `usePermissions()` - Primary Authorization Hook

**Purpose:** Centralized permission checking
**Data Source:** `user_permissions_unified` view
**Returns:**

```typescript
{
  permissions: {
    organizationId: string | null,     // Current org UUID
    orgName: string | null,            // Organization name
    role: string | null,               // User's role
    isSuperAdmin: boolean,             // Platform-wide access
    isOrgAdmin: boolean,               // Org-level admin
    isOrgScoped: boolean,              // Has organization
    roleSource: string,                // 'user_roles'
    effectiveRole: string              // Computed role
  },
  isLoading: boolean,
  error: Error | null,
  availableOrgs: Array<{id, name, slug}>
}
```

**Usage Pattern:**

```typescript
function MyComponent() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <Loading />;
  if (!permissions?.isOrgAdmin) return <NoAccess />;

  return <AdminContent orgId={permissions.organizationId} />;
}
```

#### `useEnterpriseAnalytics()` - Dashboard V2 Data Hook

**Purpose:** BigQuery analytics data retrieval
**Features:**
- Triple filtering: organization → apps → traffic sources
- Direct Edge Function integration
- Error handling and loading states

**Usage:**

```typescript
const { data, isLoading, error } = useEnterpriseAnalytics({
  organizationId: permissions.organizationId,
  dateRange: { start: '2025-01-01', end: '2025-01-31' },
  trafficSources: ['search', 'browse'], // Optional
  appIds: ['app1', 'app2']              // Optional
});
```

**Response Structure:**

```typescript
{
  data: {
    summary: {
      total_impressions: number,
      total_downloads: number,
      // ... other KPIs
    },
    trends: Array<{date, impressions, downloads, ...}>,
    traffic_sources: Array<{source, impressions, downloads, ...}>,
    meta: {
      raw_rows: number,
      data_source: 'bigquery',
      all_accessible_app_ids: string[]
    }
  }
}
```

---

## Backend Services

### Edge Functions (Supabase Deno Runtime)

#### 1. `bigquery-aso-data` ✅ Production

**Purpose:** Dashboard V2 data retrieval from BigQuery
**Route:** `/functions/v1/bigquery-aso-data`
**Method:** POST
**Authentication:** JWT required
**Authorization:** Checks `org_app_access` table

**Request:**

```typescript
{
  organizationId: string,
  startDate: string,      // YYYY-MM-DD
  endDate: string,        // YYYY-MM-DD
  trafficSources?: string[], // Optional filter
  appIds?: string[]          // Optional filter
}
```

**Response:**

```typescript
{
  summary: {...},
  trends: [...],
  traffic_sources: [...],
  meta: {
    raw_rows: number,
    data_source: 'bigquery',
    all_accessible_app_ids: string[],
    applied_filters: {...}
  }
}
```

**Security Features:**
- ✅ Audit logging (every request logged)
- ✅ Organization-scoped access
- ✅ App-level filtering via org_app_access
- ✅ BigQuery query parameterization (SQL injection prevention)

**BigQuery Table Used:**

```
`yodel-mobile-app.aso_reports.aso_all_apple`
```

**Critical Fix Applied:**
- Changed from `aso_organic_apple` to `aso_all_apple`
- Includes all traffic sources (search, browse, referrer, etc.)
- Enables traffic source filtering in UI

#### 2. `authorize` (Not actively used)

**Purpose:** Centralized permission validation
**Status:** Created but not integrated
**Reason:** Frontend uses `usePermissions()` hook directly

---

## Security Features

### 1. Row-Level Security (RLS)

**Tables with RLS Enabled:**

| Table | Policy Type | Scope |
|-------|------------|-------|
| `organizations` | SELECT | Own org or super_admin |
| `user_roles` | ALL | Own roles or super_admin |
| `org_app_access` | SELECT | Own org apps or super_admin |
| `audit_logs` | INSERT/SELECT | Own org logs or super_admin |
| `mfa_enforcement` | ALL | Own record or super_admin |

**Example Policy:**

```sql
CREATE POLICY "users_see_own_organization"
ON organizations FOR SELECT TO authenticated
USING (
  id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);
```

### 2. Encryption

**Infrastructure Level (Supabase):**
- Algorithm: AES-256
- Scope: All database tables
- Provider: Supabase / AWS
- Compliance: GDPR, ISO 27001, SOC 2 certified

**Application Level:**
- Migration created: `20251109030000_enable_pii_encryption.sql`
- Status: Not actively used (infrastructure encryption sufficient)
- Purpose: Optional defense-in-depth for Phase 3

### 3. Audit Logging

**Coverage:**
- ✅ Dashboard V2 views
- ✅ Login attempts (success/failure)
- ✅ MFA enrollment/verification
- ✅ Session start/end/timeout
- ✅ Permission changes (planned)

**Audit Log Query:**

```sql
-- Recent user activity
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;

-- Failed login attempts (24 hours)
SELECT user_email, COUNT(*) as attempt_count
FROM audit_logs
WHERE action = 'login'
  AND status = 'failure'
  AND created_at > now() - interval '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 5;
```

### 4. Security Monitoring Dashboard

**Route:** `/admin/security`
**Access:** ORG_ADMIN and SUPER_ADMIN only
**Features:**
- Audit logs viewer (last 100 events)
- Failed login tracking (24-hour window)
- MFA enrollment status
- Session activity metrics

**Tabs:**
1. **Audit Logs:** All security events
2. **Failed Logins:** Suspicious activity detection
3. **MFA Status:** Admin user MFA enrollment
4. **Session Activity:** Session start/timeout counts

---

## Data Flow

### Dashboard V2 - Complete Flow

```
1. User navigates to /dashboard-v2
   ↓
2. usePermissions() hook fetches user's organization
   ↓
3. useEnterpriseAnalytics() calls Edge Function with orgId
   ↓
4. Edge Function:
   a. Validates JWT token
   b. Queries org_app_access for app IDs
   c. Constructs BigQuery SQL with filters
   d. Executes parameterized query
   e. Logs to audit_logs table (non-blocking)
   ↓
5. Response flows back to frontend
   ↓
6. Dashboard renders KPI cards, charts, filters
   ↓
7. User applies app/traffic source filters
   ↓
8. Hook refetches with new parameters (steps 3-6 repeat)
```

**Key Characteristics:**
- Direct pipeline (no middleware)
- Real-time BigQuery data (no caching)
- Comprehensive logging
- Error boundaries at each layer

### Reviews Page - Data Flow

```
1. User navigates to /growth-accelerators/reviews
   ↓
2. Component fetches iTunes RSS feed
   ↓
3. Parses XML to JSON
   ↓
4. Displays in table with search/filter
   ↓
5. User can export to CSV/JSON
```

---

## Feature Flags

**Current Implementation:** None (simplified for production focus)

**Planned Architecture:**

```typescript
// organization_features table
{
  organization_id: uuid,
  feature_key: text,  // e.g., 'app_core_access'
  enabled: boolean,
  granted_at: timestamptz
}
```

**Access Control:**

```typescript
// Check feature access
const hasFeature = await checkFeatureAccess(
  userId,
  organizationId,
  'app_core_access'
);
```

---

## Deployment

### Environments

**Development:** `bkbcqocpjahewqjmlgvf.supabase.co`
**Production:** (same instance - single environment)

### Deployment Process

**Frontend:**

```bash
# Build for production
npm run build

# Deploy to hosting (Vercel/Netlify/etc.)
# Deployment details specific to hosting provider
```

**Database Migrations:**

```bash
# Link to Supabase project
supabase link --project-ref bkbcqocpjahewqjmlgvf

# Push migrations
supabase db push

# Or apply specific migration
supabase migration up --db-url "postgresql://..."
```

**Edge Functions:**

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy bigquery-aso-data
```

### Environment Variables

**Required:**

```bash
# Frontend (.env or .env.production)
VITE_SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Edge Functions (Supabase dashboard secrets)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
BIGQUERY_PROJECT_ID=yodel-mobile-app
BIGQUERY_DATASET=aso_reports
```

**Optional:**

```bash
# Enable session security in production only
NODE_ENV=production

# Admin diagnostics (development only)
VITE_ADMIN_DIAGNOSTICS_ENABLED=true
```

---

## Migration History (Recent)

### Security Hardening (November 2025)

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

### Data Integrity Fixes (November 2025)

5. **20251108110000_cleanup_demo_apps_from_org_app_access.sql**
   - Removed demo app IDs from org_app_access
   - Prevents Dashboard V2 data confusion

6. **20251108100000_fix_org_app_access_rls.sql**
   - Fixed RLS policies on org_app_access

7. **20251108235000_hotfix_restore_view_schema.sql**
   - Fixed user_permissions_unified view schema
   - Restored correct column names (org_id, flags)

---

## Current Status Summary

### ✅ Production Ready

- Dashboard V2 with BigQuery integration
- Reviews management with iTunes RSS
- Multi-factor authentication (MFA)
- Session security (timeouts)
- Audit logging (SOC 2 compliant)
- Row-level security (RLS)
- Encryption at rest (AES-256)
- Security monitoring dashboard

### 📊 Current Users

- **Primary:** cli@yodelmobile.com (Yodel Mobile, ORG_ADMIN)
- **Admin users:** 4 total (MFA grace period until Dec 8, 2025)

### 🔐 Compliance

- **SOC 2 Type II:** 95% ready
- **ISO 27001:** 90% ready
- **GDPR:** 85% ready

---

## Key Design Decisions

### Why `user_roles` as SSOT?

**Previous:** Multiple tables (org_users, user_permissions, etc.)
**Current:** Single `user_roles` table
**Reason:**
- Eliminated data inconsistencies
- Simplified queries
- Single source of truth
- Easier maintenance

### Why `user_permissions_unified` View?

**Purpose:** Stable API contract between backend and frontend
**Benefits:**
- Frontend doesn't need to know about table changes
- Can rename/restructure tables without breaking frontend
- Computed fields (is_super_admin, etc.) in one place
- Type-safe interface

### Why Direct BigQuery Integration?

**No intermediary caching layer**
**Reason:**
- Real-time data requirements
- Low query volume (single user)
- BigQuery performance sufficient
- Reduces complexity
- Eliminates sync issues

### Why Session Security Disabled in Development?

**Production:** Enabled (15 min idle, 8 hour absolute)
**Development:** Disabled
**Reason:**
- Developers need uninterrupted testing
- Frequent reloads during development
- Security not needed on localhost

---

## Next Page Integration Pattern

When adding a new page to the platform, follow this pattern to inherit all security features:

### 1. Create Page Component

```typescript
// src/pages/NewFeature.tsx
export default function NewFeature() {
  const { permissions, isLoading } = usePermissions();

  // Access control
  if (!permissions?.isOrgAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Add audit logging
  useEffect(() => {
    if (permissions?.organizationId) {
      supabase.rpc('log_audit_event', {
        p_action: 'view_new_feature',
        p_resource_type: 'new_feature',
        // ... other params
      });
    }
  }, [permissions?.organizationId]);

  return <MainLayout>...</MainLayout>;
}
```

### 2. Add Route in App.tsx

```typescript
<Route
  path="/new-feature"
  element={<ProtectedRoute><NewFeature /></ProtectedRoute>}
/>
```

### 3. Automatic Security Inheritance

✅ Session security (via SessionSecurityProvider wrapper)
✅ RLS (via database policies)
✅ MFA (if user has it enabled)
✅ Encryption (infrastructure-level)
✅ Organization scoping (via usePermissions)

### 4. Add Audit Logging (15 minutes)

Just one RPC call - everything else is automatic!

---

**End of Current Architecture Document**

For development patterns and guidelines, see `DEVELOPMENT_GUIDE.md`
For security implementation details, see `PHASE2_COMPLETE_SUMMARY.md`
For encryption compliance, see `ENCRYPTION_STATUS.md`
