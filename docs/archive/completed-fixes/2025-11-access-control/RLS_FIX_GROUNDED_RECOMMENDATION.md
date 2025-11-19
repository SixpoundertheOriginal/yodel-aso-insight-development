# RLS Fix - Grounded Recommendation (Evidence-Based Analysis)

**Date**: 2025-11-09
**Status**: 🟡 **CONFLICTING EVIDENCE - REQUIRES USER DECISION**
**Purpose**: Ground recommendation in ACTUAL documented architecture (not assumptions)

---

## 🔍 What I Found: Conflicting Evidence

After re-reading all relevant MD files, I discovered **contradictory evidence** about what the intended role enum casing should be.

---

## 📊 Evidence Analysis

### **Evidence FOR UPPERCASE (Database Should Use UPPERCASE)**

#### **Source 1: ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md**

**File Metadata:**
- Version: 2.0
- Last Updated: 2025-12-21 (future date - possibly incorrect or placeholder)
- Status: Production
- Size: 60KB (comprehensive architectural standard)

**Line 134 - EXPLICIT STATEMENT:**
```markdown
**Enum normalization**: Frontend uses lowercase (`super_admin`), database uses uppercase (`SUPER_ADMIN`)
```

**Line 114-122 - Enum Definition:**
```sql
CREATE TYPE app_role AS ENUM (
  'SUPER_ADMIN',      -- Platform-level super admin
  'ORG_ADMIN',        -- Organization administrator
  'ASO_MANAGER',      -- ASO manager role
  'ANALYST',          -- Data analyst role
  'VIEWER',           -- Read-only viewer
  'CLIENT'            -- External client
);
```

**Line 154-177 - View Design:**
```sql
-- Role flags (handle both uppercase and lowercase enum values)
(ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
(ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,

-- Normalized role (lowercase for frontend consistency)
CASE
  WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
  WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
  ...
END AS effective_role
```

**Interpretation:**
- **Database layer**: UPPERCASE enum values
- **View layer**: Handles both cases, normalizes to lowercase
- **Frontend layer**: Receives lowercase via `effective_role` column

---

#### **Source 2: Migration 20251205000000 (Dec 5, 2025)**

**File**: `supabase/migrations/20251205000000_consolidate_to_user_roles_ssot.sql`

**Line 42:**
```sql
role = 'ORG_ADMIN'::app_role  -- ✅ Correct uppercase enum value
```

**Line 120-143 - View Definition:**
```sql
CREATE VIEW user_permissions_unified AS
SELECT
  ur.user_id,
  ur.organization_id AS org_id,
  ur.role::text AS role,
  -- Role flags (handle both uppercase and lowercase enum values)
  (ur.role::text IN ('SUPER_ADMIN', 'super_admin')) AS is_super_admin,
  (ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')) AS is_org_admin,
  -- Normalized role (lowercase for frontend consistency)
  CASE
    WHEN ur.role::text IN ('SUPER_ADMIN', 'super_admin') THEN 'super_admin'
    WHEN ur.role::text IN ('ORG_ADMIN', 'org_admin') THEN 'org_admin'
    ...
  END AS effective_role
...
```

**Line 143 - Comment:**
```sql
COMMENT ON VIEW user_permissions_unified IS
  'Handles both uppercase (ORG_ADMIN) and lowercase (org_admin) enum values.';
```

**Interpretation:**
- Uses UPPERCASE in data: `'ORG_ADMIN'::app_role`
- View designed to HANDLE BOTH cases
- Comment explicitly mentions both uppercase and lowercase

---

#### **Source 3: PHASE_2_COMPLETE.md (Nov 7, 2025)**

**Line 88-94:**
```sql
-- Super admin bypass
EXISTS (
  SELECT 1
  FROM user_roles
  WHERE user_id = auth.uid()
    AND role = 'SUPER_ADMIN'  -- Uses UPPERCASE
)
```

**Status**: ✅ SUCCESS
**Date**: November 7, 2025
**Context**: Migration deployed successfully using UPPERCASE

---

#### **Source 4: ENTERPRISE_ARCHITECTURE_RLS_MIGRATION_PLAN.md**

**Lines 649, 667, 787:**
```sql
AND role IN ('ORG_ADMIN', 'SUPER_ADMIN')  -- All examples use UPPERCASE
```

**Pattern**: Comprehensive RLS migration plan uses UPPERCASE throughout

---

#### **Source 5: 12 Production Migrations (Oct 27 - Nov 7)**

