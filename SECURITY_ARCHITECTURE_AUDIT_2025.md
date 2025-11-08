# Security and Architecture Audit Report
## Authentication System, RLS Policies, and Data Access Patterns

**Audit Date:** November 8, 2025
**System:** Yodel ASO Insight Platform
**Auditor:** Claude Code Agent
**Scope:** Complete authentication flow, RLS policies, multi-tenant isolation, and Edge Function security

---

## Executive Summary

This audit examines a multi-tenant SaaS platform with complex organizational relationships, including:
- **Multi-tenant isolation** between organizations
- **Agency-client hierarchical relationships** (agencies can access client data)
- **Role-based access control** (SUPER_ADMIN, ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER)
- **Feature-flag based permissions** (organization_features table)
- **Edge Function authentication** using Supabase auth + RLS
- **App access control** (org_app_access table) for BigQuery analytics data

### Overall Risk Level: **MEDIUM**

The system shows evidence of recent security hardening (nuclear option migrations to fix RLS policies), but several gaps and architectural inconsistencies remain that require immediate attention.

---

## 1. Current State Summary

### ✅ What's Working Well

#### 1.1 Unified Authentication System
- **Single Source of Truth (SSOT):** Migrated from dual-table system (org_users + user_roles) to unified `user_roles` table
- **Centralized auth utilities:** `/supabase/functions/_shared/auth-utils.ts` provides consistent permission resolution
- **Unified view:** `user_permissions_unified` aggregates permissions with proper precedence

#### 1.2 Recent Security Hardening
- **Migration 20251108000000:** Nuclear option applied to `agency_clients` - dropped ALL old policies, recreated only 4 standardized policies
- **Migration 20251108100000:** Nuclear option applied to `org_app_access` - same approach
- **Migration 20251107300000:** Fixed `agency_clients` RLS to use `user_roles` instead of deprecated table
- **Migration 20251205130000:** Fixed `organization_features` RLS policies

#### 1.3 Edge Function Auth Pattern
- Consistent use of `resolveAuthContext()` in modern Edge Functions
- Proper JWT token forwarding via Authorization header
- Super admin bypass implemented consistently
- Feature-flag checking via `hasFeatureAccess()`

#### 1.4 Multi-Tenant Isolation
- RLS enabled on all critical tables
- Policies consistently check `organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())`
- Super admin bypass consistently implemented

---

## 2. Security Findings

### 🔴 HIGH Severity Issues

#### H-1: Inconsistent Super Admin Detection
**Location:** Multiple files
**Issue:** Two different mechanisms for super admin detection:

1. **RLS Policies:** Check `role = 'SUPER_ADMIN' AND organization_id IS NULL`
2. **Edge Function (bigquery-aso-data):** Uses RPC function `is_super_admin()` which reads from JWT claim `auth.jwt() ->> 'is_superadmin'`

**Risk:**
- JWT claim `is_superadmin` may not be set correctly in all scenarios
- Inconsistency between database-level checks and application-level checks
- Potential for privilege escalation if JWT is manipulated

**Evidence:**
```sql
-- Migration: 20251201090000_rls_apps_and_superadmin.sql
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce( (auth.jwt() ->> 'is_superadmin')::boolean, false );
$$;
```

vs.

```sql
-- Migration: 20251108000000_remove_all_old_agency_policies.sql
EXISTS (
  SELECT 1
  FROM user_roles
  WHERE user_id = auth.uid()
    AND role = 'SUPER_ADMIN'
    AND organization_id IS NULL
)
```

**Recommendation:**
- Standardize on ONE mechanism: database-backed (`user_roles` table) is more secure
- Remove JWT-based `is_super_admin()` function
- Ensure JWT claims are only used for initial session establishment, not authorization

---

#### H-2: Agency Access Control Bypass Potential
**Location:** `/supabase/functions/bigquery-aso-data/index.ts` (lines 271-296)
**Issue:** Agency mode logic in Edge Function may allow unauthorized data access

**Code:**
```typescript
// Build list of organizations to query (self + managed clients)
let organizationsToQuery = [resolvedOrgId];
if (managedClients && managedClients.length > 0) {
  const clientOrgIds = managedClients.map(m => m.client_org_id);
  organizationsToQuery = [resolvedOrgId, ...clientOrgIds];
}

// [ACCESS] Get app access for ALL organizations (agency + managed clients)
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)
  .is("detached_at", null);
```

