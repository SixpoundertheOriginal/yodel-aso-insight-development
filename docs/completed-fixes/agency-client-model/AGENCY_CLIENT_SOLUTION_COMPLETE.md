# Agency-Client Solution - Complete Implementation Guide

**Date:** November 7, 2025
**Status:** 🎉 **INFRASTRUCTURE EXISTS - NEEDS EDGE FUNCTION INTEGRATION**

---

## 🔍 Discovery: Infrastructure Already Exists!

### What We Found:

```
✅ agency_clients table EXISTS in database
✅ Yodel Mobile IS configured as an agency
✅ Manages 2 client organizations:
   - Demo Analytics Organization (dbdb0cc5...)
   - Demo Analytics (550e8400...002)
```

### Existing Relationships:

| Agency | Client Org | Active |
|--------|-----------|--------|
| **Yodel Mobile** | Demo Analytics Organization | ✅ YES |
| **Yodel Mobile** | Demo Analytics | ✅ YES |
| Demo Analytics Organization | Demo Client Corp | ✅ YES |

---

## ❌ The Problem

**The Edge Function doesn't use the `agency_clients` table!**

### Current Edge Function Logic:
```typescript
// bigquery-aso-data/index.ts:269-283
const { data: accessData } = await supabaseClient
  .from("org_app_access")
  .select("app_id")
  .eq("organization_id", resolvedOrgId)  // Only checks THIS org
  .is("detached_at", null);

// Result for Yodel Mobile: 0 apps ❌
```

**Missing:** Query to check if org is an agency and get client org apps.

---

## ✅ The Solution

### Option 1: Add Agency Logic to Edge Function (PROPER - Recommended)

**File:** `supabase/functions/bigquery-aso-data/index.ts`

**Insert after line 267 (after resolvedOrgId is set):**

```typescript
// 🎯 NEW: Check if this organization is an agency
const { data: managedClients, error: agencyError } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId)
  .eq("is_active", true);

if (agencyError) {
  log(requestId, "[AGENCY] Error checking agency status", agencyError);
}

// Build list of organizations to query (self + managed clients)
let organizationsToQuery = [resolvedOrgId];
if (managedClients && managedClients.length > 0) {
  const clientOrgIds = managedClients.map(m => m.client_org_id);
  organizationsToQuery = [resolvedOrgId, ...clientOrgIds];

  log(requestId, "[AGENCY] Agency mode active", {
    agencyOrg: resolvedOrgId,
    managedClients: clientOrgIds.length,
    totalOrgsToQuery: organizationsToQuery.length
  });
}

// 🎯 MODIFIED: Query app access for ALL organizations (agency + clients)
const { data: accessData, error: accessError } = await supabaseClient
  .from("org_app_access")
  .select("app_id, attached_at, detached_at")
  .in("organization_id", organizationsToQuery)  // Changed from .eq() to .in()
  .is("detached_at", null);
```

**Complete Replacement (lines 269-283):**

```typescript
  // 🎯 [AGENCY SUPPORT] Check if this organization is an agency
  const { data: managedClients, error: agencyError } = await supabaseClient
    .from("agency_clients")
    .select("client_org_id")
    .eq("agency_org_id", resolvedOrgId)
    .eq("is_active", true);

  if (agencyError) {
    log(requestId, "[AGENCY] Error checking agency status", agencyError);
  }

  // Build list of organizations to query (self + managed clients)
  let organizationsToQuery = [resolvedOrgId];
  if (managedClients && managedClients.length > 0) {
    const clientOrgIds = managedClients.map(m => m.client_org_id);
    organizationsToQuery = [resolvedOrgId, ...clientOrgIds];

    log(requestId, "[AGENCY] Agency mode enabled", {
      agency_org_id: resolvedOrgId,
      managed_client_count: clientOrgIds.length,
      client_org_ids: clientOrgIds,
      total_orgs_to_query: organizationsToQuery.length
    });
  }

  // [ACCESS] Get app access for ALL organizations (agency + managed clients)
  const { data: accessData, error: accessError } = await supabaseClient
    .from("org_app_access")
    .select("app_id, attached_at, detached_at")
    .in("organization_id", organizationsToQuery)
    .is("detached_at", null);

  if (accessError) {
    log(requestId, "[ACCESS] Failed to check app access", accessError);
    return new Response(
      JSON.stringify({ error: "Failed to validate app access", details: accessError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const allowedAppIds = (accessData ?? []).map((item) => item.app_id).filter((id): id is string => Boolean(id));

  log(requestId, "[ACCESS] App access validated", {
    organizations_queried: organizationsToQuery.length,
    is_agency: managedClients && managedClients.length > 0,
    requested_apps: Array.isArray(requestedAppIds) ? requestedAppIds.length : 0,
    allowed_apps: allowedAppIds.length,
    apps: allowedAppIds,
  });
```

---

## 📊 Expected Results After Fix

### Before (Current):
```
User: cli@yodelmobile.com
Organization: Yodel Mobile (7cccba3f...)
Query: org_app_access WHERE org_id = 7cccba3f...
Result: 0 apps ❌
Dashboard: Broken
```

### After (With Agency Logic):
```
User: cli@yodelmobile.com
Organization: Yodel Mobile (7cccba3f...)
Check: agency_clients WHERE agency_org_id = 7cccba3f...
Found: 2 client orgs (dbdb0cc5..., 550e8400...002)
Query: org_app_access WHERE org_id IN (7cccba3f..., dbdb0cc5..., 550e8400...002)
Result: 23 apps ✅ (from client orgs)
Dashboard: Working!
```

