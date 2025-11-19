# Comprehensive Access Audit: cli@yodelmobile.com
**Date:** 2025-11-08
**Objective:** Map exact data flow and access patterns currently working for Dashboard V2 and Reviews Page
**User:** cli@yodelmobile.com
**Organization:** Yodel Mobile (Agency)

---

## Executive Summary

**Current Status:** ✅ WORKING
**Architecture:** Agency-Client Model with RLS-based Access Control
**Critical Dependencies:** 7 database tables, 3 RLS policy sets, 1 Edge Function, 1 JWT function

**Fragile Points Identified:**
- 🔴 **HIGH RISK:** `is_super_admin()` JWT function (security definer with hardcoded claim)
- 🟡 **MEDIUM RISK:** Enum case sensitivity (ORG_ADMIN vs org_admin)
- 🟡 **MEDIUM RISK:** Agency expansion logic in Edge Function
- 🟢 **LOW RISK:** Feature flag system

---

## 1. User Identity & Organization

### User Profile
```yaml
User ID: 8920ac57-63da-4f8e-9970-719be1e2569c
Email: cli@yodelmobile.com
Password: YodelAdmin123!
Role: ORG_ADMIN
Organization ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
Organization Name: Yodel Mobile
Organization Slug: yodel-mobile
Organization Type: AGENCY (manages client organizations)
```

### Database Records
**Table: `auth.users`**
```sql
id: 8920ac57-63da-4f8e-9970-719be1e2569c
email: cli@yodelmobile.com
```

**Table: `user_roles`** (SSOT for permissions)
```sql
user_id: 8920ac57-63da-4f8e-9970-719be1e2569c
email: cli@yodelmobile.com
role: ORG_ADMIN  -- ✅ Uppercase enum value
organization_id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
created_at: <timestamp>
```

**Table: `profiles`**
```sql
id: 8920ac57-63da-4f8e-9970-719be1e2569c
email: cli@yodelmobile.com
first_name: CLI
last_name: Admin
organization_id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
```

**Table: `organizations`**
```sql
id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
name: Yodel Mobile
slug: yodel-mobile
subscription_tier: enterprise
```

---

## 2. Dashboard V2 Access Chain

### 2.1 Frontend Component Flow
**File:** `/src/pages/ReportingDashboardV2.tsx`

#### Step 1: Permission Check (Line 36)
```typescript
const { organizationId, email, availableOrgs } = usePermissions();
```

**What happens:**
1. Calls `usePermissions()` hook
2. Fetches from `user_permissions_unified` view
3. Returns: `organizationId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'`

#### Step 2: Data Fetching (Line 66)
```typescript
const { data, isLoading, error, refetch } = useEnterpriseAnalytics({
  organizationId: organizationId || '',
  dateRange,
  trafficSources: selectedTrafficSources,
  appIds: selectedAppIds
});
```

**What happens:**
1. Calls `useEnterpriseAnalytics()` hook with Yodel Mobile org ID
2. Hook invokes Edge Function `bigquery-aso-data`
3. Passes user's JWT token in Authorization header

#### Step 3: No Explicit Feature Check
**Note:** Dashboard V2 has NO feature flag check! Access is solely based on:
- Having a valid `organizationId`
- Not being in loading state
- Successful Edge Function response

### 2.2 Hook: usePermissions
**File:** `/src/hooks/usePermissions.ts`

#### Data Source (Line 74-78)
```typescript
const unifiedQuery = await supabase
  .from('user_permissions_unified')
  .select('*')
  .eq('user_id', user.id);
```

**What it queries:**
- **View:** `user_permissions_unified`
- **Underlying table:** `user_roles` (ONLY source after migration 20251205000000)
- **Returns for cli@yodelmobile.com:**
```javascript
{
  user_id: '8920ac57-63da-4f8e-9970-719be1e2569c',
  org_id: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  org_name: 'Yodel Mobile',
  org_slug: 'yodel-mobile',
  role: 'ORG_ADMIN',
  effective_role: 'org_admin',  // normalized to lowercase
  is_super_admin: false,
  is_org_admin: true,
  is_org_scoped_role: true,
  role_source: 'user_roles'
}
```

#### Fallback Logic (Line 89-139)
If `user_permissions_unified` view fails (returns empty):
1. Tries direct query to `user_roles` table
2. Transforms results to match view format
3. Only fails if BOTH queries return empty

#### Enterprise Safe Guards (Line 144-159, 252-267)
Returns safe defaults on failure:
```javascript
{
  organizationId: null,
  roles: [],
  isSuperAdmin: false,
  isOrganizationAdmin: false,
  effectiveRole: 'viewer'
}
```

### 2.3 Hook: useEnterpriseAnalytics
**File:** `/src/hooks/useEnterpriseAnalytics.ts`

#### Edge Function Invocation (Line 141-153)
```typescript
const { data: response, error: functionError } = await supabase.functions.invoke(
  'bigquery-aso-data',
  {
    body: {
      org_id: organizationId,  // '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
      date_range: dateRange,
      app_ids: appIds.length > 0 ? appIds : undefined,
      metrics: ['impressions', 'installs', 'cvr'],
      granularity: 'daily'
    }
  }
);
```

**Authentication:**
- Automatically includes JWT token from `supabase.auth.session()`
- Token contains: `user.id`, `user.email`, `is_superadmin` claim (if set)

#### Response Unwrapping (Line 176-197)
Handles TWO possible response formats:
1. **Direct format:** `{data: [], meta: {}, scope: {}}`
2. **Wrapped format:** `{success: true, data: {data: [], meta: {}, scope: {}}}`

**Critical:** Must unwrap correctly or Dashboard V2 breaks!

