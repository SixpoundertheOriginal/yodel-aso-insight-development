# Agency-Client Model Audit - Yodel Mobile

**Date:** November 7, 2025
**Issue:** Dashboard V2 not working for Yodel Mobile agency
**Root Cause:** Missing agency-to-client app access chain

---

## Discovery: Agency-Client Relationship Model

### System Architecture

Yodel Mobile operates as an **AGENCY** organization that manages apps for multiple CLIENT organizations.

#### Database Structure:

```
┌─────────────────┐
│ organizations   │
├─────────────────┤
│ Yodel Mobile    │ ← Agency org (7cccba3f...)
│ (Agency)        │
└─────────────────┘
         ↓ manages
┌─────────────────┐
│ client_org_map  │ ← Maps BigQuery clients to orgs
├─────────────────┤
│ Client_One  →   │
│ Client_Two  →   │ These map to OTHER org (dbdb0cc5...)
│ Client_Three →  │ NOT to Yodel Mobile!
└─────────────────┘
         ↓
┌─────────────────┐
│ org_app_access  │ ← Grants org access to apps
├─────────────────┤
│ Client_One  →   │ Other org: 23 apps
│ Client_Two  →   │ Yodel Mobile: 0 apps ❌
└─────────────────┘
         ↓
┌─────────────────┐
│ BigQuery Data   │
├─────────────────┤
│ client_reports. │
│ aso_all_apple   │
│                 │
│ Columns:        │
│ - app_id        │
│ - client  ←───  │ THIS is the identifier!
│ - date          │
│ - impressions   │
│ - downloads     │
└─────────────────┘
```

---

## Audit Results

### 1. Organizations

| Org ID | Name | Slug | Type |
|--------|------|------|------|
| `7cccba3f-0a8f-446f-9dba-86e9cb68c92b` | Yodel Mobile | yodel-mobile | **AGENCY** 🎯 |
| `dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f` | Demo Analytics Organization | demo-analytics-org | CLIENT 📦 |

### 2. client_org_map Table

Maps BigQuery `client` values to organizations:

| Client | Organization ID | Org Name |
|--------|----------------|----------|
| `Client_One` | `dbdb0cc5...` | Demo Analytics Org |
| `Client_Two` | `dbdb0cc5...` | Demo Analytics Org |
| `Client_Three` | `dbdb0cc5...` | Demo Analytics Org |
| `Client_Four` | `dbdb0cc5...` | Demo Analytics Org |
| `Client_Five` | `dbdb0cc5...` | Demo Analytics Org |
| `Client_Six` | `dbdb0cc5...` | Demo Analytics Org |
| `Client_Seven` | `dbdb0cc5...` | Demo Analytics Org |

**Issue:** All clients map to "Demo Analytics Org", NOT Yodel Mobile!

### 3. org_app_access Table

| Organization | Active Apps |
|--------------|-------------|
| Yodel Mobile | **0 apps** ❌ |
| Demo Analytics Org | **23 apps** ✅ |

Apps include:
- `Client_One` through `Client_Seven`
- Various demo apps
- Real app IDs (numbers)

---

## How Edge Function Works

### Current Logic (bigquery-aso-data/index.ts)

```typescript
// 1. Get user's organization ID
const resolvedOrgId = userOrgId; // For Yodel Mobile: 7cccba3f...

// 2. Query org_app_access for this org
const { data: accessData } = await supabaseClient
  .from("org_app_access")
  .select("app_id")
  .eq("organization_id", resolvedOrgId)  // Yodel Mobile
  .is("detached_at", null);

// 3. Extract allowed app IDs
const allowedAppIds = accessData.map(item => item.app_id);
// Result: [] (empty!) ❌

// 4. If empty, return early
if (appIdsForQuery.length === 0) {
  return new Response(JSON.stringify({
    data: [],
    message: "No apps attached to this organization"
  }));
}

// 5. Query BigQuery with app IDs
const query = `
  SELECT date, COALESCE(app_id, client) AS app_id, ...
  FROM aso_all_apple
  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
`;
// Never reaches here for Yodel Mobile!
```

**Problem:** Edge Function only checks **direct** app access via `org_app_access`.
It does NOT check agency relationships or `client_org_map`.

---

## The Missing Link

### What Should Happen (Agency Model):

```
1. User = cli@yodelmobile.com
   ↓
2. User's org = Yodel Mobile (agency)
   ↓
3. Check: Is Yodel Mobile an agency?
   ↓
4. If agency: Get all client orgs managed by Yodel Mobile
   ↓
5. Get apps from ALL client orgs
   ↓
6. Query BigQuery with client org apps
   ↓
7. Return data for agency user
```

### What Actually Happens:

```
1. User = cli@yodelmobile.com
   ↓
2. User's org = Yodel Mobile
   ↓
3. Query org_app_access for Yodel Mobile
   ↓
4. Find 0 apps ❌
   ↓
5. Return empty response
   ↓
6. Dashboard V2 fails
```

---

## Missing Components

### 1. Agency Relationship Table

**Needed:** Table to define which orgs are agencies and which are their clients

```sql
CREATE TABLE agency_clients (
  agency_org_id UUID REFERENCES organizations(id),
  client_org_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agency_org_id, client_org_id)
);

-- Map Yodel Mobile as agency managing Demo Analytics Org
INSERT INTO agency_clients (agency_org_id, client_org_id)
VALUES ('7cccba3f-0a8f-446f-9dba-86e9cb68c92b', -- Yodel Mobile
        'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'); -- Demo Analytics Org
```

### 2. Edge Function Agency Logic

**Needed:** Edge Function must check for agency relationships

