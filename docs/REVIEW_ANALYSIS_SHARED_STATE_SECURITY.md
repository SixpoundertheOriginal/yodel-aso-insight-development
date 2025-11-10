# Review Analysis Shared State - Security Documentation

**Date:** 2025-01-10
**Feature:** Shared State Management for Reviews & Theme Analysis
**Implementation:** React Context + localStorage with validation

---

## Overview

This document describes the security considerations and implementation details for the shared state management system between the Reviews page and Theme Analysis page.

## Architecture

### Components

1. **ReviewAnalysisContext** (`src/contexts/ReviewAnalysisContext.tsx`)
   - React Context provider for shared state
   - Manages selected app state across pages
   - Integrates with React Query for monitored apps data

2. **ReviewAnalysisProviderWrapper** (`src/contexts/ReviewAnalysisProviderWrapper.tsx`)
   - Wrapper component that extracts organizationId from usePermissions
   - Provides context to the entire application

3. **Consumer Pages**
   - Reviews page (`src/pages/growth-accelerators/reviews.tsx`)
   - Theme Impact page (`src/pages/growth-accelerators/theme-impact.tsx`)

---

## Security Model

### 1. **State Storage: Hybrid Approach**

**In-Memory (Primary)**
- Selected app state stored in React Context during session
- Fast access, no I/O overhead
- Cannot be tampered with externally
- Lost on page refresh (addressed by localStorage backup)

**localStorage (Backup)**
- Provides persistence across page refreshes
- Used only as a backup/cache mechanism
- **CRITICAL**: All stored data is validated before use

### 2. **Validation Chain**

#### Staleness Check
```typescript
const STALENESS_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

if (now - storedApp.lastSelectedAt > STALENESS_THRESHOLD) {
  // Reject stale data
  return false;
}
```

**Why:** Prevents using outdated app data that may no longer be monitored.

#### Monitored App Verification
```typescript
const isStillMonitored = monitoredApps.some(
  app =>
    app.app_store_id === storedApp.appStoreId &&
    app.primary_country === storedApp.country &&
    app.id === storedApp.monitoredAppId
);
```

**Why:** Ensures the stored app is still in the user's monitored apps list. Prevents:
- Access to apps removed from monitoring
- Cross-organization data leakage
- Stale app references

#### Organization Scope
```typescript
const { data: monitoredApps } = useQuery({
  queryKey: ['monitored-apps', organizationId],
  queryFn: async () => {
    const { data } = await supabase
      .from('monitored_apps')
      .select('*')
      .eq('organization_id', organizationId);
    return data;
  }
});
```

**Why:** Monitored apps are scoped to organization via RLS policies. The validation only accepts apps that belong to the user's organization.

---

## Security Guarantees

### ✅ **Guaranteed Safe**

1. **No Cross-Organization Access**
   - Monitored apps are filtered by `organization_id` via RLS
   - Stored app is validated against current org's monitored apps
   - If user switches organizations, stored app is invalidated

2. **No Stale Data Usage**
   - Data older than 24 hours is automatically rejected
   - User must re-select app if data is stale

3. **No Unauthorized App Access**
   - Only apps currently monitored by the organization can be selected
   - If app is removed from monitoring, stored state is invalidated

4. **No Client-Side Tampering Impact**
   - Even if localStorage is manually edited, validation rejects invalid data
   - Monitored app check is server-backed (Supabase query with RLS)

### ⚠️ **Limitations**

1. **localStorage Can Be Viewed**
   - **Impact:** Low
   - **Reason:** Data stored (app name, ID, icon URL) is not sensitive
   - **Mitigation:** No secret keys, tokens, or PII stored

2. **Client-Side State Management**
   - **Impact:** Low
   - **Reason:** All critical validation happens against server data
   - **Mitigation:** Backend RLS policies enforce organization scope

---

## Data Flow

### Reviews → Theme Analysis

```
1. User selects app in Reviews page
   ↓
2. Reviews.tsx saves to shared state via setSelectedApp()
   ↓
3. Context validates app is monitored
   ↓
4. Context saves to localStorage + in-memory state
   ↓
5. User navigates to Theme Analysis
   ↓
6. ThemeImpact.tsx reads from shared state
   ↓
7. Context validates stored app (staleness + monitored check)
   ↓
8. If valid: Auto-loads app and triggers analysis
   If invalid: Clears state, prompts for selection
```

### Direct Theme Analysis Access

```
1. User navigates directly to Theme Analysis
   ↓
2. Context attempts to load from localStorage
   ↓
3. Validation checks:
   - Is data stale? (< 24 hours)
   - Is app still monitored?
   - Does app belong to current organization?
   ↓
4. If valid: Restores app selection
   If invalid: Auto-selects first monitored app
```

---

## RLS Integration

The shared state system relies on Supabase RLS policies for security:

### Relevant RLS Policies

**monitored_apps table:**
```sql
-- Users can only see apps from their organization
CREATE POLICY "Users can view monitored apps for their organization"
ON monitored_apps FOR SELECT
USING (organization_id = auth.jwt() ->> 'organizationId');
```

**theme_impact_scores table:**
```sql
-- Scores are scoped to monitored apps (which are org-scoped)
CREATE POLICY "Users can view theme scores for their monitored apps"
ON theme_impact_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM monitored_apps
    WHERE monitored_apps.id = theme_impact_scores.monitored_app_id
    AND monitored_apps.organization_id = auth.jwt() ->> 'organizationId'
  )
);
```

---

## Potential Attack Vectors & Mitigations

### Attack: localStorage Tampering

**Scenario:** Attacker edits localStorage to inject different app ID

**Mitigation:**
1. Validation checks if app exists in user's monitored apps (server query)
2. If not found: State is cleared, user prompted to select valid app
3. No unauthorized data access possible

**Status:** ✅ Mitigated

---

### Attack: Stale Data Exploitation

**Scenario:** User removes app from monitoring, localStorage still contains reference

**Mitigation:**
1. Validation checks if app is still in monitored apps list
2. If removed: State is cleared
3. User cannot access analysis for removed apps

**Status:** ✅ Mitigated

---

### Attack: Cross-Organization Access

**Scenario:** User switches organizations, localStorage contains app from previous org

**Mitigation:**
1. Monitored apps query is scoped to current `organizationId`
2. Validation compares stored app against current org's apps
3. If not found: State is cleared

**Status:** ✅ Mitigated

---

## Implementation Checklist

- [x] Context created with validation logic
- [x] localStorage persistence implemented
- [x] Staleness check (24 hour threshold)
- [x] Monitored app verification
- [x] Organization scoping via RLS
- [x] Reviews page integration
- [x] Theme Analysis page integration
- [x] Error handling for invalid state
- [x] Auto-selection fallback (first monitored app)
- [x] Security documentation

---

## Future Enhancements

### Short-Term
- [ ] Add unit tests for validation logic
- [ ] Add E2E tests for page navigation flow
- [ ] Monitor localStorage usage (storage quota)

### Long-Term
- [ ] Consider encrypted localStorage (if PII is added)
- [ ] Add audit logging for app selection changes
- [ ] Implement state sync across browser tabs (BroadcastChannel API)

---

## Contact

For questions about this implementation:
- **Security concerns:** Check RLS policies in Supabase dashboard
- **State management:** See `src/contexts/ReviewAnalysisContext.tsx`
- **Integration:** See `src/pages/growth-accelerators/reviews.tsx` and `theme-impact.tsx`

---

**Last Updated:** 2025-01-10
**Reviewed By:** Claude (AI Assistant)
**Status:** ✅ Implemented & Documented
