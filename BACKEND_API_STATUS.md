# Backend API Test Results
**Tested:** November 9, 2025
**Project:** https://bkbcqocpjahewqjmlgvf.supabase.co

---

## ✅ Working Backend APIs

### 1. **App Search** (`op: "search"`)
**Status:** ✅ WORKING
**Saves Metadata:** ✅ YES (to `apps_metadata` table)

**Test:**
```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"op": "search", "searchTerm": "Instagram", "country": "us"}'
```

**Result:** Returns array of apps (Instagram, TikTok, Snapchat, Facebook, etc.)
**Used By:** Keywords page app search, Reviews page app search

---

### 2. **SERP Top-N Keyword Discovery** (`op: "serp-topn"`)
**Status:** ✅ WORKING
**Saves Metadata:** ✅ YES (top 10 apps to `apps_metadata`)

**Test:**
```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "op": "serp-topn",
    "cc": "us",
    "appId": "389801252",
    "seeds": ["photo", "social"],
    "maxCandidates": 50,
    "maxPages": 3,
    "rankThreshold": 10
  }'
```

**Result:** Returns keywords where app ranks in top N (e.g., top 10)
**Used By:** Keywords page → Quick Discovery panel → "Top 10/30/50 Keywords" buttons

---

### 3. **SERP Rankings** (`op: "serp"`)
**Status:** ✅ WORKING
**Saves Metadata:** ✅ YES (top 10 apps to `apps_metadata`)

**Used By:** Keywords page → Manual keyword ranking checks

---

### 4. **Reviews** (`op: "reviews"`)
**Status:** ✅ WORKING (CRITICAL - confirmed by user)
**Saves Metadata:** ❌ NO

**Used By:** Reviews page

---

## ❌ Not Deployed Yet

### 5. **Advanced Keyword Discovery** (`op: "discover_keywords"`)
**Status:** ❌ NOT DEPLOYED
**Code Status:** ✅ Written in local file
**Needs:** Edge function deployment

**Why It's Not Working:**
- Code exists in `supabase/functions/app-store-scraper/index.ts:445`
- Edge function hasn't been deployed to Supabase
- Deployed version is still running old code

**Test (fails):**
```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "op": "discover_keywords",
    "organizationId": "public",
    "targetApp": {"name": "Instagram", "appId": "389801252"},
    "seedKeywords": ["photo", "social"],
    "country": "us",
    "maxKeywords": 20
  }'
```

**Error:** `"Missing required fields: searchTerm, organizationId"`

**To Fix:** Deploy edge function:
```bash
supabase functions deploy app-store-scraper
```

---

## ⚠️ Missing Database Tables

### Bulk Discovery Service
**File:** `src/services/bulk-keyword-discovery.service.ts`
**Status:** ❌ NOT WORKING
**Reason:** References database tables that don't exist

**Missing Tables:**
1. `keyword_discovery_jobs` - Tracks bulk discovery jobs
2. `enhanced_keyword_rankings` - Stores discovered keywords
3. `start_keyword_discovery_job` - Database function

**Used By:** Keywords page → "Bulk Discovery" tab

**Impact:** Bulk Discovery tab won't work until these tables are created

---

### Competitor Intelligence
**File:** `src/components/KeywordIntelligence/CompetitorIntelligencePanel.tsx`
**Status:** ⚠️ UNKNOWN (likely needs database tables)

**Used By:** Keywords page → "Competitors" tab

---

## 📊 Summary

### What's Working RIGHT NOW:
1. ✅ **App Search** - Search for apps by name
2. ✅ **SERP Top-N** - Find keywords where app ranks in top 10/30/50
3. ✅ **Metadata Persistence** - Apps saved to database automatically
4. ✅ **Reviews** - Fetch and analyze reviews
5. ✅ **Quick Discovery Panel** - Working perfectly on keywords page

### What Needs Work:
1. ❌ **Deploy Edge Function** - To enable `discover_keywords` operation
2. ❌ **Create Database Tables** - For bulk discovery and competitor intelligence
3. ❌ **Fix Remaining Services** - 15 services with `@ts-nocheck` still broken

---

## 🎯 Keywords Page Feature Matrix

| Feature | Status | Backend API | Database Tables |
|---------|--------|-------------|-----------------|
| **App Search** | ✅ Working | `search` | None needed |
| **Quick Discovery** | ✅ Working | `serp-topn` | None needed |
| **Manual Entry** | ✅ Working | `serp` | None needed |
| **Bulk Discovery** | ❌ Broken | `serp-topn` | ❌ Missing tables |
| **Competitors** | ⚠️ Unknown | Unknown | ⚠️ Likely missing |
| **Results View** | ✅ Working | N/A | None needed |

---

## 🚀 What You Can Test RIGHT NOW

### Test 1: Search for Apps
1. Go to http://localhost:8080/growth-accelerators/keywords
2. Enter "Instagram" in search
3. Click "Search"
4. **Expected:** See Instagram and related apps

### Test 2: Quick Discovery
1. Select Instagram from search results
2. Go to "Quick Discovery" tab
3. Click "Top 10 Keywords"
4. **Expected:** See keywords where Instagram ranks in top 10

### Test 3: Manual Keyword Entry
1. Select Instagram
2. Go to "Manual Entry" tab
3. Enter keywords: `photo, camera, social`
4. Click "Analyze"
5. **Expected:** See ranking positions for each keyword

### Test 4: View Results
1. After discovery or manual entry
2. Go to "Results" tab
3. **Expected:** See table and chart of keyword rankings

---

## ❌ What Will NOT Work

### Bulk Discovery Tab
**What happens:**
- Click "Start Discovery"
- Gets error about missing database table `keyword_discovery_jobs`
- Console shows: `Failed to load recent jobs`

**Why:**
- Needs database tables that don't exist yet
- Needs database function `start_keyword_discovery_job`

### Competitors Tab
**Status:** Unknown - likely needs database tables

---

## 📝 Next Steps

### Option A: Test What's Working
- Use Quick Discovery to find keywords
- Use Manual Entry to analyze specific keywords
- View results and export CSV
- **Time:** 5-10 minutes

### Option B: Deploy Edge Function
- Deploy updated edge function to enable `discover_keywords`
- Test advanced keyword discovery API
- **Time:** 2-3 minutes

### Option C: Create Missing Database Tables
- Create `keyword_discovery_jobs` table
- Create `enhanced_keyword_rankings` table
- Enable Bulk Discovery tab
- **Time:** 30-45 minutes

### Option D: Continue with Phase 1
- Build keyword intelligence dashboard UI
- Add ranking charts and automated tracking
- **Time:** 8 days (full Phase 1)

---

## 💡 Recommendations

**For Testing Right Now:**
1. ✅ Use **Quick Discovery** - It works perfectly!
2. ✅ Use **Manual Entry** - Analyze specific keywords
3. ⚠️ Skip **Bulk Discovery** - Needs database work
4. ⚠️ Skip **Competitors** - Status unknown

**For Production:**
1. Deploy edge function (`supabase functions deploy app-store-scraper`)
2. Create missing database tables
3. Fix remaining 15 services with `@ts-nocheck`

---

**Test Script:** `./test-implementation.sh YOUR_PROJECT_URL YOUR_ANON_KEY`
**Credentials:** Found in `.env` file
