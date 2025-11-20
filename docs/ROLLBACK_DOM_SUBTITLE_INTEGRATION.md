# Rollback Instructions: DOM Subtitle Extraction Integration

**Date:** 2025-11-20
**Feature:** DOM-based subtitle extraction for App Store metadata
**Risk Level:** LOW (feature flag controlled, defaults to disabled)

---

## Quick Rollback Options

### Option 1: Disable Feature (RECOMMENDED - Zero Risk)

**Time Required:** < 1 minute
**Deployment Required:** Yes (rebuild only)
**Risk:** None - reverts to legacy behavior

**Steps:**

1. **Edit feature flag:**
   ```bash
   # File: src/config/metadataFeatureFlags.ts
   # Change line 50:
   export const ENABLE_DOM_SUBTITLE_EXTRACTION = false;
   ```

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Deploy to production**

4. **Verify:**
   - Check subtitle extraction still works (legacy multi-selector approach)
   - Monitor telemetry: `subtitle_source` should show "fallback" or "none"

**Effect:**
- Reverts to legacy multi-selector fallback approach
- No behavioral changes from pre-integration state
- Zero risk deployment

---

### Option 2: Full Rollback via Git Revert

**Time Required:** < 5 minutes
**Deployment Required:** Yes (rebuild and deploy)
**Risk:** None - complete removal of integration

**Single Commit Revert:**

```bash
# Find the integration commit
git log --oneline --grep="DOM subtitle extraction" | head -1

# Revert the commit
git revert <commit-hash>

# Example:
# git revert abc123f
```

**Rebuild and deploy:**

```bash
npm run build
# Deploy to production
```

**Verify:**

```bash
# Check files were reverted
git status

# Verify feature flag file removed
test ! -f src/config/metadataFeatureFlags.ts && echo "✓ Feature flags removed"

# Verify adapter restored
git diff HEAD~1 src/services/metadata-adapters/appstore-web.adapter.ts

# Verify documentation removed
test ! -f docs/METADATA_EXTRACTION.md && echo "✓ Documentation removed"
```

---

## Files Modified by Integration

### New Files Created

```
src/config/metadataFeatureFlags.ts          (NEW - Feature flags)
docs/METADATA_EXTRACTION.md                 (NEW - Documentation)
docs/ROLLBACK_DOM_SUBTITLE_INTEGRATION.md   (NEW - This file)
```

### Modified Files

```
src/services/metadata-adapters/appstore-web.adapter.ts
├─ Line 28-31:   Import feature flag and SubtitleSource type
├─ Line 56:      Add lastSubtitleSource telemetry field
├─ Line 272-345: Rewrite extractSubtitle() method
└─ Line 665-667: Add getSubtitleSource() telemetry getter
```

---

## Manual Rollback (If Git Revert Fails)

### Step 1: Remove New Files

```bash
rm src/config/metadataFeatureFlags.ts
rm docs/METADATA_EXTRACTION.md
rm docs/ROLLBACK_DOM_SUBTITLE_INTEGRATION.md
```

### Step 2: Restore Original Adapter

**File:** `src/services/metadata-adapters/appstore-web.adapter.ts`

**A. Remove imports (lines 28-31):**

```typescript
// DELETE THESE LINES:
import {
  ENABLE_DOM_SUBTITLE_EXTRACTION,
  SubtitleSource,
} from '@/config/metadataFeatureFlags';
```

**B. Remove telemetry field (line 56):**

```typescript
// DELETE THIS LINE:
private lastSubtitleSource: SubtitleSource = 'none';
```

**C. Restore original extractSubtitle method (lines 272-345):**

Replace with original:

```typescript
/**
 * Extract subtitle from DOM (CRITICAL - main reason for web adapter)
 */
private extractSubtitle($: cheerio.CheerioAPI): string {
  const selectors = [
    '.product-header__subtitle',
    'h2.product-header__subtitle',
    '[data-test-subtitle]',
    '[data-test="subtitle"]',
    '.app-header__subtitle',
    'p.subtitle',
    'h2.subtitle',
    // Fallback: h2 immediately after h1
    'header h1 + h2',
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element && element.text()) {
      const subtitle = element.text().trim();
      // Sanitize to prevent XSS
      const sanitized = this.validator.sanitizeText(subtitle);

      // Validate format
      if (this.validator.validateSubtitle(sanitized)) {
        console.log(`[${this.name}] Subtitle found with selector: ${selector}`);
        return sanitized;
      }
    }
  }

  console.log(`[${this.name}] Subtitle not found`);
  return '';
}
```

