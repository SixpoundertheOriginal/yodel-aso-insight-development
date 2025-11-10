# 🔄 Rollback Plan - Competitive Intelligence Redesign

**Date**: 2025-01-10
**Purpose**: Safety mechanism to revert to current system if issues occur
**Status**: Pre-Implementation

---

## 📸 Current System Snapshot

### Database Tables (Existing - DO NOT MODIFY)
```
✅ monitored_apps
✅ monitored_app_reviews
✅ review_intelligence_snapshots
✅ review_fetch_log
✅ competitor_analysis_cache
✅ app_competitors
✅ organizations
✅ user_roles
```

### Service Files (Current State)
```
✅ src/services/competitor-review-intelligence.service.ts (v1.0)
✅ src/engines/review-intelligence.engine.ts (v1.0)
✅ src/hooks/useCompetitorComparison.ts (v1.0)
✅ src/components/reviews/CompetitorComparisonView.tsx (v1.0)
✅ src/components/reviews/CompetitiveIntelligencePanel.tsx (v1.0)
```

### Git Commit
```
Current HEAD: 315aa07
Commit: "docs: comprehensive competitive intelligence redesign blueprint"
Branch: main
```

---

## 🛡️ Rollback Strategy

### Strategy: Additive-Only Approach (SAFEST)

**Principle**: Never modify existing tables or functions. Only ADD new ones.

This means:
- ✅ Existing competitor analysis continues to work
- ✅ Can deploy incrementally
- ✅ Can roll back by simply not using new features
- ✅ No data migration needed
- ✅ Zero downtime

### Implementation Rules

1. **DO NOT modify these existing functions:**
   - `extractThemes()`
   - `extractFeatureMentions()`
   - `extractIssuePatterns()`
   - `findFeatureGaps()`
   - `identifyOpportunities()`

2. **DO NOT modify these existing tables:**
   - `monitored_app_reviews`
   - `competitor_analysis_cache`
   - Any existing schema