**Risk:**
- If `agency_clients` table is compromised or RLS fails, agency can access ANY client's data
- No verification that the requesting user actually has permission to the agency organization
- Query expansion happens in application code, not enforced by RLS

**Recommendation:**
- Move agency access expansion into RLS policy or database function
- Add explicit permission check: verify user has ORG_ADMIN or higher role in agency organization before expanding access
- Log all agency-mode data access for audit trail

---

#### H-3: Missing RLS on Critical Tables
**Location:** Database schema
**Issue:** Not all tables have RLS enabled

**Missing RLS:**
- `client_org_map` - No RLS enabled (migration 20251201101000)
- `organizations` - RLS status unknown (created in multiple migrations but no explicit ENABLE statement found)
- `profiles` - RLS status unknown
- Potentially others not covered in migrations

**Risk:**
- If RLS is not enabled, ALL authenticated users can read ALL rows
- Data leakage across organizational boundaries
- Potential GDPR/compliance violation

**Recommendation:**
- Audit ALL tables in production database with query:
  ```sql
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```
- Enable RLS on all tables containing organizational data
- Create explicit policies for each table

---

### 🟠 MEDIUM Severity Issues

#### M-1: Inconsistent Role Enum Values
**Location:** Multiple migrations
**Issue:** Mix of uppercase and lowercase role values

**Evidence:**
```sql
-- Migration handles both:
CASE
  WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
  WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
```

**Risk:**
- Potential for case-sensitivity bugs
- Policy mismatches if wrong case used
- Confusion during development

**Recommendation:**
- Enforce consistent casing via database constraint
- Add CHECK constraint: `CHECK (role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER'))`
- Update all existing rows to uppercase

---

#### M-2: Deprecated Table Still Accessible
**Location:** Migration 20251205000000
**Issue:** `org_users_deprecated` table still exists

**Code:**
```sql
ALTER TABLE org_users RENAME TO org_users_deprecated;
REVOKE ALL ON org_users_deprecated FROM authenticated;
REVOKE ALL ON org_users_deprecated FROM anon;
```

**Risk:**
- Could cause confusion
- May be referenced in old code paths
- Occupies database space

**Recommendation:**
- Drop `org_users_deprecated` after 30-day retention period (deadline: January 5, 2026)
- Add calendar reminder to execute DROP TABLE
- Verify no code references exist before dropping

---

#### M-3: Edge Function Service Role Usage
**Location:** Multiple Edge Functions
**Issue:** 17 Edge Functions reference `service_role` or `SUPABASE_SERVICE_ROLE_KEY`

**Functions:** admin-users, admin-features, create-org-admin-user, sync-bigquery-apps, and 13 others

**Risk:**
- Service role bypasses ALL RLS policies
- If misused, could allow unauthorized data access
- Credentials could be leaked via logs or error messages

**Recommendation:**
- Audit each function's use of service role - ensure it's truly necessary
- Where possible, use anon key + RLS instead of service role
- Implement strict input validation in service-role functions
- Add audit logging for all service-role operations

---

#### M-4: No Rate Limiting on Edge Functions
**Location:** All Edge Functions
**Issue:** No rate limiting or DDoS protection observed

**Risk:**
- Could be abused for denial-of-service
- Expensive BigQuery queries could be triggered repeatedly
- No protection against credential stuffing

**Recommendation:**
- Implement rate limiting at Supabase project level
- Add per-user rate limits in Edge Functions
- Consider implementing request throttling for expensive operations (BigQuery queries)

---

#### M-5: Detached Apps Not Consistently Filtered
**Location:** `/supabase/functions/bigquery-aso-data/index.ts` line 303
**Issue:** `detached_at IS NULL` filter applied, but no verification of orphaned data

**Code:**
```typescript
.is("detached_at", null);
```

**Risk:**
- Apps may be soft-deleted (`detached_at` set) but still appear in some queries
- Inconsistent handling of detached apps across the platform
- Potential for accessing apps that should no longer be visible

**Recommendation:**
- Create database view `active_org_app_access` that filters `detached_at IS NULL`
- Update all queries to use the view instead of raw table
- Add cleanup job to hard-delete old detached apps (e.g., after 90 days)

