# Phase F: Diagnostic Audit - Stale Metadata Investigation

**Date:** 2025-11-19
**Status:** 🔍 INVESTIGATING
**Issue:** User still seeing split name "Pimsleur" + subtitle "Language Learning" despite Phases A-E fixes

---

## Problem

After completing Phases A-E (all metadata pipeline fixes + cache invalidation), the user reports:

**Current Display (WRONG):**
- Name: "Pimsleur"
- Subtitle: "Language Learning"

**Expected Display (CORRECT):**
- Name: "Pimsleur | Language Learning"
- Subtitle: "" (empty)

**Affected Locations:**
- App header at top of page
- "Slide View" tab
- "Metadata" tab
- Element analysis cards

---

## Diagnostic Steps

### Step 1: Clear ALL Caches (CRITICAL)

**Browser:**
1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Under "Storage" → Click "Clear site data"
4. Check ALL boxes:
   - ✅ Cookies and site data
   - ✅ Cache storage
   - ✅ Application cache
   - ✅ Local storage
   - ✅ Session storage
   - ✅ IndexedDB
5. Click "Clear site data"
6. **Hard refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)

**React Query:**
- Should be cleared automatically by Phase E cache flush
- Verify by checking console for `[PHASE E] Removing stale metadata from React Query cache`

**Zustand:**
- Should be reset automatically by Phase E state reset
- Verify by checking console for Zustand reset logs

---

### Step 2: Fresh Import Test

1. Navigate to ASO AI Hub page: `/aso-ai-hub`
2. Open browser console (F12 → Console tab)
3. Type "Pimsleur" in search box
4. Click search
5. Select "Pimsleur | Language Learning" from modal
6. **PAUSE** - Do NOT proceed until you complete Step 3

---

### Step 3: Capture Console Logs

**CRITICAL:** We need to see the EXACT data flow through the pipeline.

In the console, look for these log prefixes (in order):

**1. Phase E Cache Flush:**
```
[PHASE E] Removing stale metadata from React Query cache
```

**2. Adapter Selection:**
```
[metadata-orchestrator] Trying adapter: appstore-edge
```
OR
```
[metadata-orchestrator] Trying adapter: itunes-lookup
```

**3. Edge Function Response (if using Edge):**
```
[DIAGNOSTIC-NAME-EDGE] BEFORE transform:
```

**4. iTunes Adapter Response (if using iTunes fallback):**
```
[ITUNES-SEARCH] 📦 Raw API data:
[ITUNES-SEARCH] 🎯 Final transformed metadata:
```

**5. Normalizer:**
```
[DIAGNOSTIC-NAME-NORMALIZER] BEFORE normalize:
[DIAGNOSTIC-NAME-NORMALIZER] AFTER normalize:
```

**6. Phase E Confirmation:**
```
[PHASE E CONFIRM] Using fresh metadata:
```

**7. AppSelectionModal:**
```
[DIAGNOSTIC-IMPORT-AppSelectionModal] BEFORE onSelect:
```

**8. AppAuditHub:**
```
[DIAGNOSTIC-IMPORT-AppAuditHub] WHEN metadata received:
```

**9. EnhancedOverviewTab:**
```
[ENHANCED-OVERVIEW-TAB] 🔍 Metadata received for analysis:
```

---

### Step 4: Paste Logs Here

**Expected Log Sequence (CORRECT):**

```
[PHASE E] Removing stale metadata...
[metadata-orchestrator] Trying adapter: appstore-edge
[DIAGNOSTIC-NAME-EDGE] BEFORE transform: {
  name: "Pimsleur | Language Learning",
  title: "Pimsleur | Language Learning",
  subtitle: "",
  fallbackName: "Pimsleur | Language Learning",
  fallbackSubtitle: "",
  _htmlExtraction: false
}
[DIAGNOSTIC-NAME-NORMALIZER] BEFORE normalize: {
  name: "Pimsleur | Language Learning",
  subtitle: ""
}
[PHASE E CONFIRM] Using fresh metadata: {
  name: "Pimsleur | Language Learning",
  subtitle: ""
}
[ENHANCED-OVERVIEW-TAB] Metadata received: {
  name: "Pimsleur | Language Learning",
  subtitle: ""
}
```

**Actual Logs (USER TO PASTE):**

```
(PASTE YOUR CONSOLE LOGS HERE)
```

---

## Hypotheses

### Hypothesis 1: Stale Browser Cache
**Test:** Step 1 (clear all caches) should fix this
**Evidence Needed:** Console shows old cached data being loaded
**Fix:** User clears browser cache and hard refreshes

### Hypothesis 2: iTunes Fallback Being Used
**Test:** Check console for which adapter is being used
**Evidence Needed:** Console shows `itunes-lookup` or `itunes-search` instead of `appstore-edge`
**Fix:** Edge Function may be failing, falling back to iTunes which uses old parsing

### Hypothesis 3: Edge Function Returning Wrong Data
**Test:** Check Edge Function response in console logs
**Evidence Needed:** `[DIAGNOSTIC-NAME-EDGE]` shows split name/subtitle
**Fix:** Edge Function backend issue (re-deploy with Phase C fix)

### Hypothesis 4: React Query Restoring Stale Cache
**Test:** Check if Phase E cache flush is executing
**Evidence Needed:** Missing `[PHASE E] Removing stale metadata` log
**Fix:** Phase E implementation issue

### Hypothesis 5: Normalizer Corrupting Data
**Test:** Compare BEFORE and AFTER normalizer logs
**Evidence Needed:** Data is correct BEFORE normalizer, wrong AFTER
**Fix:** Normalizer bug (unexpected)

---

## Resolution Matrix

| Hypothesis | Evidence | Solution |
|------------|----------|----------|
| Stale browser cache | No `[PHASE E]` logs, or old timestamps | Clear cache + hard refresh |
| iTunes fallback used | `itunes-lookup` adapter in logs | Fix Edge Function or iTunes adapter |
| Edge Function wrong data | `[DIAGNOSTIC-NAME-EDGE]` shows split data | Re-deploy Edge Function |
| React Query stale cache | Missing `[PHASE E] Removing stale` log | Fix MetadataImporter Phase E code |
| Normalizer bug | Data correct before, wrong after normalizer | Fix normalizer.ts logic |

---

## Next Actions

**USER:** Please complete Steps 1-4 above and paste your console logs.

**DEVELOPER:** Will analyze logs and identify exact corruption point in the pipeline.

---

**Status:** ⏸️ **WAITING FOR USER LOGS**