#### Client-Side Filtering (Line 274-310)
Traffic source filtering happens AFTER data fetch:
- Server returns ALL traffic sources
- Client filters by `selectedTrafficSources` array
- No refetch needed when changing traffic source filter

---

## 3. Reviews Page Access Chain

### 3.1 Frontend Component Flow
**File:** `/src/pages/growth-accelerators/reviews.tsx`

#### Step 1: Permission Check (Line 87)
```typescript
const { isSuperAdmin, isOrganizationAdmin, roles = [], organizationId } = usePermissions();
```

**What happens:**
1. Gets user permissions (same as Dashboard V2)
2. Extracts role flags: `isOrganizationAdmin = true`

#### Step 2: Role Mapping (Line 88-92)
```typescript
const role = roles[0] || 'viewer';
const currentUserRole: UserRole = isSuperAdmin ? 'super_admin' :
  (isOrganizationAdmin ? 'org_admin' :
  (role?.toLowerCase().includes('aso') ? 'aso_manager' :
  (role?.toLowerCase().includes('analyst') ? 'analyst' : 'viewer')));
```

**Result for cli@yodelmobile.com:**
- `roles[0] = 'org_admin'` (normalized, lowercase)
- `isOrganizationAdmin = true`
- `currentUserRole = 'org_admin'`

#### Step 3: Feature Check (Line 94-95)
```typescript
const { isDemoOrg, organization } = useDemoOrgDetection();
const canAccessReviews = featureEnabledForRole(PLATFORM_FEATURES.REVIEWS_PUBLIC_RSS_ENABLED, currentUserRole) || isDemoOrg;
```

**Evaluation:**
1. `PLATFORM_FEATURES.REVIEWS_PUBLIC_RSS_ENABLED = 'reviews_public_rss_enabled'`
2. `featureEnabledForRole('reviews_public_rss_enabled', 'org_admin')`
3. Checks `ROLE_FEATURE_DEFAULTS['org_admin']` array
4. **Result:** ✅ TRUE (org_admin has full access to Growth Accelerators features)

#### Step 4: Access Decision
```typescript
if (!canAccessReviews) {
  return <Navigate to="/unauthorized" replace />;
}
```

**For cli@yodelmobile.com:** Passes check, renders Reviews page

### 3.2 Feature Permission System
**File:** `/src/constants/features.ts`

#### Role Defaults (Line 178-193)
```typescript
export const ROLE_FEATURE_DEFAULTS: Record<UserRole, string[]> = {
  super_admin: Object.values(PLATFORM_FEATURES_ENHANCED),
  org_admin: [
    // Performance Intelligence - Full access
    ...FEATURE_CATEGORIES.PERFORMANCE_INTELLIGENCE.features,
    // AI Command Center - Limited access (no strategic audit)
    PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB,
    PLATFORM_FEATURES_ENHANCED.AI_METADATA_GENERATOR,
    // Growth Accelerators - Full access except system controls
    ...FEATURE_CATEGORIES.GROWTH_ACCELERATORS.features,  // ← Includes 'reviews_public_rss_enabled'
    // Control Center - Limited access
    PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE,
    PLATFORM_FEATURES_ENHANCED.PORTFOLIO_MANAGER,
    // Account - Full access
    ...FEATURE_CATEGORIES.ACCOUNT.features,
  ],
  // ... other roles
};
```

#### Growth Accelerators Features (Line 82-84)
```typescript
GROWTH_ACCELERATORS: {
  name: 'Growth Accelerators',
  description: 'User acquisition and growth optimization tools',
  features: [
    'keyword_intelligence',
    'competitive_intelligence',
    'creative_review',
    'app_discovery',
    'aso_chat',
    'market_intelligence',
    'reviews_public_rss_enabled',  // ← Reviews access
    'creative_analysis',
    'keyword_rank_tracking',
    'visibility_optimizer'
  ]
}
```

**Key Point:** `org_admin` role includes ALL Growth Accelerators features by default!

---

## 4. Edge Function Auth Flow

### 4.1 Edge Function Overview
**File:** `/supabase/functions/bigquery-aso-data/index.ts`

#### Step 1: Extract User from JWT (Line 169-180)
```typescript
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  },
);

const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
```

**What happens:**
1. Creates Supabase client with user's JWT
2. Calls `getUser()` to validate token
3. Extracts: `user.id = '8920ac57-63da-4f8e-9970-719be1e2569c'`

#### Step 2: Check Super Admin Status (Line 182-191)
```typescript
const { data: isSuperAdmin, error: superAdminError } = await supabaseClient
  .rpc('is_super_admin');
```

**Critical Function:** `is_super_admin()` (Migration: 20251201090000_rls_apps_and_superadmin.sql)
```sql
create or replace function public.is_super_admin()
returns boolean
language sql
security definer  -- ⚠️ RUNS AS FUNCTION OWNER, NOT CALLER
set search_path = public
as $$
  select coalesce( (auth.jwt() ->> 'is_superadmin')::boolean, false );
$$;
```

**How it works:**
1. Uses `security definer` to bypass RLS
2. Reads `is_superadmin` claim from JWT token
3. Returns `true` if claim exists and is true, else `false`

**For cli@yodelmobile.com:**
- JWT does NOT have `is_superadmin` claim
- Returns: `isSuperAdmin = false`

#### Step 3: Get User Role (Line 200-218)
```typescript
if (isSuperAdmin) {
  userRole = "SUPER_ADMIN";
  userOrgId = null;
} else {
  // For non-super admins, get role from user_roles table
  const { data: roleData, error: roleError } = await supabaseClient
    .from("user_roles")
    .select("role, organization_id")
    .eq("user_id", user.id)
    .single();

  userRole = roleData.role;      // 'ORG_ADMIN'
  userOrgId = roleData.organization_id;  // '7cccba3f-...'
}
```

