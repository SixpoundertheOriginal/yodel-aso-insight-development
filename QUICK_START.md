# Quick Start Guide

**Yodel ASO Insight Platform**
**Last Updated**: 2025-11-09

Welcome! This guide will get you up and running with the Yodel ASO Insight platform in 15 minutes.

---

## 🎯 What Is This Platform?

**Yodel ASO Insight** is an enterprise App Store Optimization (ASO) analytics platform that helps agencies manage client apps.

**Key Features**:
- 📊 BigQuery-powered analytics dashboards
- 🔍 Keyword intelligence and tracking
- ⭐ Review monitoring and analysis
- 🎯 Competitor analysis
- 📈 Conversion rate optimization insights
- 🤖 ASO AI assistant

---

## 🚀 Getting Started (5 Minutes)

### Prerequisites

**Required**:
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Git (`git --version`)
- Supabase CLI (`supabase --version`)

**Accounts Needed**:
- Supabase project (database + auth)
- Google Cloud (for BigQuery)

---

### 1. Clone and Install

```bash
# Clone repository
git clone <repo-url>
cd yodel-aso-insight

# Install dependencies
npm install

# Should complete in ~2 minutes
```

---

### 2. Environment Setup

**Create `.env.local`**:
```bash
cp .env.example .env.local
```

**Required Variables**:
```bash
# Supabase
VITE_SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Database (for migrations)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DATABASE_PASSWORD=[password]

# BigQuery
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET_ID=your-dataset-id
BIGQUERY_CREDENTIALS=[base64-encoded-service-account-json]
```

**Get Your Credentials**:
1. **Supabase**: Project Settings → API → URL and anon key
2. **Database**: Project Settings → Database → Connection string
3. **BigQuery**: Google Cloud Console → Service Accounts → Create key

---

### 3. Database Migrations

**Run All Migrations**:
```bash
# Check migration status
supabase migration list

# Apply pending migrations
supabase db push

# Should show all migrations as "Applied" ✅
```

**Verify Critical Tables Exist**:
```bash
# Quick check
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('organizations', 'user_roles', 'organization_features', 'user_permissions_unified')
  ORDER BY table_name;
"

# Should show 4 tables
```

---

### 4. Start Development Server

```bash
# Start frontend dev server
npm run dev:frontend

# Opens at http://localhost:8080
```

**You should see**:
- Login page
- Supabase Auth UI
- Console logs: `[HealthCheck] Supabase invoke successful`

---

## 👤 User Setup (First Login)

### Option 1: Create New User

1. Go to http://localhost:8080
2. Click "Sign Up"
3. Enter email and password
4. Check email for verification link
5. Click link to verify

**⚠️ User won't have access yet** - needs organization and role assignment.

---

### Option 2: Use Test User

**Test Account** (if already created):
```
Email: cli@yodelmobile.com
Password: [ask team]
Organization: Yodel Mobile
Role: ORG_ADMIN
Access: Full platform
```

---

### Assign Organization and Role

**Run SQL to assign user**:
```sql
-- 1. Get user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. Assign to organization
INSERT INTO user_roles (user_id, organization_id, role)
VALUES (
  '<user-id-from-step-1>',
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',  -- Yodel Mobile org ID
  'ORG_ADMIN'::app_role
);

-- 3. Verify
SELECT * FROM user_permissions_unified WHERE user_id = '<user-id>';
```

**Expected Result**:
```json
{
  "role": "ORG_ADMIN",
  "effective_role": "org_admin",
  "is_org_admin": true,
  "org_name": "Yodel Mobile"
}
```

---

## 🎓 Understanding the Platform

### Business Model: Agency

**Yodel Mobile is an AGENCY** managing client apps.

```
Yodel Mobile (Agency)
  ↓ manages
Multiple Client Apps
  ↓ data in
BigQuery (external analytics)
  ↓ accessed by
Agency employees (ORG_ADMIN users)
```

**Key Points**:
- Agency doesn't "own" apps (apps belong to clients)
- BigQuery stores client app performance data
- Users have full platform access (access_level = 'full')
- No subscription billing (internal company tool)

---

### Architecture Overview

**Three-Layer Security**:

**Layer 1: Route Access**
```
organizations.access_level = 'full'
→ User sees all ~40 pages in navigation
```

**Layer 2: Feature Flags**
```
organization_features table
→ Specific features enabled per org
→ Example: keyword_intelligence = true
```