3. **ONLY ADD new:**
   - New tables with new names
   - New service methods (don't replace existing)
   - New UI components (don't replace existing)
   - Feature flags to switch between old/new

---

## 📋 Rollback Procedures

### Level 1: Feature Flag Rollback (Instant)
**Scenario**: New insights UI has bugs, but data is fine
**Time**: < 1 minute
**Steps**:
```typescript
// In environment config or feature flags
export const FEATURE_FLAGS = {
  USE_SEMANTIC_INSIGHTS: false,  // ← Set to false
  USE_LEGACY_INSIGHTS: true       // ← Set to true
};
```

**Effect**: UI switches back to old CompetitiveIntelligencePanel

---

### Level 2: Service Layer Rollback (Fast)
**Scenario**: New NLP engines causing issues
**Time**: < 5 minutes
**Steps**:

1. Switch service to use old extraction:
```typescript
// In competitor-review-intelligence.service.ts
async analyzeCompetitors(primaryApp, competitors) {
  // Option 1: Use old system (default)
  if (!FEATURE_FLAGS.USE_SEMANTIC_INSIGHTS) {
    return this.analyzeLegacy(primaryApp, competitors);
  }

  // Option 2: Use new system
  return this.analyzeWithSemanticEngine(primaryApp, competitors);
}
```

2. Redeploy frontend
3. Monitor logs

**Effect**: Analysis uses old logic, new tables unused

---

### Level 3: Database Rollback (Medium)
**Scenario**: New tables causing performance issues
**Time**: < 30 minutes
**Steps**:

1. Run rollback migration:
```bash
psql "$DATABASE_URL" -f rollback_semantic_insights.sql
```

2. Migration file drops new tables:
```sql
DROP TABLE IF EXISTS public.aso_keyword_mapping;
DROP TABLE IF EXISTS public.insight_examples;
DROP TABLE IF EXISTS public.insight_trends;
DROP TABLE IF EXISTS public.insight_classifications;
DROP TABLE IF EXISTS public.semantic_insights;
```

3. Verify existing tables untouched:
```sql
SELECT COUNT(*) FROM competitor_analysis_cache;
SELECT COUNT(*) FROM monitored_app_reviews;
```

**Effect**: New tables removed, system back to original state

---

### Level 4: Full Code Rollback (Emergency)
**Scenario**: Critical bug in new code affecting production
**Time**: < 10 minutes
**Steps**:

1. Git revert to pre-implementation commit:
```bash
# Get current commit SHA (before implementation)
git log --oneline | head -5

# Revert to commit before semantic insights
git revert <commit-sha>
```

2. Rebuild and deploy:
```bash
npm run build
# Deploy via your CI/CD
```

3. Run database rollback (Level 3)

**Effect**: Complete system restore to current state

---

## 🏗️ Implementation Phases with Rollback Points

### Phase 1: Database Schema (Week 1)
**Changes**: Add 5 new tables
**Rollback**: Level 3 (drop new tables)
**Risk**: LOW (tables are additive, not modifying existing)

**Checkpoint**:
```sql
-- Verify old system still works
SELECT COUNT(*) FROM competitor_analysis_cache;
-- Should return existing cached analyses

-- Verify new tables exist but are empty
SELECT COUNT(*) FROM semantic_insights;
-- Should return 0
```

---

### Phase 2: NLP Engines (Week 2-3)
**Changes**: Add 3 new engine files
**Rollback**: Level 2 (switch to old extraction via flag)
**Risk**: LOW (new files, not modifying existing)

**Checkpoint**:
```typescript
// Test old system still works
const oldResult = await extractReviewIntelligence(reviews);
console.log('Old system themes:', oldResult.themes.length);
// Should still work

// Test new system works
const newResult = await semanticExtractionEngine.extract(reviews);
console.log('New system topics:', newResult.length);
// Should return semantic topics
```

---

### Phase 3: Service Integration (Week 4)
**Changes**: Add new methods to service, don't replace old
**Rollback**: Level 1 (feature flag off)
**Risk**: MEDIUM (integration point, needs testing)

**Checkpoint**:
```typescript
// Verify dual-mode operation
const legacy = await competitorService.analyzeLegacy(app, competitors);
const semantic = await competitorService.analyzeWithSemantics(app, competitors);

// Both should work independently
console.log('Legacy gaps:', legacy.featureGaps.length);
console.log('Semantic insights:', semantic.insights.length);
```

---

### Phase 4: UI Components (Week 5)
**Changes**: Add new components, keep old ones
**Rollback**: Level 1 (show old UI via flag)
**Risk**: LOW (UI only, no data changes)

**Checkpoint**:
```typescript
// Feature flag controls which UI to show
{FEATURE_FLAGS.USE_SEMANTIC_INSIGHTS ? (
  <SemanticInsightsPanel />
) : (
  <CompetitiveIntelligencePanel />  // Old UI
)}
```

---

## 🧪 Testing Rollback Procedures

### Before Implementation
1. **Create rollback migration file**
2. **Test rollback on staging**
3. **Document rollback commands**
4. **Set up monitoring alerts**

### During Implementation
1. **Test after each phase**
2. **Verify old system still works**
3. **Keep feature flags disabled until ready**
4. **Monitor error rates**

### After Implementation
1. **Keep old code for 2 weeks**
2. **Monitor production metrics**
3. **Have rollback script ready**
4. **Gradual rollout (10% → 50% → 100%)**

---

## 📊 Rollback Decision Criteria

### When to Rollback

**Immediate Rollback (Level 4)**:
- Production is down or severely degraded
- Critical data loss or corruption
- Security vulnerability discovered
- Error rate >10%

**Quick Rollback (Level 2-3)**:
- Performance degradation >50%
- Accuracy <70%
- Multiple user reports of bugs
- Unexpected database load

**Feature Flag Disable (Level 1)**:
- Minor UI bugs
- Confusing UX feedback
- Need more time to test
- Gradual rollout pause

**No Rollback Needed**:
- Minor cosmetic issues
- Edge case bugs
- Feature requests
- Performance within acceptable range

---

## 📝 Rollback Migration File

### File: `supabase/migrations/ROLLBACK_semantic_insights.sql`

```sql
-- ROLLBACK MIGRATION FOR SEMANTIC INSIGHTS
-- Run this to remove all Phase 1 database changes
-- ONLY RUN IF ROLLBACK IS NEEDED

BEGIN;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.aso_keyword_mapping;
DROP TABLE IF EXISTS public.insight_examples;
DROP TABLE IF EXISTS public.insight_trends;
DROP TABLE IF EXISTS public.insight_classifications;
DROP TABLE IF EXISTS public.semantic_insights;

-- Verify existing tables are untouched
DO $$
BEGIN
  -- Check that old tables still exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_analysis_cache') THEN
    RAISE EXCEPTION 'ERROR: competitor_analysis_cache table missing! Rollback failed.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monitored_app_reviews') THEN
    RAISE EXCEPTION 'ERROR: monitored_app_reviews table missing! Rollback failed.';
  END IF;

  RAISE NOTICE 'Rollback successful. Existing tables intact.';
END $$;

COMMIT;
```

---

## 🔒 Safety Checklist

Before starting implementation:

- [ ] Current system is working in production
- [ ] Git tag created: `v1.0-before-semantic-insights`
- [ ] Rollback migration file created and tested on staging
- [ ] Feature flags added to codebase
- [ ] Monitoring alerts configured
- [ ] Rollback documentation reviewed by team
- [ ] Database backup taken
- [ ] Rollback dry-run performed on staging
- [ ] Emergency contact list updated
- [ ] Rollback decision criteria agreed upon

During implementation:

- [ ] Test old system after each phase
- [ ] Keep feature flags disabled until ready
- [ ] Monitor error rates and performance
- [ ] Document any issues or deviations
- [ ] Update rollback plan if needed

After implementation:

- [ ] Keep old code in codebase for 2 weeks
- [ ] Monitor production for 1 week before cleanup
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Collect user feedback
- [ ] Remove old code only after proven stable

---

## 📞 Emergency Contacts

**If rollback is needed:**

1. **Check this document first** - follow procedures
2. **Run appropriate rollback level** - start with lowest level needed
3. **Monitor system** - verify old system working
4. **Document incident** - what happened, what was rolled back
5. **Post-mortem** - why did it fail, how to prevent

---

## 🎯 Success Criteria (When NOT to Rollback)

**Keep new system if:**
- ✅ Error rate <1%
- ✅ Performance within 20% of baseline
- ✅ Accuracy >85% (validated manually)
- ✅ User feedback positive (>4/5)
- ✅ No critical bugs after 1 week
- ✅ Database queries <200ms
- ✅ Analysis time <60s

**Monitor for 2 weeks before removing old code**

---

## 📚 Files Created for Rollback

1. **This document**: `ROLLBACK_PLAN.md`
2. **Rollback migration**: `supabase/migrations/ROLLBACK_semantic_insights.sql`
3. **Git tag**: `v1.0-before-semantic-insights`
4. **Feature flags**: Environment config

---

**Next Steps:**
1. Review this rollback plan
2. Create rollback migration file
3. Tag current codebase
4. Begin Phase 1 implementation with confidence