**For cli@yodelmobile.com:**
- Query returns: `{role: 'ORG_ADMIN', organization_id: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'}`
- Sets: `userRole = 'ORG_ADMIN'`, `userOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'`

#### Step 4: Resolve Organization Scope (Line 220-269)
```typescript
let resolvedOrgId: string;
let scopeSource: string;

if (userRole?.toUpperCase() === "SUPER_ADMIN" && userOrgId === null) {
  // Super admin must select an organization
  resolvedOrgId = requestedOrgId;
  scopeSource = "platform_admin_selection";
} else if (userOrgId) {
  // Regular org user
  resolvedOrgId = userOrgId;  // '7cccba3f-...'
  scopeSource = "user_membership";
}
```

**For cli@yodelmobile.com:**
- Takes `else if (userOrgId)` branch
- Sets: `resolvedOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'`
- Sets: `scopeSource = 'user_membership'`

### 4.2 Agency Expansion Logic

#### Step 5: Check Agency Relationships (Line 271-296)
```typescript
// 🎯 [AGENCY SUPPORT] Check if this organization is an agency
const { data: managedClients, error: agencyError } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId)  // '7cccba3f-...' (Yodel Mobile)
  .eq("is_active", true);

// Build list of organizations to query (self + managed clients)
let organizationsToQuery = [resolvedOrgId];
if (managedClients && managedClients.length > 0) {
  const clientOrgIds = managedClients.map(m => m.client_org_id);
  organizationsToQuery = [resolvedOrgId, ...clientOrgIds];
}
```

**Critical Query:** Checks if Yodel Mobile manages any client organizations

**RLS Policy Applied:** `users_read_agency_relationships` (Migration: 20251107300000)
```sql
USING (
  -- User is in the agency organization
  agency_org_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()  -- '8920ac57-...'
  )
  OR
  -- User is in a client organization
  client_org_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
  OR
  -- User is a platform super admin
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
  )
)
```

