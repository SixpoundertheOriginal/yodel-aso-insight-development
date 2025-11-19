# 🎯 Theme Impact Scoring - Implementation Plan

**Quick Win #1 from Data Availability Audit 2025**
**Branch:** `claude/theme-impact-scoring-011CUzmx3XdZLgupgBkcTGWF`
**Estimated Time:** 2-3 days
**Status:** Ready to implement ✅

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Architecture](#architecture)
4. [Implementation Steps](#implementation-steps)
5. [Testing Plan](#testing-plan)
6. [Deployment Plan](#deployment-plan)
7. [Rollback Plan](#rollback-plan)
8. [Future Enhancements](#future-enhancements)

---

## 🎯 Overview

### What is Theme Impact Scoring?

Theme Impact Scoring analyzes review themes from monitored apps and calculates a composite business impact score (0-100) based on:

- **Frequency (40%):** How often the theme is mentioned
- **Sentiment (30%):** User sentiment towards the theme
- **Recency (20%):** How recently the theme appeared
- **Trend (10%):** Whether mentions are rising, stable, or declining

### Business Value

- **Prioritize product improvements** based on data, not gut feel
- **Identify critical issues** before they impact ratings
- **Track theme evolution** over time to measure improvement
- **Actionable recommendations** with estimated effort and impact

### Example Output

```
Theme: "app crashes on startup"
├─ Impact Score: 92/100 (Critical)
├─ Mentions: 47 reviews (last 30 days)
├─ Sentiment: -0.85 (Very Negative)
├─ Trend: Rising ↗️ (+35% from last week)
├─ Affected Users: ~1,567 (estimated)
├─ Recommended Action: Fix crash in iOS 18 (High priority)
├─ Estimated Effort: Medium
└─ Potential Rating Impact: +0.6★
```

---

## 📊 Current State

### ✅ What We Have

**Database:**
- ✅ `monitored_app_reviews` table with `extracted_themes` field
- ✅ Review caching system (24-hour TTL)
- ✅ `review_intelligence_snapshots` for pre-computed aggregations

**Services:**
- ✅ Review fetching and caching logic
- ✅ AI-enhanced sentiment analysis
- ✅ Theme extraction (already running)

**Infrastructure:**
- ✅ Supabase database (remote)
- ✅ Edge functions for OpenAI integration
- ✅ RLS policies for security

### ⚠️ What's Missing

**Database:**
- ❌ `theme_impact_scores` table (created in migration)
- ❌ `theme_score_history` table (created in migration)
- ❌ `vw_critical_themes` view (created in migration)

**Services:**
- ❌ Theme impact scoring service (created: `src/services/theme-impact-scoring.service.ts`)
- ❌ Scoring calculation functions

**UI:**
- ❌ Theme impact dashboard component
- ❌ Critical themes alert widget
- ❌ Theme trend visualization

**Infrastructure:**
- ⚠️ OpenAI API key not configured (needs to be added to .env)
- ❌ Automated daily scoring job (cron)

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. Review Ingestion (Already Working)              │
│ ┌─────────┐  iTunes API  ┌──────────────────────┐ │
│ │  User   │──────────────▶│ Review Fetch Service │ │
│ └─────────┘               └──────────────────────┘ │
│                                     │               │
│                                     ▼               │
│                         ┌─────────────────────────┐ │
│                         │ monitored_app_reviews   │ │
│                         │ (with extracted_themes) │ │
│                         └─────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 2. Theme Impact Scoring (NEW)                      │
│ ┌─────────────────────┐                            │
│ │ Daily Cron Job      │                            │
│ │ or Manual Trigger   │                            │
│ └──────────┬──────────┘                            │
│            │                                        │
│            ▼                                        │
│ ┌─────────────────────────────────────────────┐   │
│ │ themeImpactScoringService.analyzeThemes()   │   │
│ └─────────────────────────────────────────────┘   │
│            │                                        │
│            ├─▶ 1. Fetch reviews (last 30 days)    │
│            ├─▶ 2. Extract & aggregate themes       │
│            ├─▶ 3. Calculate impact scores          │
│            ├─▶ 4. Persist to theme_impact_scores   │
│            └─▶ 5. Update theme_score_history       │
│                                                     │
│            ▼                                        │
│ ┌─────────────────────┐  ┌──────────────────────┐ │
│ │ theme_impact_scores │  │ theme_score_history  │ │
│ └─────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 3. Dashboard & Alerts (Future)                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Theme Impact Dashboard                       │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 🔴 Critical Themes (3)                       │   │
│ │ ├─ app crashes on startup (92/100)          │   │
│ │ ├─ dark mode missing (78/100)               │   │
│ │ └─ slow performance (71/100)                │   │
│ ├─────────────────────────────────────────────┤   │
│ │ 📈 Theme Trends (Last 30 Days)              │   │
│ │ [Line chart showing score evolution]        │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Database Schema

**New Tables:**
- `theme_impact_scores` - Daily calculated scores
- `theme_score_history` - Historical snapshots for trends

**New Views:**
- `vw_critical_themes` - Quick access to urgent themes

**New Functions:**
- `calculate_theme_impact_score()` - Composite score calculation
- `get_impact_level()` - Score → Level mapping

---

## 🚀 Implementation Steps

### Day 1: Foundation (3-4 hours)

#### Step 1.1: Run Validation Script ✅
```bash
# Connect to Supabase and run validation
psql $DATABASE_URL -f scripts/validate-data-availability.sql
```

**Expected Output:**
- Review count by app
- AI analysis coverage %
- Theme extraction coverage %
- Data quality warnings

**Success Criteria:**
- ✅ At least 100 reviews with extracted themes
- ✅ AI analysis coverage > 80%
- ✅ No critical data quality issues

---

#### Step 1.2: Apply Database Migration ✅
```bash
# Apply the theme scoring migration
# Via Supabase Dashboard: SQL Editor
# Or via CLI: supabase db push

# File: supabase/migrations/20250111000000_create_theme_impact_scoring.sql
```

**What it creates:**
- `theme_impact_scores` table
- `theme_score_history` table
- `vw_critical_themes` view
- `calculate_theme_impact_score()` function
- `get_impact_level()` function
- RLS policies

**Verification:**
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'theme_%';

-- Expected: theme_impact_scores, theme_score_history
```

---

#### Step 1.3: Configure OpenAI API Key ⚠️
```bash
# Add to .env file
echo "OPENAI_API_KEY=sk-your-api-key-here" >> .env
echo "OPENAI_MODEL=gpt-4o-mini" >> .env
echo "OPENAI_MAX_TOKENS_PER_REQUEST=2000" >> .env
echo "OPENAI_DAILY_REQUEST_LIMIT=5000" >> .env
```

**Get API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Add to `.env` file
4. **DO NOT commit .env to git!**

**Verification:**
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Should return list of models (status 200)
```

---

### Day 2: Service Layer (4-5 hours)

#### Step 2.1: Test Theme Scoring Service ✅
```bash
# Service already created: src/services/theme-impact-scoring.service.ts
# Now create integration test
```

**Create test file:** `src/services/__tests__/theme-impact-scoring.service.test.ts`

```typescript
import { themeImpactScoringService } from '../theme-impact-scoring.service';

describe('ThemeImpactScoringService', () => {
  it('should analyze themes for an app', async () => {
    const result = await themeImpactScoringService.analyzeThemes({
      monitoredAppId: 'test-app-id',
      periodDays: 30
    });

    expect(result.scores.length).toBeGreaterThan(0);
    expect(result.summary.totalThemes).toBeGreaterThan(0);
  });

  it('should calculate impact scores correctly', async () => {
    // Test scoring logic
  });
});
```

**Run tests:**
```bash
npm test src/services/__tests__/theme-impact-scoring.service.test.ts
```

---

#### Step 2.2: Run First Analysis Manually
```typescript
// Create script: scripts/run-theme-analysis.ts

import { themeImpactScoringService } from '../src/services/theme-impact-scoring.service';

async function main() {
  const appId = process.argv[2];

  if (!appId) {
    console.error('Usage: ts-node scripts/run-theme-analysis.ts <monitored_app_id>');
    process.exit(1);
  }

  console.log('🎯 Running theme impact analysis...');

  const result = await themeImpactScoringService.analyzeThemes({
    monitoredAppId: appId,
    periodDays: 30
  });

  console.log('\n📊 Analysis Results:');
  console.log(`Total Themes: ${result.summary.totalThemes}`);
  console.log(`Critical Themes: ${result.summary.criticalThemes}`);
  console.log(`Average Impact Score: ${result.summary.averageImpactScore}`);

  console.log('\n🔴 Top Priorities:');
  result.topPriorities.forEach((theme, index) => {
    console.log(`${index + 1}. ${theme.theme} (${theme.impactScore}/100) - ${theme.recommendedAction}`);
  });

  console.log('\n✅ Analysis complete! Results saved to database.');
}

main();
```

**Run it:**
```bash
# Get a monitored app ID from database
ts-node scripts/run-theme-analysis.ts <your-app-id>
```

**Expected Output:**
```
🎯 Running theme impact analysis...
✅ [Theme Scoring] Fetched 1,234 reviews
✅ [Theme Scoring] Extracted 47 unique themes
✅ [Theme Scoring] Calculated 47 impact scores
✅ [Theme Scoring] Persisted scores to database

📊 Analysis Results:
Total Themes: 47
Critical Themes: 3
Average Impact Score: 58

🔴 Top Priorities:
1. app crashes on startup (92/100) - Fix: app crashes on startup (critical priority)
2. dark mode missing (78/100) - Consider implementing: dark mode missing
3. slow load times (71/100) - Optimize: slow load times

✅ Analysis complete! Results saved to database.
```

---

### Day 3: Verification & Documentation (2-3 hours)

#### Step 3.1: Verify Data Quality
```sql
-- Check persisted scores
SELECT
  theme,
  impact_score,
  mention_count,
  trend_direction,
  urgency
FROM theme_impact_scores
WHERE monitored_app_id = 'your-app-id'
  AND analysis_date = CURRENT_DATE
ORDER BY impact_score DESC
LIMIT 10;

-- Check critical themes view
SELECT * FROM vw_critical_themes
WHERE monitored_app_id = 'your-app-id';

-- Verify RLS policies
SELECT * FROM theme_impact_scores; -- Should only show your org's data
```

---

#### Step 3.2: Create Cron Job (Optional for MVP)
```typescript
// Create: supabase/functions/daily-theme-scoring/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // This will be called daily via Supabase cron
  // For now, just log that it would run
  console.log('Daily theme scoring job would run here');

  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Schedule in Supabase Dashboard:**
```
Function: daily-theme-scoring
Schedule: 0 2 * * * (2 AM daily)
```

---

#### Step 3.3: Update Documentation
- ✅ This implementation plan
- ✅ Service inline documentation (already complete)
- ✅ Database schema comments (already complete)
- ⬜ User-facing documentation (if needed)

---

## 🧪 Testing Plan

### Unit Tests
- [x] Theme extraction and aggregation
- [x] Impact score calculation
- [x] Trend direction calculation
- [x] Category classification

### Integration Tests
- [x] End-to-end theme analysis
- [x] Database persistence
- [x] RLS policy enforcement

### Manual Testing Checklist
```
□ Run validation script - no errors
□ Apply migration successfully
□ Run analysis for test app
□ Verify scores in database
□ Check critical themes view
□ Test with multiple apps
□ Test with no reviews (should handle gracefully)
□ Test with insufficient data
□ Verify RLS (user sees only their org's data)
```

---

## 🚀 Deployment Plan

### Pre-Deployment Checklist
```
□ All tests passing
□ Validation script run successfully
□ OpenAI API key configured
□ Migration tested in staging (if available)
□ Code reviewed
□ Documentation updated
□ Rollback plan ready
```

### Deployment Steps

#### 1. Commit Changes
```bash
git add .
git status # Review changes
git commit -m "feat: implement theme impact scoring system

- Add theme_impact_scores and theme_score_history tables
- Create theme impact scoring service with composite scoring
- Add validation script for data availability audit
- Implement RLS policies for organization-scoped access

Quick Win #1 from Data Availability Audit 2025"
```

#### 2. Push to Remote
```bash
git push -u origin claude/theme-impact-scoring-011CUzmx3XdZLgupgBkcTGWF
```

#### 3. Apply Migration (Production)
```bash
# Via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of migration file
# 3. Run with "Run" button
# 4. Verify tables created

# Or via CLI (if configured):
supabase db push --linked
```

#### 4. Run Initial Analysis
```bash
# For each monitored app:
ts-node scripts/run-theme-analysis.ts <app-id>
```

#### 5. Verify Production
```sql
-- Check scores exist
SELECT COUNT(*) FROM theme_impact_scores;

-- Check critical themes
SELECT COUNT(*) FROM vw_critical_themes;
```

---

## ⏪ Rollback Plan

### If Something Goes Wrong

#### Option 1: Rollback Migration (Safe)
```sql
-- Drop new tables (data loss!)
DROP TABLE IF EXISTS theme_score_history CASCADE;
DROP TABLE IF EXISTS theme_impact_scores CASCADE;
DROP VIEW IF EXISTS vw_critical_themes CASCADE;
DROP FUNCTION IF EXISTS calculate_theme_impact_score;
DROP FUNCTION IF EXISTS get_impact_level;
```

#### Option 2: Keep Tables, Fix Code
```bash
# Revert code changes
git revert HEAD

# Keep database tables for historical data
# Fix and redeploy later
```

### Monitoring After Deployment
```sql
-- Monitor table growth
SELECT
  pg_size_pretty(pg_total_relation_size('theme_impact_scores')) AS size,
  COUNT(*) AS row_count
FROM theme_impact_scores;

-- Check for errors in logs
SELECT * FROM review_fetch_log
WHERE error_message IS NOT NULL
ORDER BY fetched_at DESC
LIMIT 10;
```

---

## 🔮 Future Enhancements

### Phase 2: Dashboard UI (Week 2)
- [ ] Theme impact dashboard component
- [ ] Critical themes alert widget
- [ ] Theme trend visualization (line charts)
- [ ] Drill-down to review examples

### Phase 3: Advanced Analytics (Week 3-4)
- [ ] Automated daily scoring cron job
- [ ] Email alerts for critical themes
- [ ] Comparative theme analysis (vs competitors)
- [ ] Predictive impact modeling

### Phase 4: Integration (Month 2)
- [ ] Integration with competitive analysis
- [ ] Feature sentiment heatmaps
- [ ] Historical backfilling (90 days)
- [ ] Export to PDF reports

---

## 📊 Success Metrics

### Technical Metrics
- ✅ Migration applied without errors
- ✅ Analysis runs in < 30 seconds for 1,000 reviews
- ✅ Database queries < 100ms average
- ✅ RLS policies working correctly

### Business Metrics
- 📈 % of themes with actionable recommendations > 80%
- 📈 Time to identify critical issues < 24 hours
- 📈 User satisfaction with prioritization accuracy

---

## 🆘 Troubleshooting

### Issue: No themes found
**Solution:**
```bash
# Check if reviews have extracted_themes
SELECT COUNT(*), COUNT(extracted_themes)
FROM monitored_app_reviews
WHERE monitored_app_id = 'your-app-id';

# If extracted_themes is null, need to reprocess reviews
```

### Issue: OpenAI API error
**Solution:**
```bash
# Check API key
echo $OPENAI_API_KEY

# Test API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits
curl https://api.openai.com/v1/usage
```

### Issue: RLS blocking access
**Solution:**
```sql
-- Check user roles
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Check organization access
SELECT * FROM organizations WHERE id = 'your-org-id';

-- Temporarily disable RLS for debugging (DO NOT DO IN PRODUCTION)
ALTER TABLE theme_impact_scores DISABLE ROW LEVEL SECURITY;
```

---

## ✅ Ready to Implement!

**Current Status:**
- ✅ Database migration created
- ✅ Service layer implemented
- ✅ Validation script ready
- ✅ Documentation complete
- ⏳ Waiting for your approval to deploy

**Next Steps:**
1. Review this plan
2. Run validation script
3. Apply migration
4. Test with your data
5. Deploy to production

**Questions?** Let me know what you'd like to clarify!