**Layer 3: RLS Policies**
```
Row-Level Security on tables
→ User can only access data for their organization
→ Except BigQuery (external, no RLS)
```

---

### Data Flow

**1. User Login**:
```
Supabase Auth
→ JWT token issued
→ auth.uid() available in queries
```

**2. Profile Load**:
```
useUserProfile hook
→ Fetches from user_permissions_unified view
→ Gets: role, org_id, is_org_admin, access_level
→ React Query caches for 5 minutes
```

**3. Navigation Render**:
```
AppSidebar reads access_level
→ getAllowedRoutes({ orgAccessLevel: 'full' })
→ Returns ~40 routes
→ Navigation menu shows all pages
```

**4. Feature Access**:
```
ProtectedRoute checks organization_features
→ Queries: is_enabled for feature_key
→ Redirects if feature disabled
```

**5. Data Queries**:
```
Dashboard V2 → BigQuery Edge Function
Reviews → Direct iTunes API
Other pages → Supabase tables (with RLS)
```

---

## 📁 Project Structure

```
/
├── src/
│   ├── components/          # React components
│   │   ├── AppSidebar.tsx  # Navigation (uses getAllowedRoutes)
│   │   ├── ProtectedRoute.tsx  # Feature flag checks
│   │   └── reviews/         # Reviews feature components
│   ├── hooks/              # React hooks
│   │   ├── useUserProfile.ts  # User profile + permissions
│   │   ├── usePermissions.ts  # Permission checks
│   │   └── useOrgAccessLevel.ts  # Route access level
│   ├── pages/              # Page components
│   │   ├── ReportingDashboardV2.tsx  # BigQuery dashboard
│   │   └── growth-accelerators/
│   │       ├── keywords.tsx
│   │       └── reviews.tsx
│   ├── services/           # API integrations
│   │   ├── direct-itunes.service.ts  # iTunes API
│   │   └── competitor-review-intelligence.service.ts
│   ├── config/             # Configuration
│   │   └── allowedRoutes.ts  # Route access logic
│   └── integrations/
│       └── supabase/
│           ├── client.ts   # Supabase client
│           └── types.ts    # Generated DB types
├── supabase/
│   ├── migrations/         # Database migrations
│   │   └── 202511*/        # Recent critical migrations
│   └── functions/          # Edge Functions
│       └── bigquery-aso-data/  # BigQuery analytics
├── docs/                   # Documentation
│   ├── architecture/       # Architecture docs
│   ├── completed-fixes/    # Historical fixes
│   └── operational/        # Operational guides
└── *.md                    # Root documentation
    ├── README.md
    ├── CURRENT_SYSTEM_STATUS.md  # ← START HERE
    ├── QUICK_START.md (this file)
    └── TROUBLESHOOTING.md
```

---

## 🔍 Common Development Tasks

### Generate TypeScript Types from Database

**When**: After running migrations that change schema

```bash
# Option 1: From local Supabase
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Option 2: From remote database
supabase gen types typescript --db-url "$DATABASE_URL" > src/integrations/supabase/types.ts
```

**Why Important**: If types are out of sync, frontend won't see new columns (like `access_level`).

---

### Add New Migration

```bash
# Create new migration
supabase migration new my_feature_name

# Opens: supabase/migrations/[timestamp]_my_feature_name.sql

# Write SQL, then apply
supabase db push

# Verify
supabase migration list
```

---

### Test User Permissions

```bash
# In browser console:
const { data } = await supabase
  .from('user_permissions_unified')
  .select('*')
  .eq('user_id', '[your-user-id]')
  .single();

console.log('Your permissions:', data);
```

**Expected Output**:
```json
{
  "effective_role": "org_admin",
  "is_org_admin": true,
  "org_name": "Yodel Mobile",
  "org_id": "7cccba3f-..."
}
```

---

### Check React Query Cache

```bash
# In browser console:
queryClient.getQueryData(['user-profile'])

# Shows cached profile data
# If stale, invalidate:
queryClient.invalidateQueries(['user-profile'])
```

---

### Deploy Edge Functions

```bash
# Deploy BigQuery function
supabase functions deploy bigquery-aso-data

# Check deployment
supabase functions list

# View logs
supabase functions logs bigquery-aso-data
```

---

## 🐛 Quick Debugging

