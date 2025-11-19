# Subtitle Normalization Bug - Diagnostic Audit

**Date:** 2025-01-17
**Issue:** Pimsleur app subtitle displays "Pimsleur | Language Learning" instead of "Language Learning"
**Scope:** Backend metadata normalizer missing pipe separator pattern
**Status:** 🚨 ROOT CAUSE IDENTIFIED

---

## Executive Summary

The UI now correctly renders the subtitle field, but the **subtitle value itself is wrong**. The normalizer is not removing the app name prefix when the separator is a pipe character (`|`).

**Current Behavior:**
- Subtitle displayed: `"Pimsleur | Language Learning"`
- Expected subtitle: `"Language Learning"`

**Root Cause:**
The metadata normalizer only checks for 4 separator patterns:
- `' - '` (space dash space)
- `' – '` (space en-dash space)
- `' — '` (space em-dash space)
- `': '` (colon space)

**Missing:** `' | '` (space pipe space)

---

## Issue Details

### User Report

**Location:** Subtitle Analysis Card in App Audit
**App:** Pimsleur (ID: 313232441)
**Display:**
```
Subtitle Analysis
65/100
Current Subtitle
Pimsleur | Language Learning
28/30 characters (93% used)
```

**Problem:** The subtitle shows `"Pimsleur | Language Learning"` which includes the app name, not just the subtitle.

**Expected:** `"Language Learning"` (just the subtitle, 19 characters)

---

## Root Cause Analysis

### Location: normalizer.ts (Lines 97-110)

**File:** `src/services/metadata-adapters/normalizer.ts`

**Current Code:**
```typescript
// Case 3: Subtitle contains "Title - Actual Subtitle" pattern
// Remove title prefix and separator
const separators = [' - ', ' – ', ' — ', ': '];
for (const sep of separators) {
  const prefixPattern = new RegExp(`^${this.escapeRegex(title)}${this.escapeRegex(sep)}`, 'i');
  if (prefixPattern.test(cleaned)) {
    const withoutPrefix = cleaned.replace(prefixPattern, '').trim();
    console.log('[NORMALIZER] Removed title prefix from subtitle:', {
      original: cleaned,
      cleaned: withoutPrefix,
    });
    return withoutPrefix;
  }
}
```

**Problem:**
The `separators` array on line 99 does NOT include the pipe separator `' | '`.

---

## Data Flow Analysis

### What Happens for Pimsleur App

**Step 1: iTunes API Response**
```json
{
  "trackName": "Pimsleur | Language Learning",
  "trackCensoredName": "Pimsleur | Language Learning"
}
```

**Step 2: transformItunesResult() in direct-itunes.service.ts**
```typescript
subtitle: app.trackCensoredName || '',  // "Pimsleur | Language Learning"
```

**Step 3: metadataNormalizer.normalize()**
```typescript
// Input: subtitle = "Pimsleur | Language Learning"
// Input: title = "Pimsleur"
// Input: name = "Pimsleur"

// Case 1: Check if subtitle === title
// "Pimsleur | Language Learning" !== "Pimsleur" ✅ PASS

// Case 2: Check if subtitle === name
// "Pimsleur | Language Learning" !== "Pimsleur" ✅ PASS

// Case 3: Check for separator patterns
const separators = [' - ', ' – ', ' — ', ': '];
// Check pattern: "^Pimsleur - "  → NO MATCH
// Check pattern: "^Pimsleur – "  → NO MATCH
// Check pattern: "^Pimsleur — "  → NO MATCH
// Check pattern: "^Pimsleur: "   → NO MATCH

// 🚨 MISSING: Pattern "^Pimsleur | " is NEVER checked!

// Return subtitle unchanged
return "Pimsleur | Language Learning";  // ❌ WRONG
```

**Step 4: UI Displays**
```
Current Subtitle
Pimsleur | Language Learning  ← Wrong (includes app name)
```

---

## Separator Patterns Analysis

### Currently Supported Separators (4 patterns)

| Separator | Example | Status |
|-----------|---------|--------|
| `' - '` | `Instagram - Photo & Video` | ✅ Supported |
| `' – '` | `TikTok – Make Your Day` | ✅ Supported |
| `' — '` | `App Name — Subtitle` | ✅ Supported |
| `': '` | `App Name: Subtitle` | ✅ Supported |

