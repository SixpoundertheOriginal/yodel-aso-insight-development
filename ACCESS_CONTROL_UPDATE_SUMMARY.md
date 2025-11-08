# Access Control System Update - November 2025

**Date**: 2025-11-08  
**Impact**: Navigation menu filtering, organization-level access restrictions  
**Status**: Phase 1 Deployed, Phase 2 Ready (needs manual migration)

---

## Summary of Changes

### Problem Solved
Yodel Mobile users (org_admin role) were seeing full navigation menu (26 routes) when they should only see 7 reporting/analytics pages. This was due to role-based access control granting full access to all ORGANIZATION_ADMIN users, with no way to restrict specific organizations.

### Solution Implemented
2-Phase organization-level access control system:

**Phase 1 (Deployed ✅)**:
- Quick fix using hardcoded organization ID list
- Immediate restriction for Yodel Mobile
- File: `src/config/allowedRoutes.ts`

**Phase 2 (Ready 🚀)**:
- Database-driven `access_level` column on `organizations` table
- Scalable solution requiring only SQL updates for new restrictions
- Migration: `supabase/migrations/20251108300000_add_organization_access_level.sql`

---

## Technical Implementation

### New Database Schema

```sql
ALTER TABLE organizations
  ADD COLUMN access_level TEXT DEFAULT 'full'
  CHECK (access_level IN ('full', 'reporting_only', 'custom'));
```

**Values**:
- `'full'`: Access to all routes (default for existing orgs)
- `'reporting_only'`: Limited to 7 dashboard/analytics pages
- `'custom'`: Reserved for future per-org route customization

### Code Changes

**Files Modified**:
1. `src/config/allowedRoutes.ts`:
   - Added `organizationId` and `orgAccessLevel` parameters
   - Checks database access level before role-based logic
   - Keeps hardcoded fallback for backward compatibility

2. `src/hooks/useUserProfile.ts`:
   - Added `access_level` to fetched organization fields
   - Updated TypeScript types to include access_level

3. `src/components/AppSidebar.tsx`:
   - Uses new `useOrgAccessLevel()` hook
   - Passes `orgAccessLevel` to `getAllowedRoutes()`

**Files Created**:
4. `src/hooks/useOrgAccessLevel.ts`:
   - Helper hook to extract access level from user profile
   - Clean separation of concerns

### Access Control Flow

```
User Authentication
    ↓
useUserProfile fetches:
  - user_roles (role, organization_id)
  - organizations.access_level  ← NEW
    ↓
useOrgAccessLevel extracts access_level
    ↓
getAllowedRoutes() checks (in order):
  1. Database access_level === 'reporting_only' ?
     → Return DEMO_REPORTING_ROUTES (7 pages)
  2. Hardcoded organizationId in REPORTING_ONLY_ORGS ?
     → Return DEMO_REPORTING_ROUTES (fallback)
  3. isDemoOrg === true ?
     → Return DEMO_REPORTING_ROUTES
  4. role === 'VIEWER' or 'CLIENT' ?
     → Return DEMO_REPORTING_ROUTES
  5. Else:
     → Return DEMO_REPORTING_ROUTES + FULL_APP (26 routes)
    ↓
Sidebar filters navigation by allowed routes
```

---

## Usage

### To Restrict an Organization (Phase 2)

```sql
UPDATE organizations
SET access_level = 'reporting_only'
WHERE id = 'ORGANIZATION_ID_HERE';
```

**No code changes needed!**

### To Grant Full Access Again

```sql
UPDATE organizations
SET access_level = 'full'
WHERE id = 'ORGANIZATION_ID_HERE';
```

---

## Migration Status

**Phase 1**: ✅ Deployed in code (no migration needed)

**Phase 2**: ⚠️ Requires manual SQL execution
- See: `PHASE2_MANUAL_MIGRATION.md`
- Run SQL in Supabase SQL Editor
- Migration file: `supabase/migrations/20251108300000_add_organization_access_level.sql`

---

## Related Documentation

- **Analysis**: `ACCESS_CONTROL_ANALYSIS.md`
- **Implementation**: `IMPLEMENTATION_COMPLETE.md`
- **Manual Migration**: `PHASE2_MANUAL_MIGRATION.md`
- **Test Results**: `KEYWORD_ACCESS_TEST_RESULTS.md`

---

**Last Updated**: 2025-11-08