### Problem: User Can't Access Pages

**Check 1: access_level**:
```sql
SELECT access_level FROM organizations
WHERE id = '[org-id]';

-- Should be: 'full'
```

**Check 2: User role**:
```sql
SELECT * FROM user_permissions_unified
WHERE user_id = '[user-id]';

-- Should show: is_org_admin = true
```

**Check 3: Browser cache**:
```
Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

### Problem: RLS 403 Errors

**Check enum case**:
```sql
SELECT role FROM user_roles WHERE user_id = '[user-id]';

-- Should be UPPERCASE: 'ORG_ADMIN' (not 'org_admin')
```

**Check RLS policies**:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = '[table-name]';

-- Policies should use UPPERCASE enum values
```

---

### Problem: BigQuery Returns 0 Rows

**This is often NORMAL** (not an error):
- Date range may have no data
- Client apps may not have recent activity
- Check query succeeded (response time ~1.5-2s)

**Verify query working**:
```
Console should show:
  Raw Rows: 0
  Query Duration: 1656ms  ← Success!
  Available Traffic Sources: 0  ← Expected if no data
```

---

## 📚 Next Steps

**After Setup**:
1. ✅ Read `CURRENT_SYSTEM_STATUS.md` - Understand current working state
2. ✅ Read `ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md` - Official architecture spec
3. ✅ Read `YODEL_MOBILE_AGENCY_CONTEXT_ANALYSIS.md` - Business model context
4. ✅ Read `TROUBLESHOOTING.md` - Common issues and solutions

**For Development**:
1. Check `DEVELOPMENT_GUIDE.md` for coding standards
2. Check `DEPLOYMENT_CHECKLIST.md` before deploying
3. Review `docs/architecture/` for system design

**For Features**:
1. Reviews: `src/pages/growth-accelerators/reviews.tsx`
2. Keywords: `src/pages/growth-accelerators/keywords.tsx`
3. Dashboard V2: `src/pages/ReportingDashboardV2.tsx`

---

## ✅ Checklist: You're Ready When...

**Environment**:
- ✅ `npm install` completed without errors
- ✅ `.env.local` has all required variables
- ✅ `supabase migration list` shows all migrations applied
- ✅ TypeScript types generated (`types.ts` exists)

**Access**:
- ✅ Can log in at http://localhost:8080
- ✅ Navigation shows ~40 pages (not just 6)
- ✅ Can access Keywords and Reviews pages
- ✅ Console shows: `[Sidebar] Loaded: routes=~40`

**Data**:
- ✅ `user_permissions_unified` view exists
- ✅ Your user has `is_org_admin = true`
- ✅ `access_level = 'full'` in organizations table

**Understanding**:
- ✅ Know Yodel Mobile is an AGENCY (not a client)
- ✅ Know BigQuery is external (app-centric data)
- ✅ Know three-layer security (route + feature + RLS)
- ✅ Know view abstraction (UPPERCASE → lowercase)

---

## 🆘 Getting Help

**Documentation**:
- `CURRENT_SYSTEM_STATUS.md` - Current working state
- `TROUBLESHOOTING.md` - Common issues
- `docs/architecture/` - System design docs

**Console Debugging**:
```javascript
// Check permissions
queryClient.getQueryData(['user-profile'])

// Check Supabase client
console.log(supabase)

// Direct query test
const { data, error } = await supabase
  .from('user_permissions_unified')
  .select('*')
  .single()
console.log({ data, error })
```

**SQL Debugging**:
```sql
-- Check your user
SELECT * FROM user_permissions_unified
WHERE user_id = auth.uid();

-- Check organization
SELECT * FROM organizations
WHERE id = '[org-id]';

-- Check features
SELECT * FROM organization_features
WHERE organization_id = '[org-id]';
```

---

## 🎉 You're Ready!

You should now have:
- ✅ Development environment running
- ✅ User account with full access
- ✅ Understanding of architecture
- ✅ Knowledge of common debugging steps

**Start building**! 🚀

---

**Quick Links**:
- [Current System Status](CURRENT_SYSTEM_STATUS.md) - What's working now
- [Architecture Docs](docs/architecture/) - How it's built
- [Troubleshooting](TROUBLESHOOTING.md) - Fix common issues
- [Development Guide](DEVELOPMENT_GUIDE.md) - Coding standards

**Welcome to the team!** 👋