### Missing Separator (Pimsleur case)

| Separator | Example | Status |
|-----------|---------|--------|
| `' | '` | `Pimsleur | Language Learning` | ❌ **NOT SUPPORTED** |

---

## Other Potential Missing Separators

Based on App Store patterns, these separators may also be used:

| Separator | Example | Priority | Likelihood |
|-----------|---------|----------|------------|
| `' | '` | `Pimsleur | Language Learning` | 🔴 HIGH | Confirmed (Pimsleur) |
| `' · '` | `App Name · Subtitle` | 🟡 MEDIUM | Possible (middot) |
| `' • '` | `App Name • Subtitle` | 🟡 MEDIUM | Possible (bullet) |
| `' / '` | `App Name / Subtitle` | 🟢 LOW | Less common |
| `' \| '` | `App Name \| Subtitle` | 🔴 HIGH | Same as pipe (escaped) |

**Recommendation:** Add at minimum `' | '` (pipe) to the separators array.

---

## Impact Assessment

### Current Impact

**Affected Apps:**
- Any app where iTunes API returns subtitle with pipe separator
- Example: Pimsleur (ID: 313232441)
- Unknown how many other apps use pipe separator

**User Impact:**
- Subtitle appears duplicated (includes app name)
- Character count inflated (28 chars instead of 19)
- Misleading subtitle analysis scores
- Confusing for users trying to optimize subtitle

**Severity:** 🟡 MEDIUM
- Not all apps affected (only those with pipe separator)
- UI displays subtitle correctly (previous fix)
- But subtitle content is wrong for affected apps

---

## Fix Recommendation

### Minimal Fix (Add Pipe Separator)

**File:** `src/services/metadata-adapters/normalizer.ts`
**Line:** 99

**Before:**
```typescript
const separators = [' - ', ' – ', ' — ', ': '];
```

**After:**
```typescript
const separators = [' - ', ' – ', ' — ', ': ', ' | '];
```

**Impact:**
- Fixes Pimsleur and other pipe-separated apps
- Minimal code change (1 line)
- Low risk (just adds another pattern to check)

---

### Comprehensive Fix (Add All Common Separators)

**Before:**
```typescript
const separators = [' - ', ' – ', ' — ', ': '];
```

**After:**
```typescript
const separators = [
  ' - ',   // Space dash space (most common)
  ' – ',   // Space en-dash space
  ' — ',   // Space em-dash space
  ': ',    // Colon space
  ' | ',   // Space pipe space (Pimsleur, etc.)
  ' · ',   // Space middot space
  ' • ',   // Space bullet space
];
```

**Impact:**
- Handles all known App Store separator patterns
- Future-proof for other apps
- Still minimal code change
- Low risk (just additional patterns)

---

## Testing Requirements

### Test Case 1: Pimsleur (Pipe Separator)

**Input:**
- title: `"Pimsleur"`
- subtitle: `"Pimsleur | Language Learning"`

**Expected Output:**
- subtitle: `"Language Learning"`

**Verification:**
- Character count: 19 (not 28)
- Subtitle displayed: "Language Learning" (no "Pimsleur |" prefix)

---

### Test Case 2: Instagram (Dash Separator)

**Input:**
- title: `"Instagram"`
- subtitle: `"Instagram - Photo & Video"`

**Expected Output:**
- subtitle: `"Photo & Video"`

**Verification:**
- Should already work (dash separator is supported)
- Ensure no regression

---

### Test Case 3: App Without Title Prefix

**Input:**
- title: `"SomeApp"`
- subtitle: `"Great Features"`

**Expected Output:**
- subtitle: `"Great Features"`

**Verification:**
- Subtitle unchanged (no prefix to remove)
- No false positives

---

### Test Case 4: Edge Case - Pipe in Actual Subtitle

**Input:**
- title: `"AppName"`
- subtitle: `"Feature A | Feature B"`

**Expected Output:**
- subtitle: `"Feature A | Feature B"`

**Verification:**
- Should NOT remove pipe if title doesn't match
- Pattern: `^AppName | ` should NOT match `Feature A | Feature B`

---

## Code Location Summary

### File to Modify

**File:** `src/services/metadata-adapters/normalizer.ts`
**Method:** `normalizeSubtitle()`
**Line:** 99
**Current Code:**
```typescript
const separators = [' - ', ' – ', ' — ', ': '];
```

