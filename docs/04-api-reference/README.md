---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: API reference section overview
Audience: Developers, API Consumers
---

# API Reference Documentation

API contracts, RLS policies, and data access patterns for Yodel ASO Insight.

## Overview

This section documents the API contracts and database access patterns for the platform.

## Contents

### Core API Contracts

- **[USER_ORGANIZATION_CONTRACT.md](./USER_ORGANIZATION_CONTRACT.md)** - User-organization relationship API
  - User profile access
  - Organization membership
  - Role and permission queries

- **[whoami_contract.md](./whoami_contract.md)** - Current user information API
  - User identity endpoint
  - Permission discovery
  - Session information

### Authorization & Permissions

- **[feature-permissions.md](./feature-permissions.md)** - Feature-based permission system
  - Permission definitions
  - Permission checking patterns
  - Feature gating implementation

### Database Policies

- **[db_rls_report.md](./db_rls_report.md)** - Row-Level Security (RLS) policy report
  - Active RLS policies
  - Policy logic and rules
  - Security enforcement patterns

## Quick Start

**For API Integration:**
1. Read [USER_ORGANIZATION_CONTRACT.md](./USER_ORGANIZATION_CONTRACT.md) for user data access
2. See [whoami_contract.md](./whoami_contract.md) for authentication
3. Check [feature-permissions.md](./feature-permissions.md) for authorization

**For Security Auditing:**
1. Review [db_rls_report.md](./db_rls_report.md) for RLS policies
2. See [feature-permissions.md](./feature-permissions.md) for feature access control

## Authorization Model

The platform uses a three-layer authorization model:

1. **Database Layer:** RLS policies (see [db_rls_report.md](./db_rls_report.md))
2. **API Layer:** Edge Function authorization
3. **Frontend Layer:** `usePermissions()` hook (see [feature-permissions.md](./feature-permissions.md))

**See:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md) for complete architecture

## Related Documentation

- **Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)
- **Organization Roles:** [ORGANIZATION_ROLES_SYSTEM.md](../02-architecture/system-design/ORGANIZATION_ROLES_SYSTEM.md)
- **Workflows:** [USER_MANAGEMENT_GUIDE.md](../05-workflows/USER_MANAGEMENT_GUIDE.md)

## Target Audience

- **Developers** - API integration, frontend development
- **Security Engineers** - Security policy auditing
- **AI Agents** - API contract reference for code generation
