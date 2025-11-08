# Phase 2 Migration - Manual SQL Instructions

**Migration File**: `supabase/migrations/20251108300000_add_organization_access_level.sql`  
**Status**: ⚠️ **NEEDS MANUAL APPLICATION**  
**Reason**: Migration timestamp conflict - must apply via Supabase SQL Editor

---

## 🚀 Instructions

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf
2. Click "SQL Editor" in left sidebar
3. Create new query

### Step 2: Run This SQL

Copy and paste this into SQL Editor and click "Run":

```sql
-- Add access_level column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'full'
  CHECK (access_level IN ('full', 'reporting_only', 'custom'));

-- Set Yodel Mobile to reporting-only access
UPDATE organizations
SET access_level = 'reporting_only'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- Add column comment
COMMENT ON COLUMN organizations.access_level IS
  'Controls route access level: full (all routes), reporting_only (dashboard/analytics only), custom (future)';

-- Create performance index
CREATE INDEX IF NOT EXISTS idx_organizations_access_level
  ON organizations(access_level)
  WHERE access_level != 'full';

-- Verify results
SELECT
  id,
  name,
  slug,
  access_level,
  subscription_tier
FROM organizations
ORDER BY
  CASE access_level
    WHEN 'reporting_only' THEN 1
    WHEN 'custom' THEN 2
    WHEN 'full' THEN 3
  END,
  name;
```

### Step 3: Verify Results

You should see output showing:
- **Yodel Mobile**: `access_level` = `'reporting_only'` ✅
- **All other orgs**: `access_level` = `'full'` ✅

### Step 4: Test Locally

```bash
# Run verification script
bash -c 'if [ -f .env.local ]; then source .env.local; elif [ -f .env ]; then source .env; fi && SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" node apply-access-level-simple.mjs'
```

Should show:
- ✅ Column already exists
- ✅ Yodel Mobile set to reporting_only
- ✅ List of all orgs with their access levels

---

## ✅ Success Criteria

After running the SQL:
- [ ] `organizations.access_level` column exists
- [ ] Yodel Mobile has `access_level = 'reporting_only'`
- [ ] All other orgs have `access_level = 'full'`
- [ ] Index created for performance
- [ ] Column comment added for documentation

---

## 🔍 What This Does

**Before**:
- Phase 1: Hardcoded list in `getAllowedRoutes()` restricts Yodel Mobile
- Works, but requires code change for each new restricted org

**After**:
- Phase 2: Database-driven `access_level` field
- Easy to add more restricted orgs (just UPDATE SQL, no code change)
- Scalable and maintainable

---

## 🎯 Alternative: If SQL Editor Not Available

Run this from command line (if you have direct database access):

```bash
if [ -f .env.local ]; then source .env.local; elif [ -f .env ]; then source .env; fi

psql "$DATABASE_URL" << 'SQL'
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'full'
  CHECK (access_level IN ('full', 'reporting_only', 'custom'));

UPDATE organizations
SET access_level = 'reporting_only'
WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

COMMENT ON COLUMN organizations.access_level IS
  'Controls route access level: full/reporting_only/custom';

CREATE INDEX IF NOT EXISTS idx_organizations_access_level
  ON organizations(access_level)
  WHERE access_level != 'full';
SQL
```

---

**Ready to apply?** Follow Step 1-3 above.
