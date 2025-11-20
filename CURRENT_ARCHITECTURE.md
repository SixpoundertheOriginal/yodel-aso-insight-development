# Current Architecture

> **📍 This document has been superseded**
>
> For the complete V1 production architecture, see:
> - **[docs/02-architecture/ARCHITECTURE_V1.md](./docs/02-architecture/ARCHITECTURE_V1.md)** - Canonical V1 architecture (RECOMMENDED)
>
> **Related Documentation:**
> - **[Authorization](./docs/02-architecture/system-design/authorization-v1.md)** - V1 authorization system
> - **[Database Schema](./docs/02-architecture/database/schema-reference.md)** - Complete database schema
> - **[Security](./docs/02-architecture/security-compliance/)** - Security compliance documentation

---

## Quick Architecture Overview

**For the complete architecture, see [ARCHITECTURE_V1.md](./docs/02-architecture/ARCHITECTURE_V1.md)**

### Technology Stack

**Frontend:**
- React 18.3 + TypeScript 5.6
- Vite 5.4 build tool
- shadcn/ui + Tailwind CSS
- TanStack Query + React Context

**Backend:**
- Supabase (PostgreSQL 15+, Auth, Edge Functions)
- BigQuery (analytics data warehouse)
- iTunes RSS (App Store reviews)

### Production Features

1. **Dashboard V2** (`/dashboard-v2`) - BigQuery analytics
2. **Reviews** (`/growth-accelerators/reviews`) - App Store reviews

### Security

- **MFA:** Required for admin users (30-day grace period)
- **Session:** 15-min idle timeout, 8-hour absolute timeout
- **Audit Logging:** 7-year retention (SOC 2, ISO 27001, GDPR)
- **RLS:** Row-level security on all tenant-scoped tables

### Authorization

- **Primary Method:** `usePermissions()` hook (src/hooks/usePermissions.ts)
- **Database View:** `user_permissions_unified`
- **Roles:** SUPER_ADMIN, ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER, CLIENT

**For complete details, see [ARCHITECTURE_V1.md](./docs/02-architecture/ARCHITECTURE_V1.md)**