---

### 🟡 LOW Severity Issues

#### L-1: Hardcoded Organization IDs
**Location:** Multiple migrations
**Issue:** UUIDs hardcoded in migrations and seed files

**Examples:**
- `7cccba3f-0a8f-446f-9dba-86e9cb68c92b` (Yodel Mobile)
- `dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f` (Client 1)

**Risk:**
- Difficult to maintain across environments (dev, staging, prod)
- Could cause migration failures if IDs don't match
- Confusing for new developers

**Recommendation:**
- Use named constants or environment variables
- Consider using slug-based lookups instead of UUIDs in migrations
- Document all hardcoded IDs in README

---

#### L-2: Verbose Logging with Sensitive Data
**Location:** Edge Functions (especially bigquery-aso-data)
**Issue:** Extensive console.log statements may leak sensitive information

**Examples:**
```typescript
log(requestId, "[AUTH] Super admin check result", {
  isSuperAdmin,
  userId: user.id,
  userEmail: user.email
});
```

**Risk:**
- User emails, IDs, and roles logged to Supabase logs
- Potential privacy concern
- Could leak organizational structure

**Recommendation:**
- Review all log statements
- Remove user emails from logs
- Hash or truncate user IDs
- Add log level filtering (DEBUG vs PRODUCTION)

---

#### L-3: No Audit Trail for Data Access
**Location:** System-wide
**Issue:** No audit logging for sensitive operations

**Missing Audit Logs:**
- Who accessed which apps/data
- Agency viewing client data
- Admin role assignments
- Feature flag changes

**Recommendation:**
- Implement `audit_log` table
- Log all sensitive operations (agency access, admin actions, role changes)
- Add retention policy (e.g., 1 year)
- Create admin interface to view audit logs

---

#### L-4: Missing Foreign Key Constraints
**Location:** Database schema
**Issue:** Some relationships may not have FK constraints

**Example:**
```sql
-- org_app_access references organizations but:
organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
```

**Risk:**
- Orphaned records if organization deleted
- Data integrity issues
- Cascading deletes may be unintended

**Recommendation:**
- Review ALL foreign key constraints
- Decide on appropriate CASCADE/RESTRICT behavior
- Test deletion scenarios to ensure expected behavior

---

## 3. Architecture Issues

### A-1: Dual Permission Systems
**Issue:** Two parallel permission systems exist:
1. **Role-based:** `user_roles` table with role column
2. **Feature-based:** `organization_features` table with feature flags

**Problem:**
- Confusion about which to check for access control
- Some routes check roles, others check features
- No clear hierarchy or precedence

**Recommendation:**
- Document clear hierarchy: Super Admin > Feature Flags > Roles
- Standardize on feature flags for all access control
- Make roles purely informational (UI display)
- Create decision matrix document

---

### A-2: Inconsistent Edge Function Auth Patterns
**Issue:** Different Edge Functions use different auth approaches:
- Modern: `resolveAuthContext()` from auth-utils
- Legacy: Direct Supabase client queries
- Mixed: Some use RPC `is_super_admin()`, others check table directly

**Evidence:**
- `bigquery-aso-data`: Uses RPC `is_super_admin()` + direct queries
- `authorize`: Uses `resolveAuthContext()`
- Older functions: Inconsistent patterns

**Recommendation:**
- Migrate ALL Edge Functions to use `resolveAuthContext()`
- Deprecate RPC `is_super_admin()` function
- Create migration guide for updating old functions

---

### A-3: Agency-Client Model Lacks Formal Constraints
**Issue:** `agency_clients` table has minimal constraints

**Missing Constraints:**
- No check that agency_org_id ≠ client_org_id (prevent self-reference)
- No validation that agency org has "agency" type/flag
- No limit on relationship depth (could agency be client of another agency?)

**Recommendation:**
- Add CHECK constraint: `agency_org_id <> client_org_id`
- Add `is_agency` boolean flag to organizations table
- Add constraint: `agency_org_id` must reference org where `is_agency = true`
- Document relationship rules in schema

---

### A-4: No Soft Delete Pattern Consistency
**Issue:** Some tables use `detached_at` (org_app_access), but pattern not universal

