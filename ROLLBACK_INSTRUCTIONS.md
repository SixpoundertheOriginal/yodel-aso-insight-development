# Dashboard Refactor - Rollback Instructions

**Branch**: `feature/dashboard-bigquery-refactor`
**Backup Created**: 2025-11-08
**Original File**: `src/pages/dashboard.tsx.backup`

---

## 🔙 Quick Rollback Options

### Option 1: Restore from Backup File (Fastest)

```bash
# Restore the backup file
cp src/pages/dashboard.tsx.backup src/pages/dashboard.tsx

# Verify restoration
git diff src/pages/dashboard.tsx

# If happy with changes, commit
git add src/pages/dashboard.tsx
git commit -m "revert: restore original dashboard.tsx from backup"
```

**Time**: 30 seconds
**Risk**: None

---

### Option 2: Discard All Changes (Clean Slate)

```bash
# Discard all uncommitted changes
git checkout -- src/pages/dashboard.tsx

# Verify clean state
git status
```

**Time**: 10 seconds
**Risk**: Loses ALL uncommitted work

---

### Option 3: Switch Back to Main Branch

```bash
# Commit current work first (optional)
git add .
git commit -m "wip: dashboard refactor in progress"

# Switch back to main
git checkout main

# Dashboard will be back to original state
```

**Time**: 1 minute
**Risk**: None (work saved in feature branch)

---

### Option 4: Cherry-Pick Specific Commits

If you want to keep some changes but not others:

```bash
# View commits on this branch
git log --oneline

# Switch to main
git checkout main

# Cherry-pick specific commits you want to keep
git cherry-pick <commit-hash>
```

**Time**: 2-5 minutes
**Risk**: Low (selective restoration)

---

## 🔍 Verification Steps

After rollback, verify dashboard still works:

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to**: http://localhost:8080/dashboard

3. **Login as**: `cli@yodelmobile.com`

4. **Check**:
   - ✅ Page loads without errors
   - ✅ Data displays (even if using old context)
   - ✅ No console errors
   - ✅ Country picker works

---

## 📋 Files Affected by Refactor

### Modified Files
```
src/pages/dashboard.tsx  ← Main refactor file
```

### Backup Files Created
```
src/pages/dashboard.tsx.backup  ← Original version
```

### New Dependencies (if added)
```
# These imports will be added during refactor:
import { useEnterpriseAnalytics } from '@/hooks/useEnterpriseAnalytics';
import { DateRangePicker } from '@/components/DateRangePicker';
import { CompactAppSelector } from '@/components/CompactAppSelector';
import { CompactTrafficSourceSelector } from '@/components/CompactTrafficSourceSelector';
```

### Removed Dependencies (during refactor)
```
# These will be removed:
import { MarketProvider, useMarketData } from "../contexts/MarketContext";
import { useAsoData } from "../context/AsoDataContext";
import { CountryPicker } from "../components/CountryPicker";
```

---

## 🚨 Emergency Rollback (Production)

If refactor is deployed and breaks production:

### Step 1: Quick Hotfix
```bash
# On main branch
git revert <refactor-commit-hash>
git push origin main
```

### Step 2: Deploy Rollback
```bash
# If using CI/CD, this will auto-deploy
# Otherwise, manually deploy main branch
```

### Step 3: Verify Production
- Check production dashboard loads
- Verify no errors in logs
- Test with real user account

---

## 📊 Current State Before Refactor

### Branch Structure
```
main (stable)
  ├─ Latest commit: 3fa00f4 - Add KPIs Overview
  └─ Dashboard: Working with legacy context

feature/dashboard-bigquery-refactor (new)
  └─ Backup created: dashboard.tsx.backup
  └─ Ready for refactor
```

### Backup File Location
```
src/pages/dashboard.tsx.backup
```

### Git History Reference
```bash
# Last known good commit on main
git log main --oneline -1

# Output: 3fa00f4 feat: add KPIs Overview page to Yodel Mobile navigation
```

---

## ✅ Rollback Checklist

Before rolling back, answer these questions:

- [ ] Did I commit my work to the feature branch?
- [ ] Do I have the backup file (dashboard.tsx.backup)?
- [ ] Did I test the rollback in development first?
- [ ] Did I verify the original dashboard still works?
- [ ] Did I document what went wrong (for future reference)?

---

## 🎯 Safe Refactor Strategy

To minimize rollback risk:

1. **Work in feature branch** ✅ (already done)
2. **Commit often** - After each major change
3. **Test frequently** - After each commit
4. **Keep backup** ✅ (already done)
5. **Document changes** - In commit messages
6. **Incremental approach** - Small changes, test, commit, repeat

---

## 📝 Rollback History

| Date | Reason | Method Used | Result |
|------|--------|-------------|---------|
| (none yet) | (n/a) | (n/a) | (n/a) |

**Update this table if rollback is performed**

---

## 🔗 Related Documentation

- **Audit Analysis**: `DASHBOARD_AUDIT_ANALYSIS.md`
- **Implementation Plan**: See "Phase 2" in audit doc
- **Deployment Status**: `DEPLOYMENT_COMPLETE.md`

---

## 🆘 Support

If rollback fails or you need help:

1. Check backup file exists: `ls -la src/pages/dashboard.tsx.backup`
2. Check git status: `git status`
3. Check git log: `git log --oneline -10`
4. Review this document carefully
5. Use Option 1 (restore from backup) - safest method

---

**Created**: 2025-11-08
**Branch**: `feature/dashboard-bigquery-refactor`
**Status**: Ready for refactor with full rollback protection ✅
