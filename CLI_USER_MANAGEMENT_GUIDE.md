# 🚀 Backend User Management CLI - Complete Guide

**Status:** ✅ ALL TESTS PASSED
**Date:** 2025-11-25
**Organization:** Yodel Mobile

---

## ✅ TEST RESULTS

All 6 tests passed successfully:

- ✅ **TEST 1:** User Creation - PASSED
- ✅ **TEST 2:** List Users - PASSED
- ✅ **TEST 3:** Get User Details - PASSED
- ✅ **TEST 4:** Verify org_id - PASSED
- ✅ **TEST 5:** Delete User - PASSED
- ✅ **TEST 6:** Verify Deletion - PASSED

**Key Verification:**
- ✅ `org_id` is correctly set to Yodel Mobile organization
- ✅ Profile auto-created by database trigger
- ✅ Roles assigned correctly
- ✅ Users can be listed, retrieved, and deleted

---

## 📋 AVAILABLE COMMANDS

### 1. Create User
```bash
node cli-user-management.mjs create <email> <first_name> <last_name> [role]
```

**Example:**
```bash
node cli-user-management.mjs create sarah@yodelmobile.com Sarah Johnson ORG_ADMIN
```

**Roles:**
- `SUPER_ADMIN` - Platform-wide admin
- `ORG_ADMIN` - Organization admin
- `ASO_MANAGER` - ASO management access
- `ANALYST` - Analytics access
- `VIEWER` - Read-only access (default)

### 2. List All Users
```bash
node cli-user-management.mjs list
```

Shows all users in Yodel Mobile organization with their roles.

### 3. Get User Details
```bash
node cli-user-management.mjs get <email>
```

**Example:**
```bash
node cli-user-management.mjs get igor@yodelmobile.com
```

### 4. Delete User
```bash
node cli-user-management.mjs delete <email>
```

**Example:**
```bash
node cli-user-management.mjs delete test@example.com
```

⚠️ This permanently deletes the user!

### 5. Run Full Test Suite
```bash
node cli-user-management.mjs test-full-flow
```

Runs all 6 tests to verify the system is working correctly.

---

## 🎯 QUICK START

### Setup
```bash
# Set environment variable (already in your .env)
export SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d"=" -f2)
```

### Common Tasks

**Create a new team member:**
```bash
node cli-user-management.mjs create john@yodelmobile.com John Smith ASO_MANAGER
```

**List everyone in the org:**
```bash
node cli-user-management.mjs list
```

**Check someone's details:**
```bash
node cli-user-management.mjs get john@yodelmobile.com
```

**Remove a test user:**
```bash
node cli-user-management.mjs delete test.user@example.com
```

---

## 📊 CURRENT USERS IN YODEL MOBILE

Based on the test results, you have 6 users:

1. **igor@yodelmobile.com** - Igor Yodel (ORG_ADMIN, SUPER_ADMIN)
2. **kasia@yodelmobile.com** - Kasia Yodel (ORG_ADMIN)
3. **igorblnv@gmail.com** - Igor Blinov (ORG_ADMIN)
4. **cli@yodelmobile.com** - CLI Admin (ORG_ADMIN)
5. **test.1764099163323@example.com** - Test user (VIEWER) ← Can be deleted
6. Plus any you create!

---

## 🔧 TECHNICAL DETAILS

### What Happens When You Create a User

1. ✅ **Auth User Created** - User added to `auth.users` table
2. ✅ **Profile Auto-Created** - Database trigger creates profile with `org_id`
3. ✅ **Role Assigned** - User gets role in `user_roles` table
4. ✅ **Verification** - System confirms everything is correct

### The Fix That Made This Work

**Before:**
- Trigger tried to insert `organization_id` (nullable)
- Database expected `org_id` (NOT NULL)
- Result: User creation failed ❌

**After:**
- Trigger inserts `org_id` (NOT NULL)
- Database is happy ✅
- Result: User creation works! 🎉

### Database Schema (profiles table)
```sql
id               UUID      PRIMARY KEY
email            TEXT      NOT NULL
first_name       TEXT
last_name        TEXT
org_id           UUID      NOT NULL  ← Active column
organization_id  UUID      NULLABLE  ← Legacy column
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

---

## 🚀 NEXT STEPS

### Backend is Working! ✅

Now you can:

1. **Create Real Users** via CLI:
   ```bash
   node cli-user-management.mjs create newuser@yodelmobile.com First Last VIEWER
   ```

2. **Test the Admin Panel** (Frontend):
   - Open: http://localhost:8080
   - Login: igor@yodelmobile.com
   - Go to: Admin Panel → User Management
   - Click: "Create User"
   - Fill in the form
   - It should work now!

3. **Use this CLI for User Management**:
   - Perfect for bulk user creation
   - Great for testing
   - Useful for admin tasks
   - Can be integrated into scripts

---

## 💡 BEST PRACTICES

### For Production Use

1. **Always verify org_id** after creation
2. **Use strong passwords** (the CLI generates temp passwords)
3. **Ask users to change password** on first login
4. **Assign appropriate roles** (principle of least privilege)
5. **Keep audit logs** (already handled by the system)

### For Testing

1. **Use test email addresses** (test.*@example.com)
2. **Clean up test users** after testing
3. **Run full flow test** before making changes
4. **Verify in both CLI and admin panel**

---

## 🐛 TROUBLESHOOTING

### If User Creation Fails

**Check the database trigger:**
```bash
# Run the full flow test
node cli-user-management.mjs test-full-flow
```

If TEST 4 fails, the trigger is not setting `org_id` correctly.

### If org_id is NULL

The trigger might not be deployed. Re-run:
```bash
supabase db push --include-all
```

### If Role Assignment Fails

Check if the organization ID is correct:
```bash
node cli-user-management.mjs list
```

---

## 📝 WRAPPER SCRIPT (Optional)

Create a simple wrapper for easier use:

```bash
# Save as: create-user.sh
#!/bin/bash
export SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d"=" -f2)
node cli-user-management.mjs "$@"
```

Then use:
```bash
chmod +x create-user.sh
./create-user.sh create john@example.com John Doe VIEWER
./create-user.sh list
```

---

## ✅ VERIFICATION CHECKLIST

- [x] CLI tool created
- [x] All 6 tests pass
- [x] Users can be created
- [x] org_id is set correctly
- [x] Roles are assigned
- [x] Users can be listed
- [x] Users can be deleted
- [ ] **Frontend test** (you need to test this)

---

## 🎉 CONCLUSION

**The backend user management system is FULLY WORKING!**

- ✅ CLI tool ready for production use
- ✅ Database trigger fixed
- ✅ org_id populated correctly
- ✅ All tests passing
- ✅ Ready for frontend testing

**Go ahead and test the admin panel now!**

Open http://localhost:8080 and try creating a user through the UI.
It should work just like the CLI does! 🚀