**Inconsistency:**
- `org_app_access`: Uses `detached_at` timestamp
- `monitored_apps`: No soft delete column
- `agency_clients`: Uses `is_active` boolean (different pattern!)

**Recommendation:**
- Standardize on ONE soft delete pattern: `deleted_at TIMESTAMPTZ`
- Apply to ALL tables that need soft delete
- Create helper functions: `is_active(deleted_at)`, `soft_delete_row()`

---

### A-5: BigQuery Credentials in Environment Variables
**Issue:** BigQuery service account credentials stored in `BIGQUERY_CREDENTIALS` env var

**Code:**
```typescript
const credentialString = Deno.env.get("BIGQUERY_CREDENTIALS");
credentials = JSON.parse(credentialString);
```

**Risk:**
- Credentials logged if error occurs during parsing
- Exposed in Supabase dashboard environment variables page
- No rotation strategy visible

**Recommendation:**
- Use Supabase Vault for secret storage
- Implement credential rotation policy
- Never log credential strings
- Consider using workload identity federation instead of service account keys

---

## 4. Missing Policies and Gaps

### G-1: Tables Without Complete RLS Coverage

| Table | RLS Enabled? | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Notes |
|-------|--------------|---------------|---------------|---------------|---------------|-------|
| `organizations` | Unknown | Unknown | Unknown | Unknown | Unknown | **CRITICAL** |
| `profiles` | Unknown | Unknown | Unknown | Unknown | Unknown | **CRITICAL** |
| `user_roles` | Unknown | Likely Yes | Unknown | Unknown | Unknown | **CRITICAL** |
| `client_org_map` | **NO** | **NO** | **NO** | **NO** | **NO** | **HIGH RISK** |
| `org_app_access` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Recently fixed |
| `agency_clients` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Recently fixed |
| `organization_features` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Recently fixed |
| `monitored_apps` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Good coverage |
| `monitored_app_reviews` | ✅ Yes | Unknown | Unknown | Unknown | Unknown | Partial |
| `app_competitors` | ✅ Yes | Unknown | Unknown | Unknown | Unknown | Partial |
| `apps` | Unknown | ✅ Yes | ✅ Yes | ✅ Yes | Unknown | Partial |

**URGENT ACTION REQUIRED:**
1. Enable RLS on `client_org_map` immediately
2. Verify and document `organizations` table RLS
3. Verify and document `profiles` table RLS
4. Complete RLS policies for partial tables

---

### G-2: Missing Policies for Edge Cases

**Scenario:** User removed from organization
- **Gap:** User's `user_roles` entry deleted, but:
  - Active sessions may still have valid JWT
  - Cached permissions in Edge Functions
  - No immediate revocation mechanism

**Recommendation:**
- Implement JWT refresh check on every request
- Add `user_roles.is_active` flag instead of hard delete
- Implement real-time session revocation via Supabase auth admin

---

**Scenario:** Organization deleted
- **Gap:** What happens to users, apps, features?
- Cascading deletes defined for:
  - ✅ `org_app_access` (ON DELETE CASCADE)
  - ✅ `monitored_apps` (ON DELETE CASCADE)
  - ✅ `client_org_map` (ON DELETE CASCADE)
- Unknown for:
  - ❓ `user_roles`
  - ❓ `profiles`
  - ❓ `organization_features`
  - ❓ `agency_clients`

**Recommendation:**
- Document expected cascade behavior
- Add CASCADE or RESTRICT to all FK constraints
- Create safe organization deletion procedure
- Implement soft delete for organizations

---

**Scenario:** Agency relationship deactivated
- **Gap:** `agency_clients.is_active = false` but:
  - No automatic cleanup of agency user sessions
  - Active Edge Function calls may still use old relationships
  - No notification to agency users

**Recommendation:**
- Add trigger to notify on `is_active` change
- Implement session refresh on relationship change
- Add expiration timestamp for agency access (auto-cleanup)

---

### G-3: No Protection Against Horizontal Privilege Escalation

**Scenario:** User creates HTTP request with different `organization_id` in body
- **Current Protection:** Edge Functions validate via RLS
- **Gap:** Application code may trust `organization_id` from request

**Example Risk:**
```typescript
const { organization_id } = await req.json();
// If used directly without validation against user's actual org_id...
```

