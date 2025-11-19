# Console Logging Cleanup - Audit & Implementation Plan

**Date**: 2025-11-08
**Purpose**: Prepare application for production deployment by cleaning up verbose, repetitive console logging
**Status**: ⏳ Planning Phase

---

## 🔍 Executive Summary

**Current State**: Console flooded with 100+ redundant logs per minute
**Root Cause**: Unstable query keys, per-render logging, legacy debug code
**Goal**: Production-ready logging with feature-flag controlled verbosity

**Impact**:
- ✅ Security: No sensitive data in production logs
- ✅ Performance: Reduced console overhead
- ✅ Enterprise: Professional, structured logging
- ✅ Debugging: Optional verbose mode for development

---

## 📊 Logging Issues by File

### 1. usePermissions.ts
**Current**: 20-100 logs/minute
```
🔄 [DEV] Permissions Cache Config: {...}
🔍 [DEV] Query State: {...}
🔍 [usePermissions] RETURNING organizationId: ...
🔍 [usePermissions] FULL RETURN: {...}
✅ [DEV] Unified permissions loaded: {...}
[TIMING-AUDIT] ... RESOLVED ...
[AUDIT] Organization slug loaded ...
```

**Issues**:
- Unstable query key causes re-execution
- Logs every render even when data unchanged
- Duplicate timing/audit logs
- Verbose JSON dumps

**Fix**:
```typescript
// Keep only:
✅ [usePermissions] Loaded org=7ccc..., role=org_admin, superAdmin=false

// Remove:
❌ [DEV] Query State
❌ [FULL RETURN] dumps
❌ Duplicate timing logs

// Add feature flag:
if (PERMISSIONS_DEBUG) { /* detailed logs */ }
```

---

### 2. useAccessControl.ts
**Current**: Every render
```
🔍 [useAccessControl] Received from usePermissions: {...}
```

**Issues**:
- Duplicates identical payloads
- No change detection

**Fix**:
```typescript
// Only log on change:
useEffect(() => {
  if (orgIdChanged || roleChanged) {
    console.log('[useAccessControl] org=7ccc..., role=ORG_ADMIN');
  }
}, [organizationId, effectiveRole]);
```

---

### 3. AppSidebar.tsx
**Current**: Continuous flood
```
🔍 DEMO DETECTION VALIDATION {org:null, isDemoOrg:false, ...}
🔍 [SIDEBAR] Feature access debug: {...}
🔍 AppSidebar Permission Debug: {...}
```

**Issues**:
- Runs every render
- Demo detection always false
- Feature access debug verbose

**Fix**:
```typescript
// Gate behind flag:
if (SIDEBAR_DEBUG) {
  console.log('[Sidebar] Loaded access: org_admin, AI_Hub=false, Reviews=false');
}

// Remove:
❌ DEMO DETECTION VALIDATION
❌ Feature access debug dumps
```

---

### 4. useFeatureAccess.ts
**Current**: Repeated stack traces
```
42P01: relation "public.org_feature_entitlements" does not exist
[ENTERPRISE-FALLBACK] Failed to fetch organization features ...
```

**Issues**:
- Same SQL error dozens of times
- Raw stack traces in console

**Fix**:
```typescript
// Log once per mount:
const loggedErrorsRef = useRef(new Set());

if (!loggedErrorsRef.current.has('missing_table')) {
  console.warn('[FeatureAccess] Missing table org_feature_entitlements – fallback to defaults');
  loggedErrorsRef.current.add('missing_table');
}

// Production: no stack traces
if (process.env.NODE_ENV === 'production') {
  // Structured error only
}
```

---

### 5. BigQueryAppSelector.tsx
**Current**: Conflicting org IDs, repeated errors
```
[DEBUG] BigQueryAppSelector state: {...}
permission denied for table org_users_deprecated
```

**Issues**:
- State logged every render
- Deprecated table errors
- Conflicting org IDs (dbdb... vs 7ccc...)

**Fix**:
```typescript
// Log only on change:
useEffect(() => {
  console.log(`[BigQueryAppSelector] org=${orgId}, apps=${apps.length}, loading=${loading}`);
}, [orgId, apps.length, loading]);

// Remove:
❌ Deprecated table logs
❌ Per-render state dumps
```

---

### 6. ReportingDashboardV2.tsx
**Current**: Visual blocks every re-render
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 [DASHBOARD-V2] Rendering
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Organization: ...
Date Range: ...
Hook Result: ...
```

**Issues**:
- Repeats dozens of times
- Visual separators add noise
- Logs undefined data

**Fix**:
```typescript
// Only log on data change:
useEffect(() => {
  if (data) {
    console.log(`[DashboardV2] Data loaded: ${data.meta?.raw_rows || 0} rows, source=${data.meta?.data_source}, date=${dateRange.start}`);
  }
}, [data, dateRange]);

// Remove:
❌ Visual separators (━━━)
❌ Rendering logs
❌ Undefined data logs

