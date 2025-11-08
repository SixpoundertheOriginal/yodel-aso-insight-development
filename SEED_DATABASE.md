# Database Seeding Guide

This guide explains how to seed the database with the Yodel Mobile organization and cli@yodelmobile.com user.

## Status

✅ **Vite cache cleared**
✅ **Frontend rebuilt** (all UI changes applied)

## Prerequisites

You need your **Supabase Service Role Key** to create users. Get it from:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/settings/api
2. Look for the **"service_role"** key (NOT the anon key)
3. Copy it

## Option 1: Automated Seeding (Recommended)

### Step 1: Set the Service Role Key

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

Or add it to a `.env.local` file:

```bash
echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here" >> .env.local
source .env.local
```

### Step 2: Run the Seed Script

```bash
node scripts/seed-yodel-mobile.mjs
```

This will:
- ✅ Create "Yodel Mobile" organization (slug: yodel-mobile)
- ✅ Create cli@yodelmobile.com user in auth.users
- ✅ Create user profile
- ✅ Create user_roles entry (ORG_ADMIN)
- ✅ Enable features: app_core_access, executive_dashboard, reviews, reporting_v2

### Login Credentials

After seeding:
- **Email:** cli@yodelmobile.com
- **Password:** YodelAdmin123!

---

## Option 2: Manual Seeding (via Supabase Dashboard)

If you prefer to use the Supabase Dashboard:

### Step 1: Create Auth User

1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/auth/users
2. Click **"Add User"**
3. Enter:
   - Email: `cli@yodelmobile.com`
   - Password: `YodelAdmin123!` (or your choice)
   - Confirm email: ✅ Yes
4. Click **"Create User"**
5. **Important:** Copy the User ID from the created user

### Step 2: Update seed.sql

1. Open `supabase/seed.sql`
2. Replace `8920ac57-63da-4f8e-9970-719be1e2569c` with your actual User ID from Step 1
3. Save the file

### Step 3: Run SQL Seed Script

Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/sql/new

Copy and paste the contents of `supabase/seed.sql` and click **"Run"**.

---

## Option 3: Using Migrations (Local Development)

If you're using local Supabase:

```bash
# Reset database (runs all migrations + seed)
npx supabase db reset

# Or push to remote
npx supabase db push
```

**Note:** You still need to create the auth user first (see Option 2, Step 1).

---

## Verification

After seeding, verify the setup:

```bash
node scripts/simple-db-check.mjs
```

You should see:
- ✅ 1 organization: Yodel Mobile (yodel-mobile)
- ✅ 1 profile: cli@yodelmobile.com
- ✅ 1 user_role: ORG_ADMIN with organization_id
- ✅ 4 features enabled

---

## Testing the UI Changes

After seeding:

1. **Clear browser cache** or open an incognito window
2. Login with cli@yodelmobile.com
3. Navigate to admin pages and verify:

### Expected UI Changes for ORG_ADMIN:

**User Management** (`/admin/users`):
- ✅ Header: "Manage users in your organization" (not "across all organizations")
- ✅ Only shows users from Yodel Mobile

**Organization Health** (`/admin/dashboard`):
- ✅ Only shows Yodel Mobile organization health
- ✅ Filters out other organizations (AppStorm, MobileFirst, etc.)

**Dashboard** (`/admin/dashboard`):
- ✅ Title: "Yodel Mobile Dashboard" (not "Platform Overview")
- ✅ Metrics: "Organization Users" (not "Platform Users")
- ✅ Metrics: "Organization Health" (not "Platform Health")

### No More Confusing Labels!

Before:
- ❌ "Loaded 45 users across all organizations" (confusing for ORG_ADMIN)
- ❌ Shows competitors: AppStorm Studios, MobileFirst Inc
- ❌ "Platform Overview" title for non-super-admins

After:
- ✅ "Loaded 12 users in your organization"
- ✅ Only shows Yodel Mobile data
- ✅ "Yodel Mobile Dashboard" title

---

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is required"

Make sure you've exported the service role key (see Prerequisites above).

### Error: "User already exists"

The user might have been created in a previous attempt. You can:
1. Use Option 2 (Manual) to get the existing user ID
2. Update `seed.sql` with the correct user ID
3. Run the SQL seed script

### Error: "organization_id is NULL"

This means the user exists but isn't linked to an organization. Run:

```sql
UPDATE user_roles
SET organization_id = (SELECT id FROM organizations WHERE slug = 'yodel-mobile'),
    role = 'ORG_ADMIN'
WHERE email = 'cli@yodelmobile.com';
```

---

## Files Created

- `scripts/seed-yodel-mobile.mjs` - Automated Node.js seed script
- `supabase/seed.sql` - SQL-based seed script
- `scripts/create-yodel-user.sh` - Helper script for auth user creation
- `scripts/simple-db-check.mjs` - Database verification script

---

## Next Steps

After successful seeding:

1. ✅ Login with cli@yodelmobile.com
2. ✅ Verify the UI shows organization-scoped data
3. ✅ Test the Reviews page (should now be accessible)
4. ✅ Test the Dashboard V2 (should route to executive dashboard)

---

## Summary

| Task | Status |
|------|--------|
| Clear Vite cache | ✅ Done |
| Rebuild frontend | ✅ Done |
| Seed database | ⏳ Pending (follow steps above) |
| Test UI changes | ⏳ Pending (after seeding) |