**Recommendation:**
- NEVER trust `organization_id` from client
- Always derive from authenticated user's permissions
- Add middleware to reject requests with org_id mismatch
- Log suspicious requests

---

### G-4: No Protection Against Timing Attacks

**Issue:** Permission checks may reveal information via response time
- Super admin check returns faster (no database query)
- Failed auth may return different error messages

**Recommendation:**
- Implement constant-time response for auth failures
- Use generic error messages
- Add random delay to failed auth attempts (rate limiting)

---

## 5. Testing Recommendations

### T-1: Multi-Tenant Isolation Tests

**Critical Scenarios to Test:**

1. **User A (Org 1) attempts to access User B's (Org 2) data:**
   ```sql
   -- Test: User from Org A queries apps from Org B
   SET LOCAL role = 'authenticated';
   SET LOCAL request.jwt.claims.sub = '<user_a_id>';

   SELECT * FROM org_app_access WHERE organization_id = '<org_b_id>';
   -- Expected: 0 rows (RLS should block)
   ```

2. **Agency user accesses client data:**
   ```sql
   -- Test: Verify agency can ONLY access active client relationships
   -- Should fail if is_active = false
   ```

3. **Super admin accesses any organization:**
   ```sql
   -- Test: Platform super admin (org_id NULL) can see all orgs
   ```

4. **Cross-organization app access:**
   ```sql
   -- Test: User cannot attach apps to other organizations
   INSERT INTO org_app_access (app_id, organization_id)
   VALUES ('test_app', '<other_org_id>');
   -- Expected: RLS policy violation
   ```

---

### T-2: Role Escalation Tests

**Scenarios:**

1. **VIEWER attempts to perform ADMIN action:**
   ```typescript
   // Test: VIEWER role tries to create agency relationship
   // Expected: 403 Forbidden
   ```

2. **ORG_ADMIN attempts to become SUPER_ADMIN:**
   ```sql
   UPDATE user_roles SET role = 'SUPER_ADMIN' WHERE user_id = auth.uid();
   -- Expected: RLS policy violation
   ```

3. **User modifies their own role:**
   ```sql
   UPDATE user_roles SET role = 'ORG_ADMIN'
   WHERE user_id = auth.uid() AND role = 'ANALYST';
   -- Expected: RLS policy should block
   ```

---

### T-3: Edge Function Security Tests

**Tests for bigquery-aso-data:**

1. **Missing auth header:** Returns 401
2. **Invalid JWT:** Returns 401
3. **Valid JWT but no organization:** Returns 403
4. **Request different org_id than user's org:** Returns 403 or filters correctly
5. **Agency user requests client data:** Returns client data if `is_active = true`
6. **Agency relationship deactivated:** Returns 403

**Tests for authorize:**

1. **Feature disabled:** Returns `{ allow: false }`
2. **Demo mode required but not demo org:** Returns `{ allow: false }`
3. **Platform admin route for non-super-admin:** Returns `{ allow: false }`

---

### T-4: Data Leakage Tests

**Scenarios:**

1. **Check for data in error messages:**
   - Trigger error with invalid org_id
   - Verify response doesn't contain other users' data

2. **Check BigQuery query scope:**
   - Verify WHERE clause always includes org restriction
   - Check that SQL injection isn't possible

3. **Check for JWT claims leakage:**
   - Verify JWT contents not logged
   - Check error responses don't expose JWT

---

### T-5: Race Condition Tests

**Scenarios:**

1. **Concurrent role changes:**
   - Change user role while user has active session
   - Verify permissions updated correctly

2. **Agency relationship deactivated during request:**
   - User starts BigQuery request
   - Agency relationship set to `is_active = false` mid-flight
   - Verify request fails or succeeds based on timestamp

3. **App detached during query:**
   - User queries app data
   - App `detached_at` set mid-query
   - Verify consistent results

---

## 6. Solidification Tasks (Prioritized)

### Priority 1: CRITICAL (Do Immediately)

1. **Enable RLS on `client_org_map` table**
   - **Estimated Effort:** 1 hour
   - **Risk if not done:** ANY authenticated user can see client-org mappings
   - **Migration:**
     ```sql
     ALTER TABLE client_org_map ENABLE ROW LEVEL SECURITY;

     CREATE POLICY "Users see their org client mappings"
     ON client_org_map FOR SELECT
     USING (
       organization_id IN (
         SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
       )
       OR EXISTS (
         SELECT 1 FROM user_roles
         WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN' AND organization_id IS NULL
       )
     );
     ```