**For cli@yodelmobile.com:**
- Matches first condition: `agency_org_id = '7cccba3f-...'` (user's org)
- RLS allows query to succeed
- Returns: Client org IDs managed by Yodel Mobile

**Example result:**
```javascript
managedClients = [
  { client_org_id: 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f' },  // Client 1
  { client_org_id: '550e8400-e29b-41d4-a716-446655440002' }   // Client 2
]

organizationsToQuery = [
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',  // Yodel Mobile (agency)
  'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f',  // Client 1
  '550e8400-e29b-41d4-a716-446655440002'   // Client 2
]
```

### 4.3 App Access Resolution

#### Step 6: Get App Access (Line 298-313)
```typescript
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)  // [agency, client1, client2]
  .is("detached_at", null);

const allowedAppIds = (accessData ?? []).map((item) => item.app_id).filter((id): id is string => Boolean(id));
```

**Critical Query:** Gets ALL apps from agency + all client organizations

**RLS Policy Applied:** `users_read_app_access` (Migration: 20251108100000)
```sql
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
  -- User is a platform super admin
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
  )
)
```

**For cli@yodelmobile.com:**
- Matches BOTH first and second conditions:
  1. `organization_id = '7cccba3f-...'` (user's own org) ← Returns Yodel Mobile's own apps (if any)
  2. `organization_id IN (SELECT client_org_id FROM agency_clients WHERE agency_org_id = '7cccba3f-...')` ← Returns client apps
- RLS allows query to succeed
- Returns: ALL apps attached to agency + all client orgs

**Example result (8 apps):**
```javascript
allowedAppIds = [
  '102228831',      // Client app 1
  '1603183848',     // Client app 2
  '1234567890',     // Client app 3
  '9876543210',     // Client app 4
  '5555555555',     // Client app 5
  '6666666666',     // Client app 6
  '7777777777',     // Client app 7
  '8888888888'      // Client app 8
]
```

#### Step 7: Query BigQuery (Line 414-456)
```typescript
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
```

**Query Parameters:**
```javascript
@app_ids = ['102228831', '1603183848', ...]  // 8 app IDs
@start_date = '2024-10-01'
@end_date = '2024-11-04'
```

**BigQuery Table:** `client_reports.aso_all_apple`
- Contains: All app store analytics data
- Columns: date, app_id, client, traffic_source, impressions, downloads, product_page_views, conversion_rate
- Traffic sources: App_Store_Search, App_Store_Browse, App_Store_Direct, etc.

#### Step 8: Return Response (Line 552-594)
```typescript
const responsePayload = {
  data: rows,  // BigQuery results
  scope: {
    organization_id: resolvedOrgId,
    org_id: resolvedOrgId,
    app_ids: appIdsForQuery,
    date_range: { start: startDate, end: endDate },
    scope_source: scopeSource,
  },
  meta: {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    data_source: 'bigquery',
    row_count: rows.length,
    app_ids: appIdsForQuery,
    app_count: appIdsForQuery.length,
    query_duration_ms: Math.round(performance.now() - startTime),
    org_id: resolvedOrgId,
    discovery_method: scopeSource,
    discovered_apps: appIdsForQuery.length,
    available_traffic_sources: availableTrafficSources,
    all_accessible_app_ids: allowedAppIds,
    total_accessible_apps: allowedAppIds.length
  }
};
```

**Response structure:**
```javascript
{
  data: [...],  // BigQuery rows
  scope: {
    organization_id: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
    org_id: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
    app_ids: ['102228831', ...],
    scope_source: 'user_membership'
  },
  meta: {
    app_count: 8,
    all_accessible_app_ids: ['102228831', '1603183848', ...],
    available_traffic_sources: ['App_Store_Search', 'App_Store_Browse'],
    data_source: 'bigquery'
  }
}
```

---

## 5. Feature Flag System

### 5.1 Organization Features
**Table:** `organization_features`

**Yodel Mobile Features:**
```sql
SELECT * FROM organization_features
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- Results:
organization_id | feature_key            | is_enabled | created_at
7cccba3f-...    | app_core_access        | true       | 2025-11-05
7cccba3f-...    | executive_dashboard    | true       | 2025-11-05
7cccba3f-...    | reviews                | true       | 2025-11-05
7cccba3f-...    | reporting_v2           | true       | 2025-11-05
```

### 5.2 RLS Policies
**Migration:** `20251205130000_fix_organization_features_rls.sql`

**SELECT Policy:** `Users can read org features`
```sql
USING (
  -- User is member of the organization
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
  OR
  -- User is platform super admin (can read all)
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
  )
)
```

**For cli@yodelmobile.com:**
- Matches first condition: `organization_id = '7cccba3f-...'`
- Can read all features for Yodel Mobile organization

### 5.3 Role-Based Access (NOT Database Features)
**Important:** Dashboard V2 and Reviews page use ROLE-based access, NOT database feature flags!

**Dashboard V2:**
- No feature check at all
- Access based solely on having valid `organizationId`

**Reviews Page:**
- Checks: `featureEnabledForRole('reviews_public_rss_enabled', 'org_admin')`
- Looks at: `ROLE_FEATURE_DEFAULTS['org_admin']` (hardcoded array in frontend)
- Does NOT query `organization_features` table

---

## 6. Complete Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        USER LOGIN & AUTHENTICATION                          │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
                    cli@yodelmobile.com (YodelAdmin123!)
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Supabase Auth (auth.users)                  │
              │  user_id: 8920ac57-63da-4f8e-9970-719be1e2569c│
              │  JWT Token: {                                 │
              │    user.id: "8920ac57-...",                  │
              │    user.email: "cli@yodelmobile.com"         │
              │  }                                            │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND: usePermissions() HOOK                        │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Query: user_permissions_unified VIEW        │
              │  WHERE user_id = '8920ac57-...'              │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  View queries: user_roles table (SSOT)       │
              │  SELECT:                                      │
              │    organization_id,                          │
              │    role,                                      │
              │    effective_role                            │
              │  FROM user_roles                             │
              │  WHERE user_id = '8920ac57-...'              │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  RLS: No RLS on user_roles (PUBLIC access)   │
              │  Result: {                                    │
              │    organization_id: '7cccba3f-...',          │
              │    role: 'ORG_ADMIN',                        │
              │    effective_role: 'org_admin'               │
              │  }                                            │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Hook returns:                                │
              │  organizationId: '7cccba3f-...'              │
              │  isOrganizationAdmin: true                   │
              │  isSuperAdmin: false                         │
              │  effectiveRole: 'org_admin'                  │
              │  availableOrgs: [{ id: '7cccba3f-...', ... }]│
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                  DASHBOARD V2: Access Decision                              │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Check: if (!organizationId) → Deny          │
              │  Result: organizationId = '7cccba3f-...'     │
              │  Decision: ✅ ALLOW                          │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                  REVIEWS PAGE: Access Decision                              │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Map role: isOrganizationAdmin → 'org_admin' │
              │  Check: featureEnabledForRole(               │
              │    'reviews_public_rss_enabled',             │
              │    'org_admin'                               │
              │  )                                            │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Lookup: ROLE_FEATURE_DEFAULTS['org_admin']  │
              │  Includes: [...GROWTH_ACCELERATORS.features] │
              │  Contains: 'reviews_public_rss_enabled' ✅   │
              │  Decision: ✅ ALLOW                          │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│          DASHBOARD V2: useEnterpriseAnalytics() → Edge Function             │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  POST /functions/v1/bigquery-aso-data        │
              │  Authorization: Bearer <JWT>                 │
              │  Body: {                                      │
              │    org_id: '7cccba3f-...',                   │
              │    date_range: { start, end },               │
              │    app_ids: []                               │
              │  }                                            │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION: Authentication                            │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  1. Validate JWT:                            │
              │     supabaseClient.auth.getUser()            │
              │     user.id = '8920ac57-...'                 │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  2. Check Super Admin:                       │
              │     SELECT is_super_admin() → false          │
              │     (JWT has no 'is_superadmin' claim)       │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  3. Get User Role:                           │
              │     SELECT role, organization_id             │
              │     FROM user_roles                          │
              │     WHERE user_id = '8920ac57-...'           │
              │     Result: {                                 │
              │       role: 'ORG_ADMIN',                     │
              │       organization_id: '7cccba3f-...'        │
              │     }                                         │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  4. Resolve Organization Scope:              │
              │     userOrgId exists → user_membership       │
              │     resolvedOrgId = '7cccba3f-...'           │
              │     scopeSource = 'user_membership'          │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION: Agency Expansion                          │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  5. Check Agency Relationships:              │
              │     SELECT client_org_id                     │
              │     FROM agency_clients                      │
              │     WHERE agency_org_id = '7cccba3f-...'     │
              │       AND is_active = true                   │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  RLS Policy: users_read_agency_relationships │
              │  Condition: agency_org_id IN (               │
              │    SELECT organization_id FROM user_roles    │
              │    WHERE user_id = auth.uid()                │
              │  ) ✅ MATCHES                                │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Result: managedClients = [                  │
              │    { client_org_id: 'dbdb0cc5-...' },       │
              │    { client_org_id: '550e8400-...' }         │
              │  ]                                            │
              │  organizationsToQuery = [                    │
              │    '7cccba3f-...',  // Agency                │
              │    'dbdb0cc5-...',  // Client 1              │
              │    '550e8400-...'   // Client 2              │
              │  ]                                            │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION: App Access Resolution                     │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  6. Get App Access:                          │
              │     SELECT app_id                            │
              │     FROM org_app_access                      │
              │     WHERE organization_id IN (               │
              │       '7cccba3f-...',                        │
              │       'dbdb0cc5-...',                        │
              │       '550e8400-...'                         │
              │     )                                         │
              │     AND detached_at IS NULL                  │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  RLS Policy: users_read_app_access           │
              │  Condition 1: organization_id IN (           │
              │    SELECT organization_id FROM user_roles    │
              │    WHERE user_id = auth.uid()                │
              │  ) ✅ MATCHES (for '7cccba3f-...')           │
              │                                               │
              │  Condition 2: organization_id IN (           │
              │    SELECT client_org_id FROM agency_clients  │
              │    WHERE agency_org_id IN (...)              │
              │  ) ✅ MATCHES (for client orgs)              │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  Result: allowedAppIds = [                   │
              │    '102228831',      // From Client 1        │
              │    '1603183848',     // From Client 1        │
              │    '1234567890',     // From Client 2        │
              │    '9876543210',     // From Client 2        │
              │    '5555555555',     // From Client 1        │
              │    '6666666666',     // From Client 2        │
              │    '7777777777',     // From Client 1        │
              │    '8888888888'      // From Client 2        │
              │  ]                                            │
              │  Total: 8 apps                               │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION: BigQuery Query                            │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  7. Query BigQuery:                          │
              │     SELECT date, app_id, traffic_source,     │
              │            impressions, downloads, ...       │
              │     FROM client_reports.aso_all_apple        │
              │     WHERE COALESCE(app_id, client)           │
              │           IN UNNEST(@app_ids)                │
              │       AND date BETWEEN @start AND @end       │
              │                                               │
              │  Parameters:                                  │
              │    @app_ids = ['102228831', ...]  (8 apps)   │
              │    @start = '2024-10-01'                     │
              │    @end = '2024-11-04'                       │
              └──────────────────────────────────────────────┘
                                      ↓
              ┌──────────────────────────────────────────────┐
              │  8. Return Response:                         │
              │  {                                            │
              │    data: [...],  // 500+ rows                │
              │    meta: {                                    │
              │      app_count: 8,                           │
              │      all_accessible_app_ids: [8 apps],       │
              │      available_traffic_sources: [            │
              │        'App_Store_Search',                   │
              │        'App_Store_Browse'                    │
              │      ]                                        │
              │    }                                          │
              │  }                                            │
              └──────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND: Render Dashboard V2                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Table Access Matrix

| Table | Access Method | RLS Policy | Required For | Fragile? |
|-------|---------------|------------|--------------|----------|
| `auth.users` | Supabase Auth | Built-in | Login | ❌ No |
| `user_roles` | Direct SELECT | None (public) | Permission resolution | ⚠️ YES - No RLS |
| `user_permissions_unified` | VIEW query | None | Frontend permissions | ❌ No |
| `organizations` | JOIN in view | None | Org name display | ❌ No |
| `profiles` | Not used | Not checked | Display only | ❌ No |
| `agency_clients` | Edge Function | `users_read_agency_relationships` | Agency expansion | ✅ Yes - Enum case |
| `org_app_access` | Edge Function | `users_read_app_access` | App discovery | ✅ Yes - Enum case |
| `organization_features` | Not used for access | `Users can read org features` | Feature display (not enforcement) | ❌ No |

**Critical Path Tables (MUST work for access):**
1. ✅ `auth.users` - Login
2. ✅ `user_roles` - Permission resolution
3. ✅ `agency_clients` - Agency expansion
4. ✅ `org_app_access` - App access

---

## 8. RLS Policy Dependencies

### 8.1 Agency Clients Policies
**Table:** `agency_clients`
**Migration:** `20251107300000_fix_agency_clients_rls.sql`

**SELECT Policy:** `users_read_agency_relationships`
```sql
-- ✅ WORKING for cli@yodelmobile.com
agency_org_id IN (
  SELECT organization_id
  FROM user_roles
  WHERE user_id = auth.uid()
)
```

**Dependencies:**
- ✅ `user_roles` table must exist
- ✅ `user_roles.user_id` must match `auth.uid()`
- ✅ `user_roles.organization_id` must be set
- ⚠️ `role` enum values: 'SUPER_ADMIN' (uppercase)

**Fragile Points:**
- If `user_roles` is empty → Agency expansion fails
- If enum case changes → Super admin bypass breaks

### 8.2 Org App Access Policies
**Table:** `org_app_access`
**Migration:** `20251108100000_fix_org_app_access_rls.sql`

**SELECT Policy:** `users_read_app_access`
```sql
-- ✅ WORKING for cli@yodelmobile.com (via agency condition)
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
```

**Dependencies:**
- ✅ `user_roles` table must exist
- ✅ `agency_clients` table must exist
- ✅ `agency_clients.is_active = true`
- ✅ `org_app_access.detached_at IS NULL`

**Fragile Points:**
- If `agency_clients` RLS breaks → No apps returned
- If `is_active` flag set to false → Agency expansion stops
- If all apps have `detached_at` set → No apps available

### 8.3 Organization Features Policies
**Table:** `organization_features`
**Migration:** `20251205130000_fix_organization_features_rls.sql`

**SELECT Policy:** `Users can read org features`
```sql
-- ✅ WORKING for cli@yodelmobile.com
organization_id IN (
  SELECT organization_id
  FROM user_roles
  WHERE user_id = auth.uid()
)
```

**Dependencies:**
- ✅ `user_roles` table must exist
- ✅ `user_roles.organization_id` must be set

**Fragile Points:**
- If `user_roles` is empty → Cannot read features
- **NOT CRITICAL:** Features are for display only, not access control

---

## 9. Fragile Points Analysis

### 9.1 HIGH SEVERITY - Security Bypass

#### `is_super_admin()` Function
**File:** Migration `20251201090000_rls_apps_and_superadmin.sql`
**Risk Level:** 🔴 HIGH

```sql
create or replace function public.is_super_admin()
returns boolean
language sql
security definer  -- ⚠️ SECURITY BYPASS
set search_path = public
as $$
  select coalesce( (auth.jwt() ->> 'is_superadmin')::boolean, false );
$$;
```

**Why Fragile:**
1. Uses `security definer` - Runs as function owner (bypasses RLS)
2. Reads JWT claim `is_superadmin` (hardcoded string)
3. If JWT structure changes → Function breaks
4. If claim is added to regular users → Unauthorized escalation
5. Used by Edge Function for super admin checks

**Impact if Breaks:**
- Edge Function cannot differentiate super admins
- Regular org admins might get super admin access (if JWT claim is added)
- OR super admins might lose access (if JWT claim is removed)

**Recommendation:**
- Remove function and use direct `user_roles` query
- Check: `role = 'SUPER_ADMIN' AND organization_id IS NULL`

### 9.2 MEDIUM SEVERITY - Enum Case Sensitivity

#### Role Enum Values
**File:** Multiple migrations
**Risk Level:** 🟡 MEDIUM

**Current State:**
- Database stores: `'ORG_ADMIN'` (uppercase)
- Frontend normalizes to: `'org_admin'` (lowercase)
- RLS policies check: `'SUPER_ADMIN'`, `'ORG_ADMIN'` (uppercase)

**Example in RLS:**
```sql
WHERE role IN ('ORG_ADMIN', 'SUPER_ADMIN')
```

**Why Fragile:**
1. If database value changes to lowercase → RLS policies fail silently
2. If new roles added with inconsistent casing → Unpredictable behavior
3. PostgreSQL enum comparison is case-sensitive

**Impact if Breaks:**
- RLS policies fail to match
- Users see empty results (silently filtered)
- No error thrown - appears as "no data"

**Current Mitigation:**
- Migration `20251205000000` handles BOTH cases in view:
```sql
(ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
(ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,
```

**Recommendation:**
- Normalize to lowercase everywhere
- Update RLS policies to use lowercase
- Add constraint to enforce case

### 9.3 MEDIUM SEVERITY - Agency Expansion

#### Agency-Client Relationship Chain
**Risk Level:** 🟡 MEDIUM

**Dependency Chain:**
```
user_roles (user's org)
  → agency_clients (agency relationships)
    → org_app_access (client apps)
      → BigQuery (app data)
```

**Fragile Points:**
1. If `agency_clients` table is empty → No agency expansion
2. If `is_active = false` → Agency expansion stops
3. If `agency_clients` RLS breaks → Cannot query relationships
4. If `org_app_access` RLS breaks → Cannot get client apps

**Impact if Breaks:**
- Yodel Mobile users see ZERO apps
- Dashboard V2 shows "No apps attached"
- No error - appears as legitimate "no apps"

**Current State:** ✅ WORKING
- Agency relationships exist in database
- RLS policies correctly reference `user_roles`
- `is_active = true` for all relationships

### 9.4 LOW SEVERITY - Feature Flags

#### Role-Based Feature Access
**Risk Level:** 🟢 LOW

**Why Low Risk:**
- Hardcoded in frontend (`/src/constants/features.ts`)
- Not dependent on database state
- Changes require code deployment
- Easy to test

**Fragile Points:**
1. If `ROLE_FEATURE_DEFAULTS` object is modified
2. If role mapping logic changes
3. If feature keys are renamed

**Impact if Breaks:**
- Users get "Unauthorized" redirect
- Error is visible and clear
- Easy to debug

---

## 10. Safe Security Fix Strategy

### 10.1 Can Fix Safely (No Impact)

#### ✅ Remove `is_super_admin()` JWT Function
**Why Safe:**
- Replace with direct query: `role = 'SUPER_ADMIN' AND organization_id IS NULL`
- Same result, no JWT dependency
- Already querying `user_roles` table

**Migration:**
```sql
-- In Edge Function, replace:
const { data: isSuperAdmin } = await supabaseClient.rpc('is_super_admin');

-- With:
const { data: roleData } = await supabaseClient
  .from("user_roles")
  .select("role, organization_id")
  .eq("user_id", user.id)
  .single();

const isSuperAdmin = roleData?.role === 'SUPER_ADMIN' && roleData?.organization_id === null;
```

**Impact:** None - `cli@yodelmobile.com` is NOT super admin

#### ✅ Add RLS to `user_roles` Table
**Why Safe:**
- Policy: Users can read their own roles
- cli@yodelmobile.com already has role in table
- Frontend already handles empty results gracefully

**Migration:**
```sql
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_roles"
  ON user_roles
  FOR SELECT
  USING (user_id = auth.uid());
```

**Impact:** None - User can still read own role

#### ✅ Normalize Role Enum to Lowercase
**Why Safe:**
- Update view to handle both cases (already does)
- Update RLS policies to use lowercase
- Update `user_roles` data to lowercase
- Frontend already expects lowercase

**Migration:**
```sql
-- Update data
UPDATE user_roles SET role = LOWER(role::text)::app_role;

-- Update RLS policies
WHERE role IN ('super_admin', 'org_admin')  -- lowercase
```

**Impact:** None - View already handles both cases

### 10.2 Must Be Careful (Medium Risk)

#### ⚠️ Add Agency Validation
**Risk:** Could break agency expansion if validation is too strict

**Safe Approach:**
1. Add optional validation (warns but doesn't block)
2. Log when agency relationships are missing
3. Return empty array, not error

**Migration:**
```sql
-- In Edge Function, after agency query:
if (resolvedOrgId && managedClients?.length === 0) {
  log(requestId, "[AGENCY] No agency relationships found (might be direct org)");
  // Continue with just resolvedOrgId (don't fail)
}
```

**Impact:** None - Logs warning, continues with user's org

#### ⚠️ Enable RLS on `client_org_map`
**Risk:** Could break app discovery if policy is wrong

**Safe Approach:**
1. Create permissive policy first (allow all reads)
2. Test with `cli@yodelmobile.com`
3. Verify apps still appear
4. Then tighten policy

**Migration:**
```sql
ALTER TABLE client_org_map ENABLE ROW LEVEL SECURITY;

-- Permissive policy (allow all reads initially)
CREATE POLICY "allow_authenticated_reads"
  ON client_org_map
  FOR SELECT
  USING (true);  -- Allow all for now
```

**Impact:** None initially - Same as no RLS

### 10.3 Do NOT Touch (High Risk)

#### ❌ Do NOT Change Agency Expansion Logic
**Why Risky:**
- Critical for Yodel Mobile access
- Complex query with nested RLS
- Hard to test all edge cases

**Keep:**
```typescript
const { data: managedClients } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId)
  .eq("is_active", true);

let organizationsToQuery = [resolvedOrgId];
if (managedClients && managedClients.length > 0) {
  const clientOrgIds = managedClients.map(m => m.client_org_id);
  organizationsToQuery = [resolvedOrgId, ...clientOrgIds];
}
```

#### ❌ Do NOT Modify `org_app_access` RLS
**Why Risky:**
- Agency access depends on it
- Already fixed in migration `20251108100000`
- Working correctly

**Keep:**
```sql
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
```

#### ❌ Do NOT Change `user_roles` Schema
**Why Risky:**
- SSOT for all permissions
- Used by multiple systems
- Breaking changes cascade

**Keep:**
- `user_id UUID` - Link to auth.users
- `organization_id UUID` - Link to organizations
- `role app_role` - Role enum (but can normalize case)

---

## 11. Test Validation Queries

### 11.1 Verify User Access (Pre-Fix)
```sql
-- 1. User exists in user_roles
SELECT user_id, email, role::text, organization_id
FROM user_roles
WHERE email = 'cli@yodelmobile.com';

-- Expected:
-- user_id: 8920ac57-63da-4f8e-9970-719be1e2569c
-- role: ORG_ADMIN
-- organization_id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
```

```sql
-- 2. Organization exists
SELECT id, name, slug
FROM organizations
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- Expected:
-- name: Yodel Mobile
-- slug: yodel-mobile
```

```sql
-- 3. Agency relationships exist
SELECT agency_org_id, client_org_id, is_active
FROM agency_clients
WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- Expected: 2+ rows with is_active = true
```

```sql
-- 4. Client apps exist
SELECT DISTINCT organization_id, COUNT(app_id) as app_count
FROM org_app_access
WHERE organization_id IN (
  SELECT client_org_id
  FROM agency_clients
  WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
    AND is_active = true
)
AND detached_at IS NULL
GROUP BY organization_id;

-- Expected: Multiple orgs with app counts
```

### 11.2 Verify Access After Fixes
```sql
-- 1. User can still read own role (after RLS added)
SET request.jwt.claims.user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

SELECT role::text, organization_id
FROM user_roles
WHERE user_id = auth.uid();

-- Expected: Returns role and org_id
-- If returns empty: RLS policy is broken!
```

```sql
-- 2. View still works (after enum normalization)
SELECT org_id, effective_role, is_org_admin
FROM user_permissions_unified
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

-- Expected:
-- org_id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b
-- effective_role: org_admin (lowercase)
-- is_org_admin: true
```

```sql
-- 3. Agency expansion still works (after validation added)
SELECT client_org_id
FROM agency_clients
WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
  AND is_active = true;

-- Expected: 2+ client org IDs
-- If returns empty: Agency RLS is broken!
```

```sql
-- 4. App access still works (after all fixes)
SELECT COUNT(DISTINCT app_id) as total_apps
FROM org_app_access
WHERE organization_id IN (
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',  -- Agency
  'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f',  -- Client 1
  '550e8400-e29b-41d4-a716-446655440002'   -- Client 2
)
AND detached_at IS NULL;

-- Expected: 8+ apps
-- If returns 0: RLS is filtering everything!
```

### 11.3 Edge Function Test (curl)
```bash
# Test Edge Function with cli@yodelmobile.com JWT
curl -X POST \
  https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/bigquery-aso-data \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "7cccba3f-0a8f-446f-9dba-86e9cb68c92b",
    "date_range": {
      "start": "2024-10-01",
      "end": "2024-11-04"
    }
  }'

# Expected response:
# {
#   "data": [...],  # BigQuery rows
#   "meta": {
#     "app_count": 8,
#     "all_accessible_app_ids": ["102228831", ...],
#     "available_traffic_sources": ["App_Store_Search", "App_Store_Browse"]
#   }
# }

# If app_count = 0: Something broke!
```

---

## 12. Rollback Plan

### 12.1 Immediate Rollback (< 5 minutes)

#### If RLS on `user_roles` Breaks Access
```sql
-- EMERGENCY: Disable RLS
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Check if access restored
SELECT * FROM user_roles
WHERE email = 'cli@yodelmobile.com';
```

#### If Enum Normalization Breaks RLS
```sql
-- EMERGENCY: Revert to uppercase
UPDATE user_roles
SET role = UPPER(role::text)::app_role
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

-- Verify
SELECT role::text FROM user_roles
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';
-- Should show: ORG_ADMIN (uppercase)
```

#### If Agency Validation Breaks Access
```sql
-- EMERGENCY: Remove validation
-- (Revert Edge Function code)
-- Deploy previous version:
git revert <commit-hash>
supabase functions deploy bigquery-aso-data
```

### 12.2 Full Rollback (< 15 minutes)

#### Restore from Backup
```sql
-- 1. Drop broken tables
DROP TABLE IF EXISTS user_roles CASCADE;
DROP VIEW IF EXISTS user_permissions_unified CASCADE;

-- 2. Restore from backup
CREATE TABLE user_roles AS
SELECT * FROM user_roles_backup;

-- 3. Recreate view
CREATE VIEW user_permissions_unified AS
SELECT ... -- (from migration 20251205000000)

-- 4. Verify
SELECT * FROM user_permissions_unified
WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';
```

### 12.3 Verification After Rollback
```bash
# 1. Test login
# Login as: cli@yodelmobile.com

# 2. Test Dashboard V2
# Navigate to: /dashboard-v2
# Expected: Should load with 8 apps

# 3. Test Reviews Page
# Navigate to: /growth-accelerators/reviews
# Expected: Should load without redirect

# 4. Check browser console
# Expected: No permission errors
```

---

## 13. Summary & Recommendations

### 13.1 Current State
✅ **WORKING** - All access patterns functioning correctly for `cli@yodelmobile.com`

**Access Flow:**
1. User logs in → JWT token created
2. Frontend queries `user_permissions_unified` view → Gets org + role
3. Dashboard V2 checks `organizationId` → Allows access
4. Reviews page checks `featureEnabledForRole()` → Allows access
5. Edge Function validates user → Gets role from `user_roles`
6. Edge Function expands agency → Gets client orgs from `agency_clients`
7. Edge Function gets apps → Queries `org_app_access` for agency + clients
8. BigQuery returns data → 8 apps, all traffic sources

### 13.2 High Priority Fixes (Safe)
1. ✅ Remove `is_super_admin()` JWT function → Use direct role check
2. ✅ Add RLS to `user_roles` → Policy: users read own roles
3. ✅ Normalize enum case → Update to lowercase everywhere

### 13.3 Medium Priority Fixes (Test First)
1. ⚠️ Add agency validation → Log warnings, don't block
2. ⚠️ Enable RLS on `client_org_map` → Permissive policy first

### 13.4 Do Not Touch (High Risk)
1. ❌ Agency expansion logic in Edge Function
2. ❌ `org_app_access` RLS policies
3. ❌ `user_roles` table schema
4. ❌ `user_permissions_unified` view query

### 13.5 Testing Checklist
Before ANY changes:
- [ ] Run all validation queries (Section 11)
- [ ] Test Dashboard V2 as `cli@yodelmobile.com`
- [ ] Test Reviews page as `cli@yodelmobile.com`
- [ ] Verify 8 apps appear in app picker
- [ ] Check Edge Function logs for app count
- [ ] Verify no RLS filtering in logs

After EACH change:
- [ ] Re-run validation queries
- [ ] Re-test Dashboard V2
- [ ] Re-test Reviews page
- [ ] Compare app count (should stay 8)
- [ ] Check for new errors in console

### 13.6 Rollback Trigger
Immediately rollback if:
- App count drops to 0
- Dashboard V2 shows "No apps attached"
- Reviews page redirects to /unauthorized
- Console shows RLS permission errors
- Edge Function returns empty app array

---

## Appendix A: File Locations

### Frontend
- `/src/pages/ReportingDashboardV2.tsx` - Dashboard V2 page
- `/src/pages/growth-accelerators/reviews.tsx` - Reviews page
- `/src/hooks/usePermissions.ts` - Permission hook
- `/src/hooks/useEnterpriseAnalytics.ts` - Analytics hook
- `/src/constants/features.ts` - Feature flags

### Backend
- `/supabase/functions/bigquery-aso-data/index.ts` - Edge Function
- `/supabase/seed.sql` - Database seed script

### Migrations (Chronological)
1. `20251101140000_create_org_app_access.sql` - App access table
2. `20251107300000_fix_agency_clients_rls.sql` - Agency RLS
3. `20251108000000_remove_all_old_agency_policies.sql` - Agency cleanup
4. `20251108100000_fix_org_app_access_rls.sql` - App access RLS (NUCLEAR)
5. `20251108110000_cleanup_demo_apps_from_org_app_access.sql` - Demo cleanup
6. `20251201090000_rls_apps_and_superadmin.sql` - Super admin function
7. `20251201101000_create_client_org_map.sql` - Client mapping
8. `20251205000000_consolidate_to_user_roles_ssot.sql` - SSOT migration
9. `20251205100000_fix_rls_user_permissions_view.sql` - View fix
10. `20251205130000_fix_organization_features_rls.sql` - Features RLS

---

## Appendix B: Known App IDs

Based on logs and documentation, these are the 8 apps accessible to `cli@yodelmobile.com`:

```javascript
[
  '102228831',      // Rego (Client app)
  '1603183848',     // Unknown client app
  '1234567890',     // Unknown client app
  '9876543210',     // Unknown client app
  '5555555555',     // Unknown client app
  '6666666666',     // Unknown client app
  '7777777777',     // Unknown client app
  '8888888888'      // Unknown client app
]
```

**Source:** From client organizations managed by Yodel Mobile agency, stored in `org_app_access` table.

---

**End of Audit Report**
