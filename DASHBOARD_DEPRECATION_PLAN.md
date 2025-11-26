# Dashboard Deprecation Plan

**Date:** 2025-11-25
**Goal:** Safely deprecate `/dashboard` and migrate to `/dashboard-v2`

---

## Current Situation

### Routes in App.tsx
1. `/dashboard` → `<Dashboard />` (lines 119-121)
2. `/dashboard/executive` → `<Overview />` (line 127-129)
3. `/dashboard/analytics` → `<Dashboard />` (line 131-133)
4. `/dashboard/conversion-rate` → `<ConversionAnalysis />` (line 135-137)
5. `/dashboard-v2` → `<ReportingDashboardV2 />` (line 123-125) ✅ NEW

### References Found (9 locations)

#### 1. Navigation on Sign-In
- **SignInForm.tsx:59** - `navigate('/dashboard');`
- **SignInForm.tsx:70** - `navigate('/dashboard');`

#### 2. Auth Redirect Pages
- **auth/sign-in.tsx:22** - `<Navigate to="/dashboard" replace />`
- **auth/sign-up.tsx:22** - `<Navigate to="/dashboard" replace />`

#### 3. Fallback/Error Redirects
- **SuperAdminGuard.tsx:21** - `<Navigate to="/dashboard" replace />`
- **apps.tsx:328** - `<Link to="/dashboard">`
- **preview.tsx:77** - `<a href="/dashboard">`

#### 4. Feature Guard Redirects
- **growth-accelerators/keywords.tsx:67** - `<Navigate to="/dashboard" replace />`
- **growth-accelerators/AppReviewDetailsPage.tsx:114** - `<Navigate to="/dashboard" replace />`
- **growth-accelerators/reviews.tsx:255** - `<Navigate to="/dashboard" replace />`

---

## Migration Strategy

### Phase 1: Update All References (Safe)
Change all `/dashboard` references to `/dashboard-v2`

**Why safe:**
- Both routes will exist temporarily
- No breaking changes
- Can test thoroughly before removing old route

### Phase 2: Add Redirect (Transition)
Add a redirect from `/dashboard` to `/dashboard-v2`

**Why useful:**
- Catches any missed references
- Helps users with bookmarks
- Provides smooth transition

### Phase 3: Remove Old Components (Cleanup)
- Remove old Dashboard component import
- Remove old routes
- Remove legacy files

**Only after thorough testing**

---

## Detailed Action Plan

### Step 1: Update Navigation References ✅ SAFE

**Files to modify:**
1. `src/components/Auth/SignInForm.tsx` (2 locations)
2. `src/pages/auth/sign-in.tsx`
3. `src/pages/auth/sign-up.tsx`
4. `src/components/Auth/SuperAdminGuard.tsx`
5. `src/pages/apps.tsx`
6. `src/pages/preview.tsx`
7. `src/pages/growth-accelerators/keywords.tsx`
8. `src/pages/growth-accelerators/AppReviewDetailsPage.tsx`
9. `src/pages/growth-accelerators/reviews.tsx`

**Change:** `/dashboard` → `/dashboard-v2`

### Step 2: Update App.tsx Routes

**Option A: Redirect (Recommended)**
```tsx
// Replace line 119-121
<Route
  path="/dashboard"
  element={<Navigate to="/dashboard-v2" replace />}
/>

// Keep /dashboard-v2 as is
<Route
  path="/dashboard-v2"
  element={<ProtectedRoute><ReportingDashboardV2 /></ProtectedRoute>}
/>
```

**Option B: Remove Completely**
```tsx
// Just delete lines 119-121
// Users going to /dashboard will hit 404, then redirect
```

### Step 3: Handle Sub-Routes

Current sub-routes under `/dashboard`:
- `/dashboard/executive` → Keep (points to Overview)
- `/dashboard/analytics` → Remove or redirect to `/dashboard-v2`
- `/dashboard/conversion-rate` → Keep (points to ConversionAnalysis)

**Recommendation:** Keep sub-routes if they're used, just remove the base `/dashboard` route.

### Step 4: Remove Old Dashboard Component

After all references updated and tested:
```tsx
// Remove this line from App.tsx (line 26)
import Dashboard from "./pages/dashboard";
```

Then optionally delete:
- `src/pages/dashboard.tsx` (or rename to `dashboard.legacy.tsx` for safety)

---

## Risk Assessment

### LOW RISK ✅
- Updating navigation references
- Adding redirect route
- Testing in dev environment

### MEDIUM RISK ⚠️
- Removing old Dashboard import (if something we missed imports it)
- Changing auth flow redirects

### HIGH RISK 🚨
- Deleting the actual dashboard file (can always restore from git)

---

## Testing Checklist

After each change, verify:

- [ ] Sign in redirects to correct dashboard
- [ ] Sign up redirects to correct dashboard
- [ ] Direct navigation to `/dashboard` works (redirects)
- [ ] Direct navigation to `/dashboard-v2` works
- [ ] Sub-routes still work (`/dashboard/executive`, etc.)
- [ ] SuperAdmin guard redirects correctly
- [ ] Growth accelerator pages redirect correctly
- [ ] No console errors
- [ ] Check browser network tab for failed loads

---

## Rollback Plan

If something breaks:

**Quick Fix:**
```tsx
// Re-add the old route temporarily
<Route
  path="/dashboard"
  element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
/>
```

**Git Rollback:**
```bash
git checkout -- src/App.tsx
git checkout -- src/components/Auth/SignInForm.tsx
# etc...
```

---

## Recommended Order of Execution

1. ✅ Update all 9 navigation references to `/dashboard-v2`
2. ✅ Test sign in/up flow
3. ✅ Test all affected pages
4. ✅ Add redirect from `/dashboard` → `/dashboard-v2` in App.tsx
5. ✅ Remove old Dashboard component import
6. ⏸️ Keep old dashboard file for 1 week (safety)
7. ✅ Delete old dashboard file after verification period

---

## Questions to Answer

1. **Are there any external links** (emails, documentation) pointing to `/dashboard`?
   - If yes: Keep redirect permanently

2. **Do users have bookmarks** to `/dashboard`?
   - If yes: Keep redirect for smooth transition

3. **Is the old Dashboard component** used anywhere else?
   - Check imports before deleting

---

## After Migration Complete

**Update documentation:**
- Internal docs
- User guides
- API documentation (if any)
- Onboarding flows

**Monitor:**
- Server logs for 404s to `/dashboard`
- User feedback
- Error tracking tools

---

**Ready to proceed?**

Start with Step 1 (updating references) - it's the safest approach and won't break anything!