2. **Audit RLS status on ALL tables**
   - **Estimated Effort:** 2 hours
   - **Action:** Run production query and verify EVERY table
   - **Script:**
     ```sql
     SELECT
       schemaname,
       tablename,
       rowsecurity,
       CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as status
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY rowsecurity, tablename;
     ```

3. **Fix super admin detection inconsistency**
   - **Estimated Effort:** 4 hours
   - **Action:**
     - Remove `is_super_admin()` RPC function
     - Update `bigquery-aso-data` to use table-based check
     - Update any other functions using RPC
   - **Testing:** Verify super admin can still access all orgs

4. **Add CHECK constraint for role enum values**
   - **Estimated Effort:** 2 hours
   - **Migration:**
     ```sql
     ALTER TABLE user_roles
     ADD CONSTRAINT role_valid_values
     CHECK (role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER'));

     -- Migrate any lowercase values
     UPDATE user_roles SET role = UPPER(role) WHERE role = LOWER(role);
     ```

---

### Priority 2: HIGH (Do This Week)

5. **Implement agency access permission check**
   - **Estimated Effort:** 6 hours
   - **Action:** In `bigquery-aso-data`, verify user has ORG_ADMIN role in agency before expanding access
   - **Code:**
     ```typescript
     // Before expanding to client orgs, verify user is agency admin
     const { data: agencyRole } = await supabase
       .from('user_roles')
       .select('role')
       .eq('user_id', user.id)
       .eq('organization_id', resolvedOrgId)
       .single();

     if (!agencyRole || !['ORG_ADMIN', 'SUPER_ADMIN'].includes(agencyRole.role)) {
       // User is not admin of agency, don't expand access
     }
     ```

6. **Add audit logging for sensitive operations**
   - **Estimated Effort:** 8 hours
   - **Tables:**
     ```sql
     CREATE TABLE audit_log (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       user_id UUID NOT NULL,
       organization_id UUID,
       action TEXT NOT NULL,
       resource_type TEXT,
       resource_id TEXT,
       old_values JSONB,
       new_values JSONB,
       ip_address TEXT,
       user_agent TEXT
     );
     ```

7. **Standardize soft delete pattern**
   - **Estimated Effort:** 6 hours
   - **Action:**
     - Add `deleted_at` column to all tables needing soft delete
     - Migrate `is_active` to `deleted_at` for `agency_clients`
     - Create helper view `active_agency_clients`

8. **Complete RLS policies for partial tables**
   - **Estimated Effort:** 4 hours per table
   - **Tables:** `monitored_app_reviews`, `app_competitors`, `apps`
   - **Pattern:** Follow same pattern as `monitored_apps`

---

### Priority 3: MEDIUM (Do This Month)

9. **Migrate all Edge Functions to `resolveAuthContext()`**
   - **Estimated Effort:** 16 hours (32 functions)
   - **Pattern:** Update each function to use centralized auth
   - **Testing:** Verify no regressions

10. **Implement rate limiting**
    - **Estimated Effort:** 8 hours
    - **Approach:**
      - Use Supabase project-level rate limiting
      - Add per-user limits in Edge Functions
      - Store in Redis or Supabase table

11. **Add organization deletion safeguards**
    - **Estimated Effort:** 6 hours
    - **Actions:**
      - Implement soft delete for organizations
      - Add FK constraints with appropriate CASCADE/RESTRICT
      - Create safe deletion procedure (admin function)

12. **Fix BigQuery credentials storage**
    - **Estimated Effort:** 4 hours
    - **Action:** Move to Supabase Vault
    - **Testing:** Verify BigQuery queries still work

13. **Add `is_agency` flag to organizations**
    - **Estimated Effort:** 3 hours
    - **Migration:**
      ```sql
      ALTER TABLE organizations ADD COLUMN is_agency BOOLEAN DEFAULT false;

      -- Mark existing agencies
      UPDATE organizations SET is_agency = true
      WHERE id IN (SELECT DISTINCT agency_org_id FROM agency_clients);

      -- Add constraint
      ALTER TABLE agency_clients ADD CONSTRAINT valid_agency_org
      CHECK (
        EXISTS (
          SELECT 1 FROM organizations
          WHERE id = agency_org_id AND is_agency = true
        )
      );
      ```

