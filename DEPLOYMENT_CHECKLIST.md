# Deployment Checklist

> **📍 This document has been superseded**
>
> For current deployment procedures, see:
> - **[docs/05-workflows/DEPLOYMENT.md](./docs/05-workflows/DEPLOYMENT.md)** - Complete deployment guide with security configuration
>
> **Historical deployment checklists:**
> - [docs/deprecated/DEPLOYMENT_CHECKLIST_NOV2025.md](./docs/deprecated/DEPLOYMENT_CHECKLIST_NOV2025.md) - November 2025 Phase 2 deployment

---

## Quick Deployment Steps

For a quick overview, see [DEPLOYMENT.md](./docs/05-workflows/DEPLOYMENT.md):

1. **Pre-Deployment:**
   - Review security checklist (MFA, session security, audit logging, RLS)
   - Backup database
   - Test migrations in staging

2. **Deployment:**
   - Run database migrations
   - Deploy Edge Functions
   - Deploy frontend build
   - Verify environment variables

3. **Post-Deployment:**
   - Verify security features (MFA, session timeouts, audit logs)
   - Test critical workflows (login, dashboard, data access)
   - Monitor for errors

**For detailed instructions, always refer to [docs/05-workflows/DEPLOYMENT.md](./docs/05-workflows/DEPLOYMENT.md)**
