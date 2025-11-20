---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: User management guide using SQL helper functions (619 lines)
Canonical: true
Accuracy: 8/10 (Comprehensive guide, minor MFA/audit additions needed)
See Also: docs/02-architecture/ARCHITECTURE_V1.md, ORGANIZATION_ROLES_SYSTEM.md
Audience: Administrators, Developers
---

# User Management Guide - Phase 1 (SQL Functions)

---

## Overview

This guide explains how to create and manage users in the Yodel ASO Insight platform using secure SQL helper functions. This is Phase 1 of the enterprise user management system.

**Phase 1 (Current):** SQL helper functions for secure user creation
**Phase 2 (Planned):** Full admin UI with invitation system

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [User Creation Process](#user-creation-process)
3. [Role Definitions](#role-definitions)
4. [SQL Function Reference](#sql-function-reference)
5. [Common Use Cases](#common-use-cases)
6. [Troubleshooting](#troubleshooting)
7. [Security & Audit](#security--audit)

---

## Quick Start

### Creating a New ORG_ADMIN User

```sql
-- Step 1: User must first sign up via /auth/sign-up
-- (They create their account with email/password)

-- Step 2: Assign their role using this function
SELECT assign_user_role(
  'user-uuid-from-auth-users',           -- Get from auth.users table
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', -- Yodel Mobile org ID
  'ORG_ADMIN'                             -- Role
);
```

### Creating a New Regular Org User

```sql
-- Same process, just use a different role
SELECT assign_user_role(
  'user-uuid',
  'org-uuid',
  'VIEWER'  -- or ASO_MANAGER, ANALYST, CLIENT
);
```

---

## User Creation Process

### Full Workflow

```
┌─────────────────────────────────────────────────────┐
│ STEP 1: User Signs Up                              │
│ - User goes to /auth/sign-up                       │
│ - Enters email + password                          │
│ - Supabase creates entry in auth.users             │
│ - User receives verification email                 │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STEP 2: Admin Assigns Role (You do this)          │
│ - Run SQL function: assign_user_role()             │
│ - This creates entry in user_roles table           │
│ - User gains access to their organization          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STEP 3: User Logs In                               │
│ - User logs in with email/password                 │
│ - System loads their permissions                   │
│ - User sees appropriate pages based on role        │
└─────────────────────────────────────────────────────┘
```

### Why Two Steps?

**Security:** Supabase Auth handles user account creation (password hashing, email verification, etc.). We then assign organizational roles separately.

**Flexibility:** Users can exist in multiple organizations with different roles.

---

## Role Definitions

### SUPER_ADMIN (Platform Level)
- **Access:** Full platform access, all organizations
- **Use Case:** Developer testing, platform administration
- **Pages:** All pages including admin panel, organization management, feature management
- **⚠️ Cannot be created via SQL functions** (security measure)

### ORG_ADMIN (Organization Level)
- **Access:** Default org pages + user management for their org
- **Use Case:** Organization administrators who need to manage users
- **Pages:**
  - Performance Dashboard
  - Keyword Intelligence
  - Reviews & Theme Analysis
  - Profile
  - **+ /admin/users** (user management panel)

### ASO_MANAGER, ANALYST, VIEWER, CLIENT
- **Access:** Default org pages only
- **Use Case:** Regular organization members
- **Pages:**
  - Performance Dashboard
  - Keyword Intelligence
  - Reviews & Theme Analysis
  - Profile

### Visual Hierarchy

```
SUPER_ADMIN (Platform)
   └─ Full access to everything
   └─ Can manage all organizations

ORG_ADMIN (Organization)
   └─ Default org pages
   └─ Can manage users in their org
   └─ Cannot see other orgs

ASO_MANAGER, ANALYST, VIEWER, CLIENT
   └─ Default org pages only
   └─ No admin access
```

---

## SQL Function Reference

### 1. assign_user_role()

**Purpose:** Assign or update a user's role in an organization

**Signature:**
```sql
SELECT assign_user_role(
  p_user_id UUID,           -- User ID from auth.users
  p_organization_id UUID,   -- Organization ID
  p_role TEXT               -- Role: ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER, CLIENT
) RETURNS JSONB;
```

**Returns:**
```json
{
  "success": true,
  "message": "User role assigned",
  "user_id": "uuid",
  "organization_id": "uuid",
  "role": "ORG_ADMIN",
  "action": "created"  // or "updated"
}
```

**Examples:**

```sql
-- Create new role assignment
SELECT assign_user_role(
  '8920ac57-63da-4f8e-9970-719be1e2569c',
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  'ORG_ADMIN'
);

-- Update existing role
SELECT assign_user_role(
  '8920ac57-63da-4f8e-9970-719be1e2569c',
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  'VIEWER'  -- Demote from ORG_ADMIN to VIEWER
);
```

---

### 2. get_org_users()

**Purpose:** List all users in an organization

**Signature:**
```sql
SELECT * FROM get_org_users(p_organization_id UUID);
```

**Returns Table:**
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | User's unique ID |
| email | TEXT | User's email address |
| role | TEXT | User's role in this org |
| created_at | TIMESTAMPTZ | When role was assigned |
| last_sign_in_at | TIMESTAMPTZ | Last login time |

**Example:**

```sql
-- List all users in Yodel Mobile org
SELECT * FROM get_org_users('7cccba3f-0a8f-446f-9dba-86e9cb68c92b');
```

**Output:**
```
user_id                               | email                  | role      | created_at | last_sign_in_at
--------------------------------------|------------------------|-----------|------------|------------------
8920ac57-63da-4f8e-9970-719be1e2569c | cli@yodelmobile.com    | ORG_ADMIN | 2025-11-01 | 2025-11-12
9487fa9d-f0cc-427c-900b-98871c19498a | igor@yodelmobile.com   | ORG_ADMIN | 2025-10-15 | 2025-11-11
```

---

### 3. remove_user_from_org()

**Purpose:** Remove a user from an organization (revoke access)

**Signature:**
```sql
SELECT remove_user_from_org(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS JSONB;
```

**Returns:**
```json
{
  "success": true,
  "message": "User removed from organization",
  "user_id": "uuid",
  "organization_id": "uuid"
}
```

**Example:**

```sql
-- Remove user access
SELECT remove_user_from_org(
  '8920ac57-63da-4f8e-9970-719be1e2569c',
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
);
```

**⚠️ Note:** This only removes the user from the organization, it does NOT delete their account from auth.users.

---

### 4. create_org_user_secure() [Alternative Method]

**Purpose:** Create user by email (if they already signed up)

**Signature:**
```sql
SELECT create_org_user_secure(
  p_email TEXT,
  p_organization_id UUID,
  p_role TEXT DEFAULT 'ORG_USER'
) RETURNS JSONB;
```

**⚠️ Important:** This function requires the user to already exist in `auth.users`. If they don't, it returns instructions to sign up first.

**Example:**

```sql
SELECT create_org_user_secure(
  'newuser@example.com',
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
  'ORG_ADMIN'
);
```

---

## Common Use Cases

### Use Case 1: Add New ORG_ADMIN to Yodel Mobile

```sql
-- Step 1: Have user sign up at /auth/sign-up
-- Step 2: Get their user_id from auth.users
SELECT id, email FROM auth.users WHERE email = 'newadmin@yodelmobile.com';

-- Step 3: Assign ORG_ADMIN role
SELECT assign_user_role(
  'user-id-from-step-2',
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', -- Yodel Mobile
  'ORG_ADMIN'
);

-- Step 4: Verify
SELECT * FROM get_org_users('7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
WHERE email = 'newadmin@yodelmobile.com';
```

---

### Use Case 2: Add Regular User to Different Org

```sql
-- Get org UUID first
SELECT id, name FROM organizations WHERE name LIKE '%Client Name%';

-- Assign role
SELECT assign_user_role(
  'user-uuid',
  'client-org-uuid',
  'VIEWER'
);
```

---

### Use Case 3: Promote User from VIEWER to ORG_ADMIN

```sql
-- Simply call assign_user_role with new role
-- It will UPDATE the existing role
SELECT assign_user_role(
  'user-uuid',
  'org-uuid',
  'ORG_ADMIN'  -- Promotes to ORG_ADMIN
);
```

---

### Use Case 4: Bulk Import Users

```sql
-- Create a temporary table with user data
CREATE TEMP TABLE new_users (
  email TEXT,
  role TEXT
);

INSERT INTO new_users (email, role) VALUES
  ('user1@example.com', 'VIEWER'),
  ('user2@example.com', 'ASO_MANAGER'),
  ('user3@example.com', 'ORG_ADMIN');

-- Assign roles for all users
-- (Assumes they've already signed up)
SELECT nu.email,
       assign_user_role(u.id, '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', nu.role)
FROM new_users nu
JOIN auth.users u ON u.email = nu.email;
```

---

## Troubleshooting

### Error: "User does not exist in auth.users"

**Problem:** You're trying to assign a role to someone who hasn't signed up yet.

**Solution:**
1. Have the user go to `/auth/sign-up` and create an account
2. Wait for them to verify their email
3. Then run `assign_user_role()`

---

### Error: "Organization does not exist"

**Problem:** The organization UUID is incorrect or doesn't exist.

**Solution:**
```sql
-- List all organizations
SELECT id, name, slug FROM organizations ORDER BY name;

-- Use the correct UUID from the output
```

---

### Error: "Invalid role"

**Problem:** Role name is misspelled or not valid.

**Solution:** Valid roles are:
- `SUPER_ADMIN` (⚠️ cannot be created via functions)
- `ORG_ADMIN`
- `ASO_MANAGER`
- `ANALYST`
- `VIEWER`
- `CLIENT`

**⚠️ Case sensitive!** Use uppercase.

---

### User Can't See Expected Pages

**Problem:** User logs in but doesn't see the pages they should.

**Debug Steps:**

```sql
-- 1. Check their role
SELECT * FROM user_roles WHERE user_id = 'user-uuid';

-- 2. Check permissions view
SELECT * FROM user_permissions_unified WHERE user_id = 'user-uuid';

-- 3. Verify organization
SELECT o.name, ur.role
FROM user_roles ur
JOIN organizations o ON o.id = ur.organization_id
WHERE ur.user_id = 'user-uuid';
```

**Common Issues:**
- User has wrong role (fix: use `assign_user_role()` to update)
- User not assigned to any org (fix: use `assign_user_role()` to add)
- Browser cache (fix: hard refresh or incognito mode)

---

## Security & Audit

### Audit Logging

All user management actions are automatically logged in the `user_management_audit` table.

**View Recent Actions:**

```sql
-- Last 10 user management actions
SELECT
  action,
  target_user_id,
  performed_by,
  old_role,
  new_role,
  created_at
FROM user_management_audit
ORDER BY created_at DESC
LIMIT 10;
```

**View Actions for Specific User:**

```sql
SELECT * FROM user_management_audit
WHERE target_user_id = 'user-uuid'
ORDER BY created_at DESC;
```

**View Actions by Admin:**

```sql
SELECT
  uma.action,
  u.email AS target_email,
  uma.old_role,
  uma.new_role,
  uma.created_at
FROM user_management_audit uma
JOIN auth.users u ON u.id = uma.target_user_id
WHERE uma.performed_by = 'admin-user-uuid'
ORDER BY uma.created_at DESC;
```

---

### MFA Enforcement

**Status:** PRODUCTION (Required for admin users)
**Grace Period:** 30 days
**Authentication Method:** TOTP (Time-based One-Time Password)

#### MFA Requirement by Role

| Role | MFA Required | Grace Period | Enforcement |
|------|--------------|--------------|-------------|
| `SUPER_ADMIN` | ✅ Required | 30 days | Hard block after grace |
| `ORG_ADMIN` | ✅ Required | 30 days | Hard block after grace |
| `ASO_MANAGER` | ❌ Optional | N/A | Not enforced |
| `ANALYST` | ❌ Optional | N/A | Not enforced |
| `VIEWER` | ❌ Optional | N/A | Not enforced |
| `CLIENT` | ❌ Optional | N/A | Not enforced |

#### Automatic MFA Tracking

When you assign an admin role (`SUPER_ADMIN` or `ORG_ADMIN`), the system **automatically**:

1. Creates entry in `mfa_enforcement` table
2. Sets `grace_period_ends_at` to 30 days from now
3. Sets `mfa_required = true`
4. Sends MFA setup reminder email

**Example:**
```sql
-- Assign ORG_ADMIN role (MFA tracking created automatically)
SELECT assign_user_role(
  'user-uuid',
  'org-uuid',
  'ORG_ADMIN'
);

-- Check MFA status
SELECT
  u.email,
  me.role,
  me.grace_period_ends_at,
  me.mfa_enabled_at,
  CASE
    WHEN me.mfa_enabled_at IS NOT NULL THEN '✅ MFA Enabled'
    WHEN me.grace_period_ends_at > NOW() THEN '⏳ Grace Period Active'
    WHEN me.grace_period_ends_at <= NOW() THEN '🚫 Grace Period Expired - Access Blocked'
    ELSE '❓ Unknown'
  END as mfa_status,
  GREATEST(0, EXTRACT(DAY FROM (me.grace_period_ends_at - NOW())))::integer as days_remaining
FROM mfa_enforcement me
JOIN auth.users u ON u.id = me.user_id
WHERE me.user_id = 'user-uuid';
```

#### MFA Setup Workflow

```
┌─────────────────────────────────────────────────────┐
│ STEP 1: Admin Role Assigned                        │
│ - Admin runs: assign_user_role(user, org, ADMIN)   │
│ - System creates mfa_enforcement record            │
│ - Grace period: 30 days from now                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STEP 2: User Logs In (First Time)                  │
│ - User sees "MFA Required" banner                  │
│ - "Set up MFA now" or "Remind me later" options    │
│ - Grace period countdown displayed                 │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STEP 3A: User Sets Up MFA (Recommended)            │
│ - User clicks "Set up MFA"                         │
│ - Scans QR code with authenticator app             │
│ - Enters 6-digit code to verify                    │
│ - Downloads backup codes                           │
│ - mfa_enabled_at = NOW()                           │
│ - grace_period_ends_at = NULL                      │
│ - ✅ MFA active, full access granted               │
└─────────────────────────────────────────────────────┘
                  OR
┌─────────────────────────────────────────────────────┐
│ STEP 3B: User Delays Setup                         │
│ - User clicks "Remind me later"                    │
│ - Reminders sent every 7 days                      │
│ - Grace period countdown continues                 │
│ - After 30 days → Access blocked until MFA setup   │
└─────────────────────────────────────────────────────┘
```

#### Check MFA Status for All Admin Users

```sql
-- Get all admin users and their MFA status
SELECT
  u.email,
  ur.role,
  me.grace_period_ends_at,
  me.mfa_enabled_at,
  me.last_reminded_at,
  CASE
    WHEN me.mfa_enabled_at IS NOT NULL THEN '✅ Enabled'
    WHEN me.grace_period_ends_at > NOW() THEN
      '⏳ Grace Period (' ||
      GREATEST(0, EXTRACT(DAY FROM (me.grace_period_ends_at - NOW())))::integer ||
      ' days left)'
    ELSE '🚫 Expired - Blocked'
  END as mfa_status
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN mfa_enforcement me ON me.user_id = ur.user_id
WHERE ur.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
ORDER BY
  CASE
    WHEN me.mfa_enabled_at IS NOT NULL THEN 3
    WHEN me.grace_period_ends_at > NOW() THEN 2
    ELSE 1
  END,
  me.grace_period_ends_at ASC;
```

#### Manually Update MFA Status

**Mark MFA as Enabled (if user completed setup):**
```sql
UPDATE mfa_enforcement
SET mfa_enabled_at = NOW(),
    grace_period_ends_at = NULL,
    updated_at = NOW()
WHERE user_id = 'user-uuid';
```

**Extend Grace Period (emergency only):**
```sql
-- Add 7 more days to grace period
UPDATE mfa_enforcement
SET grace_period_ends_at = grace_period_ends_at + INTERVAL '7 days',
    updated_at = NOW()
WHERE user_id = 'user-uuid';
```

**Send Reminder Manually:**
```sql
UPDATE mfa_enforcement
SET last_reminded_at = NOW(),
    updated_at = NOW()
WHERE user_id = 'user-uuid';
```

#### MFA Enforcement Audit Logs

All MFA-related events are logged to `audit_logs`:

```sql
-- View MFA setup events
SELECT
  user_email,
  action,
  status,
  created_at
FROM audit_logs
WHERE action IN ('mfa_enabled', 'mfa_verified', 'mfa_setup_started')
ORDER BY created_at DESC
LIMIT 50;

-- Users who haven't set up MFA yet
SELECT
  u.email,
  me.grace_period_ends_at,
  GREATEST(0, EXTRACT(DAY FROM (me.grace_period_ends_at - NOW())))::integer as days_remaining
FROM mfa_enforcement me
JOIN auth.users u ON u.id = me.user_id
WHERE me.mfa_enabled_at IS NULL
  AND me.grace_period_ends_at > NOW()
ORDER BY days_remaining ASC;
```

#### MFA Best Practices

✅ **DO:**
- Set up MFA immediately after becoming an admin
- Use Google Authenticator, Authy, or 1Password for TOTP
- Download and securely store backup codes
- Test MFA login before your grace period expires
- Keep your authenticator app synced with correct time

❌ **DON'T:**
- Share your MFA codes or backup codes
- Screenshot QR codes and save to cloud storage
- Use SMS-based 2FA (not supported, TOTP only)
- Ignore grace period reminders
- Delete your authenticator app without disabling MFA first

#### Troubleshooting MFA

**User says they can't log in after grace period:**
```sql
-- Check their MFA status
SELECT
  u.email,
  me.mfa_enabled_at,
  me.grace_period_ends_at
FROM mfa_enforcement me
JOIN auth.users u ON u.id = me.user_id
WHERE u.email = 'user@example.com';

-- If grace period expired but they should have access:
-- Option 1: Extend grace period (emergency only)
UPDATE mfa_enforcement
SET grace_period_ends_at = NOW() + INTERVAL '7 days'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Option 2: Mark MFA as enabled (if they already set it up)
UPDATE mfa_enforcement
SET mfa_enabled_at = NOW(),
    grace_period_ends_at = NULL
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

**User lost access to authenticator app:**
1. User should use backup codes to log in
2. User disables MFA in profile settings
3. User sets up MFA again with new device
4. New backup codes generated

**Admin needs to bypass MFA (emergency):**
```sql
-- ⚠️ EMERGENCY ONLY: Reset MFA requirement
-- This should be logged and reported to security team
UPDATE mfa_enforcement
SET mfa_enabled_at = NOW(),  -- Mark as "enabled" to bypass check
    grace_period_ends_at = NULL,
    updated_at = NOW()
WHERE user_id = 'user-uuid';

-- Log the bypass action
INSERT INTO audit_logs (user_id, organization_id, user_email, action, details, status)
VALUES (
  'admin-user-uuid',
  NULL,
  'admin@example.com',
  'mfa_bypass_emergency',
  jsonb_build_object('target_user', 'user-uuid', 'reason', 'Lost authenticator device'),
  'success'
);
```

---

### Security Features

✅ **Email validation** - Invalid emails rejected
✅ **Organization validation** - Non-existent orgs rejected
✅ **Role validation** - Only valid roles accepted
✅ **Duplicate prevention** - Cannot create duplicate roles
✅ **SUPER_ADMIN protection** - Cannot create SUPER_ADMIN via functions
✅ **Automatic audit trails** - All actions logged
✅ **Trigger-based logging** - Cannot bypass audit logs
✅ **MFA enforcement** - Admin users require MFA (30-day grace period)
✅ **Session security** - 15-minute idle timeout, 8-hour absolute timeout

---

## Common Workflows

### Workflow 1: Onboard New Client Organization

```sql
-- 1. Create organization
INSERT INTO organizations (id, name, slug, tier, created_at)
VALUES (
  uuid_generate_v4(),
  'New Client Company',
  'new-client',
  'enterprise',
  NOW()
)
RETURNING id;  -- Save this UUID

-- 2. Have client admin sign up at /auth/sign-up

-- 3. Assign ORG_ADMIN role
SELECT assign_user_role(
  'client-admin-user-uuid',
  'new-client-org-uuid',
  'ORG_ADMIN'
);

-- 4. Client admin can now log in and manage their own users
```

---

### Workflow 2: Grant Temporary Access

```sql
-- 1. Assign role as normal
SELECT assign_user_role('temp-user-uuid', 'org-uuid', 'VIEWER');

-- 2. Set reminder to revoke access (manual process for now)
-- TODO: Phase 2 will support expires_at column

-- 3. Revoke when done
SELECT remove_user_from_org('temp-user-uuid', 'org-uuid');
```

---

### Workflow 3: Transfer User Between Organizations

```sql
-- User can have roles in multiple orgs simultaneously
-- Just add them to the new org

SELECT assign_user_role(
  'user-uuid',
  'new-org-uuid',
  'VIEWER'
);

-- If you want to MOVE them (not copy), remove from old org:
SELECT remove_user_from_org('user-uuid', 'old-org-uuid');
```

---

## What's Next (Phase 2)

Phase 2 will add a full admin UI including:

✅ User invitation system (send email invitations)
✅ Visual user management (no SQL needed)
✅ Role assignment dropdown
✅ Bulk user operations
✅ User activity dashboard
✅ Time-based access (expires_at)
✅ Usage limits and quotas

**Timeline:** 4 weeks after approval

---

## Quick Reference

### Most Common Commands

```sql
-- List all users in an org
SELECT * FROM get_org_users('org-uuid');

-- Add new user
SELECT assign_user_role('user-uuid', 'org-uuid', 'ROLE_NAME');

-- Update user role
SELECT assign_user_role('user-uuid', 'org-uuid', 'NEW_ROLE');

-- Remove user
SELECT remove_user_from_org('user-uuid', 'org-uuid');

-- View audit log
SELECT * FROM user_management_audit ORDER BY created_at DESC LIMIT 20;
```

### Available Roles
- `SUPER_ADMIN` - Full platform access (cannot create via functions)
- `ORG_ADMIN` - Org pages + user management
- `ASO_MANAGER` - Org pages only
- `ANALYST` - Org pages only
- `VIEWER` - Org pages only
- `CLIENT` - Org pages only

### Default Org Pages
- Performance Dashboard (`/dashboard-v2`)
- Keyword Intelligence (`/growth-accelerators/keywords`)
- Reviews (`/growth-accelerators/reviews`)
- Theme Analysis (`/growth-accelerators/theme-impact`)
- Profile (`/profile`)

---

**Questions or Issues?**
- Check the audit log: `SELECT * FROM user_management_audit;`
- Verify permissions: `SELECT * FROM user_permissions_unified WHERE user_id = 'uuid';`
- Contact platform administrator for SUPER_ADMIN role assignments

---

**Document Version:** 1.0 - Phase 1
**Last Updated:** November 12, 2025
**Next Update:** After Phase 2 implementation
