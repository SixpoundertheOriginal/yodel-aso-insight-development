# Reviews Page vs BigQuery - Key Distinction

**Date:** November 7, 2025
**Critical Clarification:** Reviews page is COMPLETELY INDEPENDENT from BigQuery

---

## ✅ Reviews Page Architecture (CORRECT Understanding)

### How It Works:
```
User (any org) searches for app
  ↓
iTunes/App Store scraper API
  ↓
Finds app (any app in App Store)
  ↓
User adds to "monitored_apps" table
  ↓
App belongs to THAT USER'S organization
  ↓
Reviews fetched via scraper (not BigQuery)
```

### Key Points:
1. **NO BigQuery connection** - Uses iTunes API scraper
2. **ANY app** - Not limited to BigQuery apps
3. **Universal monitoring** - Like AppTweak, can monitor any app
4. **Org-scoped** - Apps saved under user's organization
5. **Independent feature** - Separate from Dashboard V2/analytics

---

## ❌ What I Misunderstood

### My Incorrect Assumption:
"Reviews page needs agency fix because Yodel Mobile users should see client org monitored apps"

### Why This is Wrong:
- Reviews page is for **monitoring competitors/any apps**
- Each org manages **their own** monitored apps list
- There's **NO concept of "client apps"** here
- It's like each org having their own AppTweak account

---

## 🎯 Correct Mental Model

### BigQuery System (Dashboard V2):
```
Client Org owns apps in BigQuery
  ↓
Agency manages client org
  ↓
Agency should see client's BigQuery apps ✅
```

**Use Case:** Agency managing client's actual apps/data

---

### Reviews System (Reviews Page):
```
ANY user can monitor ANY app
  ↓
Apps saved under user's organization
  ↓
Each org has independent watch list
```

**Use Case:** Competitor research, market intelligence

---

## 🤔 The Real Question

### Do Yodel Mobile users NEED to see client org monitored apps?

**Scenario A: NO (Most Likely)**
- Yodel Mobile has their own competitor watch list
- Client orgs have their own watch lists
- These are independent - no sharing needed
- **No agency fix needed for Reviews page**

**Scenario B: YES (If business requires it)**
- Yodel Mobile wants to see what clients are monitoring
- Centralized competitor intelligence across clients
- **Then agency fix IS needed for Reviews page**

---

## 📊 Current State Analysis

### monitored_apps Table Structure:
```sql
CREATE TABLE monitored_apps (
  organization_id UUID,  -- Who owns this monitored app
  app_store_id TEXT,     -- App Store ID (any app)
  app_name TEXT,
  -- ...
);
```

### Current Yodel Mobile State:
```
Yodel Mobile monitored_apps: 0 apps
Demo Analytics Organization monitored_apps: ? apps
Demo Analytics monitored_apps: ? apps
```

### If Agency Fix Applied:
```
Yodel Mobile user logs in
  ↓
RLS checks: Yodel Mobile + client orgs
  ↓
Sees: Yodel Mobile apps + client org apps
```

**Question:** Is this desired behavior?

---

## 🎯 Business Logic Question

### For Reviews Page, Should:

**Option A: Keep Separate (No Agency Fix)**
- ✅ Each org manages own competitor list
- ✅ Clean separation of concerns
- ✅ No data mixing
- ❌ Agency can't see what clients monitor

**Option B: Share via Agency (Apply Fix)**
- ✅ Agency sees all client monitored apps
- ✅ Centralized intelligence
- ❌ Data mixing - whose app is whose?
- ❌ More complex UI - "this is from Client A"

---

## 💡 Recommendation

### My Updated Understanding:

**Dashboard V2 (BigQuery):**
- ✅ **NEEDS agency fix**
- Apps are client's actual products
- Agency manages client data
- Clear ownership chain

**Reviews Page (Scraper):**
- ❓ **CLARIFY with you**
- Apps are competitor research
- Each org's independent watch list
- Sharing may not make sense