**All use UPPERCASE in RLS policies:**
- `20251027120000_create-organization-apps.sql`
- `20250106000000_create_monitored_apps.sql`
- `20251107000000_create_app_competitors.sql`
- `20251107300000_fix_agency_clients_rls.sql`
- (8 more migrations...)

**Pattern**: Consistent UPPERCASE usage across all migrations

---

### **Evidence FOR lowercase (Database Should Use lowercase)**

#### **Source 1: Migration 20251108220000 (Nov 8, 2025)**

**File**: `supabase/migrations/20251108220000_phase2_normalize_role_enum.sql`

**Line 2 - Title:**
```sql
-- PHASE 2: Consistency Improvement - Normalize Role Enum to Lowercase
```

**Line 10-16 - Background:**
```sql
-- Currently there's inconsistency in role enum values:
-- - Database: 'ORG_ADMIN', 'SUPER_ADMIN' (uppercase)
-- - Frontend: 'org_admin', 'super_admin' (lowercase)
-- - user_permissions_unified view: Converts to lowercase for compatibility
--
-- This causes confusion and potential bugs. Best practice is to normalize
-- to lowercase everywhere to match PostgreSQL conventions and frontend expectations.
```

**Line 24:**
```sql
-- IMPACT: ZERO for current functionality, IMPROVES consistency
```

**Line 58-67:**
```sql
-- Update ORG_ADMIN → org_admin
UPDATE public.user_roles
SET role = 'org_admin'::app_role
WHERE role::text = 'ORG_ADMIN';

-- Update SUPER_ADMIN → super_admin
UPDATE public.user_roles
SET role = 'super_admin'::app_role
WHERE role::text = 'SUPER_ADMIN';
```

**Line 122:**
```sql
COMMENT ON VIEW public.user_permissions_unified IS
'Unified view of user permissions. Roles are now stored in lowercase consistently.';
```

**Interpretation:**
- Claims "best practice" is lowercase
- Claims "ZERO impact" (but broke system!)
- Changed database values to lowercase

---

## ⚖️ Weighing the Evidence

### **UPPERCASE (Architectural Standard):**
✅ Official 60KB architecture document
✅ 12 production migrations (Oct 27 - Nov 7)
✅ Migration 20251205000000 (Dec 5) uses UPPERCASE
✅ PHASE_2_COMPLETE.md success report (Nov 7)
✅ Enterprise architecture document
✅ View designed to HANDLE both cases

**Weight**: 6 sources, comprehensive documentation

### **lowercase (One Migration's Opinion):**
⚠️ Migration 20251108220000 (Nov 8)

**Weight**: 1 source, recent change

---

## 🚨 The Conflict

### **Timeline Analysis:**

**Before Nov 8:**
- Database: UPPERCASE
- RLS Policies: Check for UPPERCASE
- View: Handles both, returns lowercase
- System: ✅ WORKING

**Nov 8 (Migration 20251108220000 deployed):**
- Changed database to lowercase
- Did NOT update RLS policies
- View: Still handles both
- System: ❌ BROKEN (403 errors)

**Current State:**
- Database: lowercase (changed Nov 8)
- RLS Policies: Check for UPPERCASE (not updated)
- View: Handles both (unchanged)
- System: ❌ BROKEN

---

## 🎯 The Question

**Which standard should we follow?**

### **Option A: Follow ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md (UPPERCASE)**

**Rationale:**
- Line 134 explicitly states: "database uses uppercase (`SUPER_ADMIN`)"
- This is the 60KB v2.0 architectural standard
- 12 migrations follow this pattern
- Minimal code changes (revert one migration)

**Action:**
- Revert database values to UPPERCASE
- RLS policies stay unchanged (already correct)
- View stays unchanged (already handles both)

**Risk**: VERY LOW

### **Option B: Follow Migration 20251108220000 (lowercase)**

**Rationale:**
- Migration claims "best practice" is lowercase
- Migration claims "PostgreSQL conventions"
- One migration's opinion

**Action:**
- Keep database as lowercase
- Update 40+ RLS policies across 12 migrations
- Update ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md
- Update all architecture docs

**Risk**: VERY HIGH

---

## 🔍 Evidence Quality Assessment

### **UPPERCASE Evidence Quality: ⭐⭐⭐⭐⭐ HIGH**

1. **Official Documentation**: 60KB v2.0 Production architecture doc
2. **Explicit Statement**: Line 134 says "database uses uppercase"
3. **Consistent Pattern**: 12 migrations, 2 weeks of development
4. **Working System**: System worked before Nov 8
5. **View Design**: Designed to handle both cases
6. **Migration Comments**: "✅ Correct uppercase enum value" (line 42, migration 20251205000000)