**D. Remove telemetry getter (lines 665-667):**

```typescript
// DELETE THIS METHOD:
/**
 * Get telemetry: Subtitle extraction source
 */
getSubtitleSource(): SubtitleSource {
  return this.lastSubtitleSource;
}
```

### Step 3: Verify and Rebuild

```bash
# Check TypeScript compilation
npm run build

# Should succeed with no errors
```

### Step 4: Deploy

```bash
# Deploy to production
# Monitor for any regressions
```

---

## Verification Checklist

After rollback, verify:

- [ ] Build completes successfully (`npm run build`)
- [ ] No TypeScript errors
- [ ] App Store metadata extraction still works
- [ ] Subtitle extraction still works (legacy approach)
- [ ] No console errors in browser DevTools
- [ ] No server errors in logs
- [ ] Feature flag file removed (full rollback only)
- [ ] Documentation files removed (full rollback only)
- [ ] Adapter restored to original state (full rollback only)

---

## Emergency Rollback (Production Down)

**If production is down after deployment:**

1. **Immediately deploy previous production build:**
   ```bash
   # Rollback to previous deployment
   # (specific commands depend on your deployment platform)
   ```

2. **Disable feature flag (if deployment takes time):**
   ```bash
   # Quick fix: Set feature flag to false
   export const ENABLE_DOM_SUBTITLE_EXTRACTION = false;
   npm run build
   # Deploy ASAP
   ```

3. **Investigate root cause:**
   - Check error logs
   - Check telemetry data
   - Review recent changes
   - Test in staging environment

---

## Post-Rollback Actions

### If Rollback via Feature Flag Disable:

1. **Monitor metrics:**
   - Subtitle extraction success rate
   - Error rates
   - Performance metrics

2. **Investigate failure:**
   - Why did DOM extraction fail?
   - Was it Apple HTML structure change?
   - Was it a code bug?

3. **Fix and re-enable:**
   - Fix root cause
   - Test in staging
   - Re-enable feature flag
   - Monitor closely

### If Full Rollback via Git Revert:

1. **Document reasons:**
   - Why was full rollback needed?
   - What went wrong?
   - What was the impact?

2. **Schedule post-mortem:**
   - What can we learn?
   - How can we prevent this?
   - Should we retry later?

3. **Plan next steps:**
   - Do we need more testing?
   - Do we need different approach?
   - Do we abandon feature?

---

## Testing After Rollback

```bash
# Run unit tests
npm test

# Run build
npm run build

# Test subtitle extraction manually
# (check metadata extraction in ASO AI Hub)

# Monitor production logs
# (look for subtitle extraction success/failure)
```

---

## Support & Escalation

**If rollback doesn't resolve issues:**

1. Check GitHub issues: `https://github.com/your-org/yodel-aso-insight/issues`
2. Contact development team
3. Review logs and telemetry data
4. Consider temporary service pause if critical

---

## Integration Summary

**Files Modified:** 3 modified, 3 created
**Risk Level:** LOW (feature flag controlled)
**Default State:** Disabled (safe deployment)
**Rollback Time:** < 5 minutes (disable flag) or < 10 minutes (full revert)
**Testing Required:** Yes (manual verification after rollback)

---

## Quick Reference Commands

```bash
# Disable feature flag (quick fix)
# Edit: src/config/metadataFeatureFlags.ts
# Set: ENABLE_DOM_SUBTITLE_EXTRACTION = false

# Rebuild
npm run build

# Git revert (full rollback)
git revert <commit-hash>
npm run build

# Manual file removal
rm src/config/metadataFeatureFlags.ts
rm docs/METADATA_EXTRACTION.md
rm docs/ROLLBACK_DOM_SUBTITLE_INTEGRATION.md
# Then restore adapter manually
```

---

## Success Criteria (Post-Rollback)

- ✅ Build passes with zero TypeScript errors
- ✅ App Store metadata extraction functional
- ✅ Subtitle extraction functional (legacy approach)
- ✅ No new errors in production logs
- ✅ Performance metrics stable
- ✅ User-facing features unaffected

---

**END OF ROLLBACK INSTRUCTIONS**