---

## 🔍 What This Means for Implementation

### If Reviews Page Should Stay Separate:
```
Changes Needed:
✅ org_app_access RLS (for Dashboard V2)
✅ bigquery-aso-data Edge Function
❌ monitored_apps RLS (leave as-is)
❌ app_competitors RLS (leave as-is)
❌ review_cache RLS (leave as-is)
❌ Frontend hooks (leave as-is)
```

**Result:** Only Dashboard V2 gets agency support

---

### If Reviews Page Should Share:
```
Changes Needed:
✅ org_app_access RLS (for Dashboard V2)
✅ bigquery-aso-data Edge Function
✅ monitored_apps RLS (add agency support)
✅ app_competitors RLS (add agency support)
✅ review_cache RLS (add agency support)
✅ Frontend hooks (remove .eq filters)
```

**Result:** Both Dashboard V2 and Reviews page get agency support

---

## 📋 Questions to Answer

### 1. Business Model
**Q:** Should Yodel Mobile (agency) see monitored apps that client orgs add?

**Scenarios:**
- Client adds competitor to watch list
- Should agency see it automatically?
- Or does agency maintain separate list?

### 2. Data Ownership
**Q:** When Yodel Mobile adds a monitored app, which org owns it?

**Options:**
- A) Yodel Mobile owns it (current behavior)
- B) Specific client org owns it (need selector)
- C) Both? (shared monitoring)

### 3. UI Implications
**Q:** If agency sees client monitored apps, how to show in UI?

**Considerations:**
- "Client A is monitoring Competitor X"
- Filter by which org added it
- Permissions to edit/delete client's apps

---

## ✅ Clarified Scope

### Definitely Need Agency Fix:
1. ✅ **Dashboard V2** - BigQuery apps, agency manages client data
2. ✅ **org_app_access** table - Client apps in BigQuery
3. ✅ **bigquery-aso-data** Edge Function - Needs to query client orgs

### Maybe Need Agency Fix (Your Decision):
1. ❓ **Reviews page** - Depends on business model
2. ❓ **monitored_apps** - If sharing competitor lists
3. ❓ **app_competitors** - If sharing competitor definitions
4. ❓ **review_cache** - If sharing review data

---

## 🎯 My Question for You

**For the Reviews page:**

Do you want Yodel Mobile users to:

**A)** Only see apps THEY add to monitoring (separate from clients)
- Each org manages own competitor watch list
- Clean separation
- **No agency fix needed for Reviews**

**B)** See apps they add + apps their client orgs add
- Shared competitor intelligence
- See what clients are tracking
- **Agency fix needed for Reviews**

**C)** Have a way to choose which org they're adding for
- "Add for Yodel Mobile" vs "Add for Client A"
- Most flexible
- **Complex - needs UI changes + agency fix**

---

## 📝 Updated Implementation Plan

### Minimal Fix (Dashboard V2 Only):
```
1. Update org_app_access RLS
2. Update bigquery-aso-data Edge Function
3. Test Dashboard V2

Time: 30 minutes
Scope: BigQuery/analytics only
```

### Full Fix (Dashboard V2 + Reviews):
```
1. Update org_app_access RLS
2. Update monitored_apps RLS
3. Update app_competitors RLS
4. Update review_cache RLS
5. Update bigquery-aso-data Edge Function
6. Update useMonitoredApps hook
7. Update useAppCompetitors hook
8. Test both Dashboard V2 and Reviews page

Time: 1.5 hours
Scope: All agency features
```

---

## 🚀 Next Step

**Please clarify:**
1. Should Reviews page share data across agency-client boundary?
2. Or should each org have independent competitor watch lists?

Once confirmed, I'll provide the exact implementation scope.

---

**Status:** ⏸️ WAITING FOR CLARIFICATION
**Question:** Reviews page - shared or independent per org?