### **lowercase Evidence Quality**: ⭐⭐ LOW

1. **Single Migration**: Only one migration advocates lowercase
2. **Contradicts Docs**: Contradicts ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md
3. **Broke System**: Caused 403 errors (claim of "ZERO impact" was false)
4. **No RLS Updates**: Did not update dependent policies
5. **PostgreSQL Claim**: Claim about "PostgreSQL conventions" is debatable (enums often uppercase)

---

## 📋 My Grounded Recommendation

**Based on the evidence, I recommend: REVERT TO UPPERCASE (Option A)**

**Reasoning:**

1. **Official Architecture Document Says UPPERCASE**
   Line 134 of ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md is explicit

2. **Working Pattern Before Nov 8**
   System worked with UPPERCASE for 2 weeks (Oct 27 - Nov 7)

3. **Minimal Risk**
   Reverting one migration vs. rewriting 40+ policies

4. **View Design Supports It**
   View was designed to handle both cases and normalize

5. **Evidence Weight**
   6 comprehensive sources (UPPERCASE) vs. 1 migration (lowercase)

---

## ⚠️ HOWEVER: This Requires Your Decision

I found **contradictory evidence**. I cannot definitively say which is "correct" without knowing:

1. **Is ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md outdated?**
   - Last Updated: 2025-12-21 (future date - typo?)
   - Was it written before migration 20251108220000?

2. **What was the INTENT of migration 20251108220000?**
   - Was it approved by you?
   - Was it supposed to update RLS policies but missed them?
   - Was it an experiment that broke things?

3. **What is your PREFERRED standard going forward?**
   - Do you want UPPERCASE (matches docs)?
   - Do you want lowercase (matches one migration)?

---

## 🎯 My Recommendation (If You Trust the Architecture Doc)

**Assume ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md is authoritative:**

### **Create Migration: 20251109040000_revert_to_uppercase_roles.sql**

```sql
-- Revert to UPPERCASE per ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md:134
-- "Enum normalization: Frontend uses lowercase, database uses uppercase"

UPDATE user_roles
SET role = CASE role::text
  WHEN 'org_admin' THEN 'ORG_ADMIN'::app_role
  WHEN 'super_admin' THEN 'SUPER_ADMIN'::app_role
  WHEN 'aso_manager' THEN 'ASO_MANAGER'::app_role
  WHEN 'analyst' THEN 'ANALYST'::app_role
  WHEN 'viewer' THEN 'VIEWER'::app_role
  WHEN 'client' THEN 'CLIENT'::app_role
  ELSE role
END
WHERE role::text IN ('org_admin', 'super_admin', 'aso_manager', 'analyst', 'viewer', 'client');

-- Update is_super_admin_db function
CREATE OR REPLACE FUNCTION public.is_super_admin_db()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'SUPER_ADMIN'::app_role
  );
$$;
```

**Impact:**
- ✅ Fixes all 403 errors immediately
- ✅ No RLS policy changes needed
- ✅ Aligns with documented architecture
- ✅ View continues to work (handles both cases)

---

## 🔍 Questions for You

Before implementing, please clarify:

1. **Is ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md current?**
   - Is line 134 ("database uses uppercase") still accurate?
   - Or was this doc written before migration 20251108220000?

2. **Did you approve migration 20251108220000?**
   - Was changing to lowercase intentional?
   - Or was it a mistake/experiment?

3. **What is your preferred standard?**
   - UPPERCASE (matches architecture doc, 12 migrations, low risk)
   - lowercase (matches one migration, high risk, requires policy rewrites)

---

## 📊 Summary

**Conflicting Evidence:**
- UPPERCASE: 6 sources (architecture doc, 12 migrations, working system)
- lowercase: 1 source (migration 20251108220000)

**My Assessment:**
- UPPERCASE is grounded in official architecture documentation
- lowercase is grounded in one migration that broke the system

**My Recommendation:**
- **Revert to UPPERCASE** (Option A)
- Aligns with ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md line 134
- Minimal risk, immediate fix

**Your Decision Needed:**
- Confirm architecture doc is authoritative
- OR clarify if lowercase was intentional and doc is outdated

---

**Status**: ⏸️ Awaiting user clarification on architectural standard
**Recommendation**: Revert to UPPERCASE (grounded in 6 sources vs. 1)
**Risk**: LOW (revert) vs. HIGH (commit to lowercase)