```typescript
// After getting user's organization:
const resolvedOrgId = userOrgId;

// Check if this org is an agency
const { data: managedOrgs } = await supabaseClient
  .from("agency_clients")
  .select("client_org_id")
  .eq("agency_org_id", resolvedOrgId);

let orgsToQuery = [resolvedOrgId];
if (managedOrgs && managedOrgs.length > 0) {
  // This is an agency, include all client orgs
  orgsToQuery = [
    resolvedOrgId,
    ...managedOrgs.map(m => m.client_org_id)
  ];
}

// Get apps for ALL orgs (agency + clients)
const { data: accessData } = await supabaseClient
  .from("org_app_access")
  .select("app_id")
  .in("organization_id", orgsToQuery)
  .is("detached_at", null);
```

### 3. Alternative: Direct BigQuery Client Mapping

**Option:** Instead of org hierarchy, map Yodel Mobile directly to BigQuery clients

```sql
-- Option A: Add apps directly to Yodel Mobile
INSERT INTO org_app_access (app_id, organization_id, attached_at)
VALUES
  ('Client_One', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', NOW()),
  ('Client_Two', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', NOW()),
  ...
ON CONFLICT DO NOTHING;

-- Option B: Update client_org_map to point to Yodel Mobile
UPDATE client_org_map
SET organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
WHERE client IN ('Client_One', 'Client_Two', ...);
```

---

## BigQuery Data Structure

### Table: `aso-reporting-1.client_reports.aso_all_apple`

```sql
SELECT DISTINCT
  COALESCE(app_id, client) as identifier,
  COUNT(*) as row_count
FROM `aso-reporting-1.client_reports.aso_all_apple`
GROUP BY identifier
LIMIT 20;
```

The `client` column contains values like:
- `Client_One`
- `Client_Two`
- etc.

These are the identifiers stored in:
1. `client_org_map.client` (maps to org)
2. `org_app_access.app_id` (grants access)

---

## Solutions (3 Options)

### Option 1: Create Agency Hierarchy (PROPER)

**Pro:** Maintains separation, scalable for multiple agencies
**Con:** Requires Edge Function changes

1. Create `agency_clients` table
2. Map Yodel Mobile → Demo Analytics Org
3. Update Edge Function to check agency relationships
4. Query apps from all managed client orgs

### Option 2: Direct App Assignment (QUICK FIX)

**Pro:** No Edge Function changes, works immediately
**Con:** Doesn't properly model agency relationship

1. Add all client apps directly to Yodel Mobile in `org_app_access`
2. Dashboard V2 works immediately
3. Doesn't reflect actual agency-client relationship

### Option 3: Reassign Clients (SIMPLEST)

**Pro:** Uses existing system, minimal changes
**Con:** Breaks Demo Analytics Org access (if it's being used)

1. Update `client_org_map` to point clients to Yodel Mobile instead
2. Clients now belong to Yodel Mobile
3. `org_app_access` already has the apps linked to those clients

---

## Recommended Approach

### Phase 1: Quick Fix (Option 2)
Enable Dashboard V2 immediately:

```sql
-- Copy all apps from Demo Analytics Org to Yodel Mobile
INSERT INTO org_app_access (app_id, organization_id, attached_at, detached_at)
SELECT app_id, '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', NOW(), NULL
FROM org_app_access
WHERE organization_id = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'
  AND detached_at IS NULL
ON CONFLICT (app_id, organization_id) DO NOTHING;
```

### Phase 2: Proper Architecture (Option 1)
Implement agency hierarchy:

1. Create `agency_clients` table
2. Update Edge Function with agency logic
3. Map relationships properly
4. Test with Yodel Mobile

---

## Impact Analysis

### Current State:
- ❌ Yodel Mobile: 0 apps, Dashboard V2 broken
- ✅ Demo Analytics Org: 23 apps, working

### After Quick Fix (Option 2):
- ✅ Yodel Mobile: 23 apps, Dashboard V2 works
- ✅ Demo Analytics Org: 23 apps, still working
- ⚠️  Duplicate data (same apps in 2 orgs)

### After Proper Fix (Option 1):
- ✅ Yodel Mobile: Access to client apps via agency relationship
- ✅ Demo Analytics Org: Remains client org
- ✅ Clean separation, scalable architecture

---

## Questions for Decision

1. **Is Demo Analytics Org actually used?**
   - If yes: Use Option 2 (duplicate access)
   - If no: Use Option 3 (reassign clients)

2. **Will there be more agencies?**
   - If yes: Use Option 1 (proper hierarchy)
   - If no: Use Option 2 (quick fix)

3. **What are the actual client names?**
   - Are `Client_One`, `Client_Two` placeholders?
   - Or real BigQuery client identifiers?

4. **Should Yodel Mobile manage multiple client orgs?**
   - If yes: Need Option 1
   - If Yodel Mobile IS the only client: Use Option 3

---

## Status

**Root Cause:** ✅ IDENTIFIED
**Type:** Architecture/Data issue, not code bug
**Blocking:** Missing agency-client relationship or direct app access
**Next Step:** Choose solution option and implement

---

## Files for Reference

- `/supabase/migrations/20251201101000_create_client_org_map.sql` - Client mapping
- `/supabase/migrations/20251101140000_create_org_app_access.sql` - App access
- `/supabase/functions/bigquery-aso-data/index.ts:269-316` - App access logic
- `/supabase/functions/bigquery-aso-data/index.ts:382-394` - BigQuery query

---

**Conclusion:** Dashboard V2 is broken because Yodel Mobile (agency) has no direct app access, and the system doesn't follow agency-client relationships to resolve app access. Choose a solution option based on business requirements.
