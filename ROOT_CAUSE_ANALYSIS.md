# Root Cause Analysis: Keyword Intelligence Menu Not Showing

**Date**: 2025-11-08
**User**: cli@yodelmobile.com
**Issue**: "Keyword Intelligence" menu item not visible in sidebar, user redirected from /growth-accelerators/keywords

---

## 🎯 ROOT CAUSE IDENTIFIED

### Primary Issue: `useUserProfile` Query Failing

**Location**: `src/hooks/useUserProfile.ts:24-32`

**Error**:
```
PGRST201: Could not embed because more than one relationship was found for 'profiles' and 'organizations'

Details:
- profiles_org_id_fkey using profiles(org_id) and organizations(id)
- profiles_organization_id_fkey using profiles(organization_id) and organizations(id)

Hint: Try changing 'organizations' to one of the following:
  'organizations!profiles_org_id_fkey'
  'organizations!profiles_organization_id_fkey'
```

**Query That's Failing**:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select(`
    *,
    organizations(name, subscription_tier, slug),  // ❌ AMBIGUOUS
    user_roles(role, organization_id)
  `)
  .eq('id', user.id)
  .single();
```

---

## 🔗 Cascading Failure Chain

### Step 1: Profile Query Fails
- `useUserProfile` returns `null` or incomplete data
- `profile.user_roles` is empty
- `profile.organization_id` is null

### Step 2: Feature Access Hook Can't Get Organization
```typescript
// src/hooks/useFeatureAccess.ts:18
const organizationId = profile?.user_roles?.[0]?.organization_id || profile?.organization_id;
// Result: organizationId = null ❌
```

### Step 3: Falls Back to Enterprise Core Features
```typescript
// src/hooks/useFeatureAccess.ts:20-27
if (!organizationId) {
  console.warn('[ENTERPRISE-FALLBACK] User has no organization_id');
  setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));  // ❌ Only 5 features
  setLoading(false);
  return;
}
```

**Enterprise Core Features** (src/utils/enterpriseSafeGuards.ts):
- app_core_access
- profile_management  
- preferences
- analytics
- app_intelligence

**Missing**: `keyword_intelligence` ❌

### Step 4: Menu Filtering Hides Keyword Intelligence
```typescript
// src/utils/navigation.ts:35
const hasFeatureAccess = !item.featureKey || hasFeature(item.featureKey);
// hasFeature('keyword_intelligence') returns false ❌
```

---

## 🔧 THE FIX

**File**: `src/hooks/useUserProfile.ts` (line 28)

**Change**:
```typescript
organizations!profiles_organization_id_fkey(name, subscription_tier, slug, settings),
```

This disambiguates which FK relationship PostgREST should use.

---

## ✅ Database State (All Correct)

- user_roles: org_id mapped correctly ✅
- user_permissions_unified: returns correct data ✅  
- organization_features: keyword_intelligence enabled ✅

The database is correct. Only the frontend query is broken.

---

**Fix Required**: 1-line code change in useUserProfile.ts
**Risk**: Low
**Confidence**: 95%
