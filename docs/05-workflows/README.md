---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Workflows section overview
Audience: Developers, Operations, Product Managers
---

# Workflows Documentation

Operational workflows, deployment procedures, and user management guides for Yodel ASO Insight.

## Overview

This section documents the operational workflows and procedures for running and maintaining the platform.

## Contents

### Deployment

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment procedures
  - Deployment checklist
  - Environment configuration
  - Post-deployment verification

### User Management

- **[USER_MANAGEMENT_GUIDE.md](./USER_MANAGEMENT_GUIDE.md)** - User management workflows
  - Adding new users
  - Managing roles and permissions
  - User lifecycle management
  - Organization membership

### Navigation & Feature Access

- **[navigation-feature-gating.md](./navigation-feature-gating.md)** - Navigation and feature gating
  - Navigation menu structure
  - Feature flag implementation
  - Permission-based visibility

### Context & Setup

- **[YODEL_MOBILE_CONTEXT.md](./YODEL_MOBILE_CONTEXT.md)** - Yodel Mobile context documentation
  - Organization setup
  - Client configuration
  - Agency relationships

## Quick Start

**For Deployment:**
1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment checklist

**For User Management:**
1. Read [USER_MANAGEMENT_GUIDE.md](./USER_MANAGEMENT_GUIDE.md) for user workflows
2. See [ORGANIZATION_ROLES_SYSTEM.md](../02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md) for role definitions

**For Feature Access Control:**
1. Read [navigation-feature-gating.md](./navigation-feature-gating.md)
2. See [feature-permissions.md](../04-api-reference/feature-permissions.md) for permission system

## Common Workflows

**Adding a New User:**
1. Create user in Supabase Auth
2. Add entry to `user_roles` table
3. Configure organization membership
4. Verify permissions with `user_permissions_unified` view

**Deploying to Production:**
1. Run pre-deployment checks
2. Execute database migrations (if any)
3. Deploy application
4. Run post-deployment verification

**See:** [USER_MANAGEMENT_GUIDE.md](./USER_MANAGEMENT_GUIDE.md) and [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed steps

## Related Documentation

- **Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
- **Organization Roles:** [ORGANIZATION_ROLES_SYSTEM.md](../02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md)
- **API Reference:** [docs/04-api-reference/](../04-api-reference/)

## Target Audience

- **Developers** - Implementation and deployment
- **Operations** - User management, deployment procedures
- **Product Managers** - Feature access configuration
