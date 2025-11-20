---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Database documentation overview
Audience: Developers, Database Administrators, AI Agents
---

# Database Documentation

Complete PostgreSQL database schema documentation for Yodel ASO Insight.

## Quick Links

- **[Schema Reference](./schema-reference.md)** - Complete table schemas, indexes, and RLS policies
- **[ERD Diagrams](./erd-diagrams.md)** - Entity-Relationship Diagrams (Mermaid)
- **[Migrations](./migrations.md)** - Migration history and best practices

## Database Overview

**Platform:** PostgreSQL 15+ on Supabase
**Security:** Row-Level Security (RLS) enabled on all tenant-scoped tables
**Compliance:** SOC 2, ISO 27001, GDPR

### Core Tables

| Table | Purpose | Status | RLS |
|-------|---------|--------|-----|
| `organizations` | Multi-tenant registry | PRODUCTION | ✅ |
| `user_roles` | Authorization SSOT | PRODUCTION | ✅ |
| `org_app_access` | App scoping | PRODUCTION | ✅ |
| `agency_clients` | Agency relationships | PRODUCTION | ✅ |
| `audit_logs` | Compliance audit trail | PRODUCTION | ✅ |
| `mfa_enforcement` | MFA tracking | PRODUCTION | ✅ |
| `encryption_keys` | Key management | INFRASTRUCTURE | ✅ |

### Database Architecture Principles

**Multi-Tenancy:**
- Organization-based tenant isolation
- RLS policies enforce data boundaries
- Agency model for cross-tenant access

**Authorization:**
- `user_roles` table is Single Source of Truth (SSOT)
- `user_permissions_unified` view for efficient queries
- Role hierarchy: SUPER_ADMIN → ORG_ADMIN → ASO_MANAGER → ANALYST → VIEWER → CLIENT

**Security:**
- All tables have RLS enabled
- Super admin escape hatch via `sec.is_super_admin()`
- Audit logging for compliance (7-year retention)

**Data Access:**
- BigQuery app IDs mapped via `org_app_access`
- Agency relationships via `agency_clients`
- Cross-tenant queries supported for agencies

## Quick Start

### View Complete Schema
```bash
# See all table schemas, indexes, RLS policies
docs/02-architecture/database/schema-reference.md
```

### Understand Relationships
```bash
# Entity-Relationship Diagrams
docs/02-architecture/database/erd-diagrams.md
```

### Migration Guide
```bash
# Migration history and best practices
docs/02-architecture/database/migrations.md
```

## Common Database Operations

### Check User Permissions
```sql
-- Get all permissions for a user
SELECT * FROM user_permissions_unified
WHERE user_id = 'user-uuid';

-- Check organization access
SELECT can_access_organization('org-uuid');
```

### Query Accessible Apps
```sql
-- Get all apps accessible to current user
SELECT DISTINCT app_id
FROM org_app_access
WHERE organization_id IN (
  SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
)
AND detached_at IS NULL;
```

### Audit Log Query
```sql
-- Recent user activity
SELECT action, resource_type, status, created_at
FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 50;
```

## Database Security

**Row-Level Security (RLS):**
- Enabled on all production tables
- Tenant isolation via `organization_id`
- Super admin bypass via `sec.is_super_admin()`

**Access Control:**
- Users see only their organization's data
- Agency admins see client organization data
- Super admins see all data

**Audit Trail:**
- All critical actions logged to `audit_logs`
- 7-year retention for compliance
- Immutable logs (INSERT-only)

## Related Documentation

- **[ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md)** - V1 production architecture overview
- **[Authorization V1](../system-design/authorization-v1.md)** - Authorization system details
- **[Security Compliance](../security-compliance/)** - Security documentation

## Support

For database issues:
- **Schema Questions:** See [schema-reference.md](./schema-reference.md)
- **Relationship Questions:** See [erd-diagrams.md](./erd-diagrams.md)
- **Migration Questions:** See [migrations.md](./migrations.md)
- **General Architecture:** See [ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md)

---

**Next:** [Schema Reference](./schema-reference.md) → Complete table schemas