---

## 🔧 Implementation Steps

### Step 1: Update Edge Function

```bash
# Edit the file
nano supabase/functions/bigquery-aso-data/index.ts

# Apply the changes at lines 269-283
# (See complete replacement code above)
```

### Step 2: Deploy Edge Function

```bash
supabase functions deploy bigquery-aso-data
```

### Step 3: Test

```bash
# Test with curl or visit Dashboard V2
# Should now return data for Yodel Mobile users
```

---

## 🎯 Alternative: Quick Fix (No Code Changes)

If you can't deploy immediately, add apps directly to Yodel Mobile:

```sql
-- Copy all apps from client orgs to Yodel Mobile
INSERT INTO org_app_access (app_id, organization_id, attached_at, detached_at)
SELECT DISTINCT app_id, '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', NOW(), NULL
FROM org_app_access
WHERE organization_id IN (
  'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f',  -- Demo Analytics Organization
  '550e8400-e29b-41d4-a716-446655440002'   -- Demo Analytics
)
AND detached_at IS NULL
ON CONFLICT (app_id, organization_id) DO NOTHING;
```

**Pro:** Works immediately, no deployment
**Con:** Duplicates data, doesn't use proper agency relationship

---

## 📝 Database Schema Reference

### agency_clients Table (EXISTS)

```sql
CREATE TABLE agency_clients (
  agency_org_id UUID REFERENCES organizations(id),
  client_org_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (agency_org_id, client_org_id)
);
```

**Current Data:**
- Yodel Mobile → Demo Analytics Organization ✅
- Yodel Mobile → Demo Analytics ✅
- Demo Analytics Organization → Demo Client Corp ✅

### org_app_access Table (EXISTS)

| Organization | Apps |
|--------------|------|
| Demo Analytics Organization | 23 apps |
| Demo Analytics | ? apps |
| Yodel Mobile | 0 apps |

---

## 🔍 Verification Queries

### Check Agency Relationships:
```sql
SELECT
  a.name as agency,
  c.name as client,
  ac.is_active
FROM agency_clients ac
JOIN organizations a ON a.id = ac.agency_org_id
JOIN organizations c ON c.id = ac.client_org_id
WHERE ac.is_active = true;
```

### Check Apps for Agency + Clients:
```sql
SELECT
  o.name as org_name,
  COUNT(DISTINCT oaa.app_id) as app_count
FROM organizations o
LEFT JOIN agency_clients ac ON o.id = ac.agency_org_id
LEFT JOIN org_app_access oaa ON oaa.organization_id IN (o.id, ac.client_org_id)
WHERE o.id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
  AND (oaa.detached_at IS NULL OR oaa.detached_at IS NULL)
GROUP BY o.id, o.name;
```

---

## 📚 Related Documentation

### Existing (Found in repo):
- `docs/app-discovery-system.md` - App discovery architecture
- `docs/ARCHITECTURE.md` - Multi-tenant isolation
- `supabase/functions/app-discovery/index.ts` - Uses `client_org_map`

### Historical Commits:
- `5395c51` - Implement Master Organization Structure (Aug 15, 2025)
- `6ec092a` - Refactor App Discovery to use `client_org_map` (Oct 27, 2025)

### Missing:
- ❌ `agency_clients` migration file not in `/supabase/migrations/`
- ❌ Edge Function doesn't use `agency_clients` table
- ❌ Documentation for agency-client model

---

## ✅ Summary

### What Exists:
1. ✅ `agency_clients` table in database
2. ✅ Yodel Mobile configured as agency
3. ✅ Client organizations with apps

### What's Missing:
1. ❌ Edge Function doesn't check `agency_clients`
2. ❌ Migration file for `agency_clients` table
3. ❌ Documentation for agency model

### Solution:
**Update Edge Function to use `agency_clients` table** (10 minutes)

### Impact:
- ✅ Dashboard V2 works for Yodel Mobile
- ✅ Agency users see all client apps
- ✅ Proper multi-tenant isolation maintained
- ✅ Scalable for multiple agencies

---

## 🚀 Recommended Action

**1. Implement Option 1 (Agency Logic in Edge Function)**
   - Proper architecture
   - Uses existing infrastructure
   - 10-minute code change + deploy

**2. Deploy and Test**
   - Deploy Edge Function
   - Test with cli@yodelmobile.com
   - Verify Dashboard V2 loads

**3. Document**
   - Add migration file for `agency_clients`
   - Update app-discovery-system.md
   - Document agency model

---

## 📋 Code Change Checklist

- [ ] Edit `supabase/functions/bigquery-aso-data/index.ts`
- [ ] Add agency_clients query (lines 269-270)
- [ ] Build organizationsToQuery array (lines 271-281)
- [ ] Change `.eq()` to `.in()` in org_app_access query (line 286)
- [ ] Add logging for agency mode (lines 273-279)
- [ ] Test locally (if possible)
- [ ] Deploy to Supabase
- [ ] Verify Dashboard V2 works
- [ ] Commit changes
- [ ] Update documentation

---

**Status:** ✅ SOLUTION IDENTIFIED - READY TO IMPLEMENT
**Complexity:** Low (simple code change)
**Time Estimate:** 10-15 minutes
**Risk:** Low (adds functionality, doesn't break existing)