---

### Priority 4: LOW (Do Next Quarter)

14. **Remove hardcoded UUIDs from migrations**
    - **Estimated Effort:** 8 hours
    - **Action:** Create constants file, update migrations

15. **Reduce verbose logging**
    - **Estimated Effort:** 4 hours
    - **Action:** Add log level filtering, remove sensitive data

16. **Document all schema relationships**
    - **Estimated Effort:** 16 hours
    - **Deliverable:** ERD diagram + markdown documentation

17. **Implement session revocation**
    - **Estimated Effort:** 8 hours
    - **Action:** Add real-time checks, implement `is_active` flag

18. **Drop `org_users_deprecated` table**
    - **Estimated Effort:** 1 hour
    - **Date:** After January 5, 2026
    - **Migration:** `DROP TABLE org_users_deprecated;`

---

## 7. Architecture Recommendations

### R-1: Formalize Permission Hierarchy

Create a clear decision tree:

```
1. Is user authenticated?
   NO → 401 Unauthorized
   YES → Continue

2. Is user SUPER_ADMIN (role='SUPER_ADMIN' AND org_id IS NULL)?
   YES → Allow (bypass all checks)
   NO → Continue

3. Does user have organization membership?
   NO → 403 Forbidden
   YES → Continue

4. Is feature required?
   NO → Allow (default allow for routes without feature requirements)
   YES → Continue

5. Does user's organization have feature enabled?
   NO → 403 Forbidden (feature not enabled)
   YES → Continue

6. Is specific role required?
   NO → Allow
   YES → Check if user's role matches → Allow/Deny
```

**Document this in:** `/docs/AUTHORIZATION_FLOW.md`

---

### R-2: Create RLS Policy Templates

Standardize policy creation with templates:

**Template 1: Basic Organization Access**
```sql
CREATE POLICY "policy_name" ON table_name
FOR SELECT
USING (
  organization_id IN (
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

**Template 2: Agency-Aware Access**
```sql
CREATE POLICY "policy_name" ON table_name
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  )
  OR organization_id IN (
    SELECT client_org_id FROM agency_clients
    WHERE agency_org_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL
  )
);
```

**Document in:** `/docs/RLS_POLICY_TEMPLATES.md`

---

### R-3: Implement Defense in Depth

**Layer 1: Network** (Supabase)
- HTTPS only
- CORS restrictions
- Rate limiting

**Layer 2: Authentication** (Supabase Auth)
- JWT tokens
- Session management
- MFA (recommended)

**Layer 3: Authorization - RLS** (Database)
- Row-level security on ALL tables
- Consistent policy patterns
- Super admin bypass

**Layer 4: Application Logic** (Edge Functions)
- `resolveAuthContext()` on every request
- Feature flag checks
- Role verification

**Layer 5: Audit** (Logging)
- All sensitive operations logged
- Immutable audit trail
- Regular review process

---

### R-4: Create Security Checklist for New Features

Before deploying ANY new feature:

- [ ] RLS enabled on new tables?
- [ ] SELECT policy created?
- [ ] INSERT policy created?
- [ ] UPDATE policy created?
- [ ] DELETE policy created?
- [ ] Super admin bypass included?
- [ ] Agency access considered?
- [ ] Edge Function uses `resolveAuthContext()`?
- [ ] Feature flag created in `organization_features`?
- [ ] Audit logging implemented?
- [ ] Rate limiting considered?
- [ ] Foreign key constraints added?
- [ ] Soft delete pattern applied?
- [ ] Migration tested on staging?
- [ ] Rollback plan documented?

---

## 8. Compliance and Best Practices

### C-1: GDPR Considerations

**Data Subject Rights:**
- ✅ Right to access: Users can query their own data via RLS
- ⚠️ Right to deletion: Need safe deletion procedure
- ⚠️ Right to rectification: Need audit trail for changes
- ❌ Right to portability: No export mechanism implemented

**Recommendations:**
- Implement data export API
- Create user deletion workflow (cascade all related data)
- Add consent tracking table
- Document data retention policies

---

### C-2: SOC 2 Considerations

**Access Controls:**
- ✅ RLS provides logical access control
- ✅ Role-based access implemented
- ⚠️ Need audit logging for all privileged actions
- ⚠️ Need regular access reviews

**Recommendations:**
- Complete audit logging implementation
- Implement quarterly access reviews
- Add automated anomaly detection
- Document incident response plan

---

### C-3: Security Best Practices Checklist

- [x] HTTPS enforced
- [x] JWT-based authentication
- [x] Row-level security enabled (on most tables)
- [ ] All tables have RLS (gaps exist)
- [x] Input validation in Edge Functions
- [ ] Output encoding (not verified)
- [ ] SQL injection prevention (parameterized queries used)
- [x] XSS prevention (Supabase handles)
- [ ] CSRF protection (check if needed for POST endpoints)
- [x] Secrets in environment variables
- [ ] Secrets in vault (recommended upgrade)
- [ ] Rate limiting (missing)
- [ ] Audit logging (partial)
- [ ] Error handling without data leakage (needs review)
- [ ] Dependency scanning (unknown)
- [ ] Security headers (Supabase default)

---

## 9. Conclusion

### Summary of Risk Posture

**Strengths:**
- Recent security hardening shows commitment to security
- RLS policies exist on most critical tables
- Centralized authentication utilities (`auth-utils.ts`)
- Multi-tenant isolation generally well-implemented

**Weaknesses:**
- Inconsistent super admin detection mechanism
- Missing RLS on some tables
- Agency access control needs validation layer
- No comprehensive audit logging
- Service role used in many Edge Functions (bypasses RLS)

**Overall Assessment:**
The system has a **solid foundation** but requires **immediate attention** to several high-priority security gaps. The recent "nuclear option" migrations demonstrate good security awareness, but a more systematic approach is needed to prevent future issues.

### Recommended Immediate Actions (Week 1)

1. Enable RLS on `client_org_map` (1 hour)
2. Audit ALL tables for RLS status (2 hours)
3. Fix super admin detection inconsistency (4 hours)
4. Add role enum constraint (2 hours)

**Total Estimated Effort for Week 1:** ~9 hours

### Success Metrics

- **100% of tables** have RLS enabled
- **Zero** uses of JWT-based `is_super_admin()` (database-only)
- **All Edge Functions** use `resolveAuthContext()`
- **Audit logs** for 100% of sensitive operations
- **Zero** failed multi-tenant isolation tests

---

## Appendix A: Reference Architecture

### Current Table Relationships

```
organizations (1) ──< (N) user_roles
                ──< (N) org_app_access
                ──< (N) organization_features
                ──< (N) monitored_apps
                ──< (N) profiles

agency_clients: agency_org_id (N) ──< (1) organizations (1) ──> (N) client_org_id

user_roles ──> auth.users (Supabase Auth)
```

### Key Security Tables

| Table | Purpose | RLS Status | Critical Level |
|-------|---------|------------|----------------|
| `organizations` | Tenant isolation | Unknown | **CRITICAL** |
| `user_roles` | Permission SSOT | Likely Yes | **CRITICAL** |
| `org_app_access` | App access control | ✅ Fixed | **CRITICAL** |
| `agency_clients` | Agency relationships | ✅ Fixed | HIGH |
| `organization_features` | Feature flags | ✅ Fixed | HIGH |
| `client_org_map` | BigQuery mapping | ❌ **MISSING** | **CRITICAL** |

---

## Appendix B: Test Queries

### Verify RLS on All Tables
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity,
  CASE
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
```

### Check Policy Coverage
```sql
SELECT
  tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

### Find Tables Without Policies
```sql
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.tablename
      AND p.schemaname = 'public'
  )
ORDER BY t.tablename;
```

### Test Multi-Tenant Isolation
```sql
-- Attempt to access other org's data (should return 0 rows)
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims.sub = '<user_from_org_a>';

SELECT * FROM org_app_access
WHERE organization_id = '<org_b_id>';
-- Expected: 0 rows
```

---

## Document Version
- **Version:** 1.0
- **Date:** November 8, 2025
- **Next Review:** December 8, 2025
- **Owner:** Security Team / Engineering Lead

---

**END OF AUDIT REPORT**
