---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Super Admin feature documentation overview
Audience: Developers, Super Admins
---

# Super Admin Documentation

Super admin features for platform administration (PRODUCTION).

## Overview

Super admin features provide platform-level administration capabilities for Yodel ASO Insight.

**Status:** ✅ PRODUCTION
**Access:** Super admin role only (`SUPER_ADMIN` in `user_roles` table)
**Features:**
- Organization selection and switching
- User management across all organizations
- System-wide configuration
- Audit log access

## Documentation

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Super admin quick reference
  - Feature overview
  - Permission requirements
  - Component structure

## Key Capabilities

**Organization Management:**
- Select any organization for context switching
- View all organizations in system
- Access organization-specific data

**User Management:**
- View users across all organizations
- Manage user roles and permissions
- Reset user credentials

**System Administration:**
- View system-wide audit logs
- Monitor platform health
- Configure global settings

## Security Requirements

**Authentication:**
- Must have `SUPER_ADMIN` role in `user_roles` table
- MFA required (30-day grace period for new admins)
- Session timeout: 15 minutes idle, 8 hours absolute

**Authorization:**
- Organization selection required before accessing data
- All actions logged in audit log
- Cannot bypass RLS policies (operates within normal authorization)

**See:** [ARCHITECTURE_V1.md](../../02-architecture/ARCHITECTURE_V1.md) for complete authorization model

## Related Documentation

- **Architecture:** [ARCHITECTURE_V1.md](../../02-architecture/ARCHITECTURE_V1.md)
- **Authorization:** [ORGANIZATION_ROLES_SYSTEM.md](../../02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md)
- **Workflows:** [USER_MANAGEMENT_GUIDE.md](../../05-workflows/USER_MANAGEMENT_GUIDE.md)

## Target Audience

- **Super Admins** - Platform administration
- **Developers** - Implementation details
- **Security Auditors** - Access control verification