// Gate behind flag:
if (DASHBOARD_DEBUG) { /* detailed logs */ }
```

---

## 🛠️ Implementation Plan

### Phase 1: Create Logging Utility (30 min)
**File**: `src/utils/logger.ts`

```typescript
// Feature flags from environment
const DEBUG_FLAGS = {
  PERMISSIONS: import.meta.env.VITE_DEBUG_PERMISSIONS === 'true',
  SIDEBAR: import.meta.env.VITE_DEBUG_SIDEBAR === 'true',
  DASHBOARD: import.meta.env.VITE_DEBUG_DASHBOARD === 'true',
  FEATURE_ACCESS: import.meta.env.VITE_DEBUG_FEATURE_ACCESS === 'true',
  LEGACY: import.meta.env.VITE_DEBUG_LEGACY === 'true',
};

export const logger = {
  permissions: (message: string, data?: any) => {
    if (DEBUG_FLAGS.PERMISSIONS) {
      console.log(`[usePermissions] ${message}`, data);
    }
  },
  
  sidebar: (message: string, data?: any) => {
    if (DEBUG_FLAGS.SIDEBAR) {
      console.log(`[Sidebar] ${message}`, data);
    }
  },
  
  dashboard: (message: string, data?: any) => {
    if (DEBUG_FLAGS.DASHBOARD) {
      console.log(`[DashboardV2] ${message}`, data);
    }
  },
  
  featureAccess: (message: string, data?: any) => {
    if (DEBUG_FLAGS.FEATURE_ACCESS) {
      console.log(`[FeatureAccess] ${message}`, data);
    }
  },
  
  // Always log errors, but structure them
  error: (context: string, message: string, error?: any) => {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[${context}] ${message}`);
    } else {
      console.error(`[${context}] ${message}`, error);
    }
  },
  
  // One-time logs (uses ref to track)
  once: (key: string, message: string, data?: any) => {
    const logged = (globalThis as any).__loggedOnce || new Set();
    if (!logged.has(key)) {
      console.log(message, data);
      logged.add(key);
      (globalThis as any).__loggedOnce = logged;
    }
  }
};
```

### Phase 2: Clean Up usePermissions.ts (45 min)
**Changes**:
1. Memoize query key to prevent unstable object
2. Remove [DEV] Query State logs
3. Remove [FULL RETURN] dumps
4. Remove duplicate timing/audit logs
5. Keep one summary log on successful load
6. Gate detailed logs behind PERMISSIONS_DEBUG

**Before**:
```typescript
console.log('🔄 [DEV] Permissions Cache Config:', {...});
console.log('🔍 [DEV] Query State:', {...});
console.log('🔍 [usePermissions] RETURNING organizationId:', orgId);
console.log('🔍 [usePermissions] FULL RETURN:', {...});
console.log('[TIMING-AUDIT] ...);
console.log('[AUDIT] ...');
```

**After**:
```typescript
// On successful load only:
logger.once('permissions-loaded', 
  `[usePermissions] Loaded org=${orgId}, role=${role}, superAdmin=${isSuperAdmin}`
);

// Detailed debugging (dev only):
logger.permissions('Query executed', { orgId, role });
```

### Phase 3: Clean Up useAccessControl.ts (20 min)
**Changes**:
1. Add usePrevious hook to detect changes
2. Only log when org/role changes
3. Remove repetitive dumps

**Before**:
```typescript
console.log('🔍 [useAccessControl] Received from usePermissions:', {...});
```

**After**:
```typescript
const prevOrgId = usePrevious(organizationId);
const prevRole = usePrevious(effectiveRole);

useEffect(() => {
  if (prevOrgId !== organizationId || prevRole !== effectiveRole) {
    console.log(`[useAccessControl] org=${organizationId?.slice(0,8)}..., role=${effectiveRole}`);
  }
}, [organizationId, effectiveRole]);
```

### Phase 4: Clean Up AppSidebar.tsx (30 min)
**Changes**:
1. Remove DEMO DETECTION VALIDATION
2. Gate feature access logs behind SIDEBAR_DEBUG
3. Log once after permissions load

**Before**:
```typescript
console.log('🔍 DEMO DETECTION VALIDATION', {...});
console.log('🔍 [SIDEBAR] Feature access debug:', {...});
```

**After**:
```typescript
logger.sidebar(`Loaded access: ${role}, AI_Hub=${hasAiHub}, Reviews=${hasReviews}`);
```

### Phase 5: Clean Up useFeatureAccess.ts (30 min)
**Changes**:
1. Use logger.once for missing table error
2. Suppress stack traces in production
3. Limit to one warning per mount

**Before**:
```typescript
console.error('42P01: relation "public.org_feature_entitlements" does not exist');
console.log('[ENTERPRISE-FALLBACK] Failed to fetch...');
```

**After**:
```typescript
logger.once('missing-feature-table', 
  '[FeatureAccess] Missing table org_feature_entitlements – fallback to defaults'
);

logger.error('FeatureAccess', 'Failed to fetch features', 
  process.env.NODE_ENV !== 'production' ? error : undefined
);
```

### Phase 6: Clean Up BigQueryAppSelector.tsx (25 min)
**Changes**:
1. Log only on state change (useEffect)
2. Remove deprecated table warnings
3. Remove per-render dumps

**Before**:
```typescript
console.log('[DEBUG] BigQueryAppSelector state:', {...});
console.error('permission denied for table org_users_deprecated');
```

**After**:
```typescript
useEffect(() => {
  console.log(`[BigQueryAppSelector] org=${orgId?.slice(0,8)}..., apps=${apps.length}, loading=${loading}`);
}, [orgId, apps.length, loading]);
```

### Phase 7: Clean Up ReportingDashboardV2.tsx (25 min)
**Changes**:
1. Remove visual separators
2. Gate behind DASHBOARD_DEBUG
3. Log only on data change

**Before**:
```typescript
console.log('━'.repeat(60));
console.log('📊 [DASHBOARD-V2] Rendering');
console.log('   Organization:', org);
// ... many lines
```

**After**:
```typescript
useEffect(() => {
  if (data) {
    logger.dashboard(`Data loaded: ${data.meta?.raw_rows || 0} rows, source=${data.meta?.data_source}`);
  }
}, [data]);
```

### Phase 8: Clean Up dashboard.tsx (KPIs Overview) (15 min)
**Changes**:
1. Remove visual separators
2. Gate behind DASHBOARD_DEBUG
3. Consistent with v2

---

## 🎯 Success Criteria

### Quantitative
- [ ] Console logs reduced by >90%
- [ ] No logs repeat more than once per state change
- [ ] Zero stack traces in production
- [ ] All logs use standardized prefixes

### Qualitative
- [ ] Developer can enable verbose logging with env vars
- [ ] Production logs are professional and minimal
- [ ] Errors are clear and actionable
- [ ] No sensitive data in logs

---

## 🔐 Security Considerations

### Data to NEVER Log
- ❌ User emails (full)
- ❌ Organization IDs (full) - use `.slice(0,8)...`
- ❌ API keys or tokens
- ❌ Personal information
- ❌ SQL query parameters with user data

### Safe to Log
- ✅ Organization ID (first 8 chars)
- ✅ Role names
- ✅ Feature flags (boolean)
- ✅ Data counts (not content)
- ✅ Route paths

---

## 📁 Files to Modify

### Core Hooks (High Priority)
1. `src/hooks/usePermissions.ts` - Remove repetitive logs
2. `src/hooks/useAccessControl.ts` - Log only on change
3. `src/hooks/useFeatureAccess.ts` - Limit error logs

### UI Components (Medium Priority)
4. `src/components/AppSidebar.tsx` - Gate debug logs
5. `src/components/BigQueryAppSelector.tsx` - Log state changes only
6. `src/pages/ReportingDashboardV2.tsx` - Remove visual noise
7. `src/pages/dashboard.tsx` - Match v2 logging

### Utilities (New)
8. `src/utils/logger.ts` - Create logging utility

---

## 🧪 Testing Plan

### Manual Testing
1. Enable all debug flags: verify detailed logs appear
2. Disable all flags: verify console is quiet
3. Trigger errors: verify structured error messages
4. Check production build: verify no sensitive data

### Automated Checks
```bash
# Search for problematic patterns:
grep -r "console.log.*FULL RETURN" src/
grep -r "console.log.*Query State" src/
grep -r "━━━" src/
grep -r "console.error.*org_users_deprecated" src/
```

---

## 🚀 Deployment Checklist

Before production:
- [ ] All logging cleaned up
- [ ] Logger utility implemented
- [ ] Environment variables documented
- [ ] No sensitive data logged
- [ ] Production build tested
- [ ] Console is quiet by default
- [ ] Debug flags documented in README

---

## 📋 Environment Variables

Add to `.env.example`:
```bash
# Debug Logging (development only)
VITE_DEBUG_PERMISSIONS=false
VITE_DEBUG_SIDEBAR=false
VITE_DEBUG_DASHBOARD=false
VITE_DEBUG_FEATURE_ACCESS=false
VITE_DEBUG_LEGACY=false
```

---

## 📊 Estimated Time

| Phase | Task | Time |
|-------|------|------|
| 1 | Logger utility | 30 min |
| 2 | usePermissions | 45 min |
| 3 | useAccessControl | 20 min |
| 4 | AppSidebar | 30 min |
| 5 | useFeatureAccess | 30 min |
| 6 | BigQueryAppSelector | 25 min |
| 7 | ReportingDashboardV2 | 25 min |
| 8 | dashboard.tsx | 15 min |
| 9 | Testing | 30 min |
| **Total** | | **~4 hours** |

---

## 🎯 Next Steps

1. **Review this audit** - Confirm approach
2. **Create logger utility** - Implement feature flags
3. **Systematic cleanup** - One file at a time
4. **Test thoroughly** - Verify no regressions
5. **Document** - Update README with debug flags
6. **Deploy** - Production-ready logging

---

**Status**: 📋 Ready for implementation
**Confidence**: High (clear plan, well-scoped)
**Risk**: Low (backwards compatible with feature flags)