**Proposed Fix:**
```typescript
const separators = [' - ', ' – ', ' — ', ': ', ' | '];
```

---

## Verification Commands

### Check Current Normalizer Logic

```bash
# Read normalizer code
grep -n "const separators" src/services/metadata-adapters/normalizer.ts
```

**Expected Output:**
```
99:    const separators = [' - ', ' – ', ' — ', ': '];
```

---

### Search for Other Separator References

```bash
# Check if separators are defined elsewhere
grep -rn "separators.*=.*\[" src/services/
```

**Expected:** Only one location (normalizer.ts:99)

---

## Related Issues

### Phase A.4 Fixes (Previously Completed)

✅ **Fixed:** Subtitle duplication in fallback paths
✅ **Fixed:** Screenshots missing in fallback paths
✅ **Fixed:** Normalizer bypass in `wrapDirectResult()`

### Current Issue (New)

🚨 **New Issue:** Pipe separator not handled by normalizer
📍 **Location:** `normalizer.ts:99`
🔧 **Fix Required:** Add `' | '` to separators array

---

## Risk Assessment

### Fix Risk: 🟢 VERY LOW

| Risk Factor | Level | Reason |
|-------------|-------|--------|
| **Breaking Changes** | 🟢 NONE | Only adds new separator pattern |
| **Regression Risk** | 🟢 LOW | Existing patterns unchanged |
| **False Positives** | 🟢 LOW | Pattern checks title prefix match first |
| **Performance Impact** | 🟢 NONE | One more iteration in loop (negligible) |
| **TypeScript Errors** | 🟢 NONE | String literal addition |
| **Testing Required** | 🟡 MEDIUM | Should test with Pimsleur app |

**Overall Risk:** 🟢 **VERY LOW** - Safe to implement

---

## Comparison with Previous Fixes

### Phase A.4 Backend Fixes

**Problem:** Normalizer bypassed in fallback paths
**Scope:** 2 services, ~30 lines of code
**Risk:** Medium (integration changes)
**Impact:** 20% of users

---

### Subtitle UI Rendering Fixes (Just Completed)

**Problem:** Subtitle field not rendered in UI
**Scope:** 3 components, 11 lines of JSX
**Risk:** Low (display-only)
**Impact:** 100% of users

---

### Current Issue (Separator Pattern)

**Problem:** Pipe separator not in normalizer patterns
**Scope:** 1 file, 1 line of code
**Risk:** Very Low (just adding a string to array)
**Impact:** Apps with pipe separator (unknown %, includes Pimsleur)

---

## Recommended Next Steps

### Immediate Action

1. **Add pipe separator to normalizer** (1 line change)
   ```typescript
   const separators = [' - ', ' – ', ' — ', ': ', ' | '];
   ```

2. **Test with Pimsleur app** (ID: 313232441)
   - Import app
   - Verify subtitle shows "Language Learning" (not "Pimsleur | Language Learning")
   - Check character count (should be 19, not 28)

3. **Build verification**
   ```bash
   npm run build
   ```

4. **Deploy and monitor**
   - Deploy to production
   - Monitor for other separator patterns
   - Check user feedback

---

### Optional Enhancements

1. **Add logging for unhandled separators**
   - Log when subtitle contains title but no separator matches
   - Help identify new separator patterns

2. **Add comprehensive separator support**
   - Include middot, bullet, slash
   - Future-proof for other patterns

3. **Add unit tests**
   - Test each separator pattern
   - Test edge cases (pipe in actual subtitle)
   - Regression tests for existing patterns

---

## Conclusion

### Summary

**Issue:** Pimsleur app subtitle shows `"Pimsleur | Language Learning"` instead of `"Language Learning"`

**Root Cause:** Normalizer doesn't check for pipe separator `' | '`

**Location:** `src/services/metadata-adapters/normalizer.ts:99`

**Fix:** Add `' | '` to the `separators` array

**Risk:** 🟢 Very Low (1 line change, string literal addition)

**Impact:** Fixes subtitle normalization for all apps using pipe separator

---

**Diagnostic Complete**
**Ready for Fix:** ✅ YES
**Estimated Fix Time:** 5 minutes
**Estimated Test Time:** 10 minutes

