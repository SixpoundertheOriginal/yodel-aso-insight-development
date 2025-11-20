---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Deployment procedures for ASO Tool platform
⚠️ Note: Missing production-specific configuration - MEDIUM priority update
See Also: docs/02-architecture/ARCHITECTURE_V1.md
Audience: DevOps, Developers
---

# ASO Tool - Deployment Guide

## Overview
This guide covers deployment procedures for the ASO Tool platform across different environments.

## Prerequisites

### Development Tools
- Node.js 18+ with npm/yarn
- Git for version control
- Supabase CLI (optional for local development)
- Docker (optional for containerized deployment)

### Platform Accounts
- Supabase project with configured authentication
- BigQuery project (for full analytics functionality)
- Domain registration (for custom domain deployment)

## Environment Configuration

### Environment Variables
Create appropriate `.env` files for each environment:

#### Development (.env.local)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Analytics (Optional)
VITE_BIGQUERY_PROJECT_ID=your-bigquery-project

# External APIs (Optional)
VITE_SERP_API_BASE=http://localhost:8787
```

#### Production (.env.production)
```bash
# Production Supabase
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key

# Production Analytics
VITE_BIGQUERY_PROJECT_ID=your-prod-bigquery-project

# Production APIs
VITE_SERP_API_BASE=https://your-serp-api.com
```

## Database Setup

### Initial Migration
```bash
# Using Supabase CLI
supabase db reset

# Or manually apply migrations
supabase db push
```

### Seed Data (Optional)
```bash
# Run seed scripts for development data
npm run db:seed
```

### RLS Policy Verification
Ensure all Row-Level Security policies are properly configured:
```sql
-- Verify tenant isolation
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('users', 'organizations', 'aso_metrics');
```

## Build Process

### Development Build
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
# Clean install for production
npm ci

# Type checking
npm run typecheck

# Production build
npm run build

# Test production build locally
npm run preview
```

### Build Optimization
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image compression and lazy loading
- **Bundle Analysis**: Use `npm run build:analyze` for size inspection

## Deployment Options

### Option 1: Lovable Platform (Recommended)
1. **Automatic Deployment**:
   - Click "Publish" button in Lovable interface
   - Automatic build and deployment pipeline
   - Built-in CDN and SSL certificates

2. **Custom Domain**:
   - Navigate to Project → Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

### Option 2: Manual Deployment

#### Static Hosting (Netlify, Vercel, etc.)
```bash
# Build the application
npm run build

# Deploy dist/ folder to your hosting provider
# Configure redirects for SPA routing
```

#### Self-Hosted (Docker)
```dockerfile
# Multi-stage Docker build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

## Edge Functions Deployment

### Automatic Deployment
Edge functions are automatically deployed with the main application when using Lovable platform.

### Manual Deployment
```bash
# Deploy individual function
supabase functions deploy app-store-scraper

# Deploy all functions
supabase functions deploy
```

### Function Configuration
Ensure proper configuration in `supabase/config.toml`:
```toml
[functions.app-store-scraper]
verify_jwt = false  # For public endpoints

[functions.bigquery-aso-data]
verify_jwt = true   # For protected endpoints
```

## Security Configuration

### Multi-Factor Authentication (MFA)

**Status:** PRODUCTION (Required for admin users)
**Grace Period:** 30 days

#### MFA Enforcement Rules

| Role | MFA Required | Grace Period | Enforcement |
|------|--------------|--------------|-------------|
| `SUPER_ADMIN` | ✅ Required | 30 days | Hard block after grace |
| `ORG_ADMIN` | ✅ Required | 30 days | Hard block after grace |
| `ASO_MANAGER` | ❌ Optional | N/A | Not enforced |
| `ANALYST` | ❌ Optional | N/A | Not enforced |
| `VIEWER` | ❌ Optional | N/A | Not enforced |
| `CLIENT` | ❌ Optional | N/A | Not enforced |

#### MFA Setup During User Creation

```sql
-- When creating admin users, MFA tracking is automatically created
-- Grace period starts immediately
SELECT assign_user_role(
  'user-uuid',
  'org-uuid',
  'ORG_ADMIN'  -- MFA will be required for this role
);

-- Check MFA status
SELECT
  u.email,
  me.grace_period_ends_at,
  me.mfa_enabled_at,
  CASE
    WHEN me.mfa_enabled_at IS NOT NULL THEN 'Enabled'
    WHEN me.grace_period_ends_at > NOW() THEN 'Grace Period Active'
    ELSE 'Expired - Blocked'
  END as status
FROM mfa_enforcement me
JOIN auth.users u ON u.id = me.user_id
WHERE me.user_id = 'user-uuid';
```

#### Environment Variables for MFA

```bash
# .env.production
# MFA Configuration
VITE_MFA_GRACE_PERIOD_DAYS=30
VITE_MFA_ENFORCE_FOR_ADMINS=true
VITE_MFA_REMINDER_FREQUENCY_DAYS=7
```

#### MFA Verification Checklist

Post-deployment verification:
- [ ] Admin users see MFA setup prompt on first login
- [ ] Grace period countdown displayed in user profile
- [ ] MFA enforcement blocks access after grace period expires
- [ ] MFA setup wizard functional (TOTP-based)
- [ ] Backup codes generated and downloadable
- [ ] MFA status tracked in `mfa_enforcement` table

---

### Session Security

**Configuration:** SOC 2 Compliant

#### Session Timeout Settings

```bash
# .env.production
# Session Security Configuration
VITE_SESSION_IDLE_TIMEOUT_MINUTES=15    # 15-minute idle timeout
VITE_SESSION_ABSOLUTE_TIMEOUT_HOURS=8   # 8-hour absolute timeout
VITE_SESSION_EXTEND_ON_ACTIVITY=true    # Extend session on activity
```

#### Implementation

**Idle Timeout (15 minutes):**
- User activity resets idle timer
- Activity includes: clicks, navigation, API calls
- After 15 minutes of inactivity → session expires
- User redirected to login page

**Absolute Timeout (8 hours):**
- Regardless of activity, sessions expire after 8 hours
- Requires re-authentication
- Cannot be extended

**Session Extension:**
```typescript
// Frontend implementation
const SESSION_CONFIG = {
  idleTimeout: 15 * 60 * 1000,      // 15 minutes in ms
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours in ms
  extendOnActivity: true
};
```

#### Session Security Verification

- [ ] Idle timeout triggers after 15 minutes of inactivity
- [ ] Absolute timeout triggers after 8 hours
- [ ] Session extends on user activity (if enabled)
- [ ] Logout clears all session data
- [ ] Session timeout logged to `audit_logs`

---

### Audit Logging

**Status:** PRODUCTION (SOC 2, ISO 27001, GDPR compliant)
**Retention:** 7 years

#### Audit Logging Configuration

```bash
# .env.production
# Audit Logging Configuration
VITE_AUDIT_LOGGING_ENABLED=true
VITE_AUDIT_LOG_RETENTION_YEARS=7
VITE_AUDIT_LOG_SENSITIVE_ACTIONS=true
```

#### Logged Actions

**Authentication Events:**
- `login` - User login (success/failure)
- `logout` - User logout
- `session_timeout` - Session expired
- `mfa_enabled` - MFA setup completed
- `mfa_verified` - MFA verification successful

**Data Access Events:**
- `view_dashboard_v2` - Dashboard access
- `view_reviews` - Reviews page access
- `export_data` - Data export
- `bigquery_query` - BigQuery data access

**Administrative Events:**
- `user_created` - New user created
- `user_role_changed` - User role updated
- `app_attached` - App added to organization
- `app_detached` - App removed from organization
- `permission_changed` - Permission modified

#### Audit Log Implementation

```typescript
// Log audit event via Edge Function
await supabase.rpc('log_audit_event', {
  p_user_id: user.id,
  p_organization_id: orgId,
  p_user_email: user.email,
  p_action: 'view_dashboard_v2',
  p_resource_type: 'dashboard',
  p_resource_id: null,
  p_details: { filters: { dateRange, apps } },
  p_ip_address: request.headers.get('x-forwarded-for'),
  p_user_agent: request.headers.get('user-agent'),
  p_request_path: '/dashboard-v2',
  p_status: 'success'
});
```

#### Audit Log Verification

```sql
-- Verify audit logging is working
SELECT COUNT(*) as log_count, action, status
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action, status
ORDER BY log_count DESC;

-- Recent user activity
SELECT
  user_email,
  action,
  status,
  created_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;

-- Failed login attempts (security monitoring)
SELECT
  user_email,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE action = 'login'
  AND status = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 5
ORDER BY failed_attempts DESC;
```

#### Audit Compliance Checklist

- [ ] Audit logs enabled in production
- [ ] All critical actions logged (auth, data access, admin)
- [ ] 7-year retention policy configured
- [ ] Immutable logs (INSERT-only, no DELETE)
- [ ] Log queries performant (<500ms)
- [ ] Compliance exports available (CSV/JSON)
- [ ] Failed login monitoring active
- [ ] Super admin actions logged separately

---

### Row-Level Security (RLS)

#### RLS Verification Query

```sql
-- Verify RLS is enabled on all tenant-scoped tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'user_roles',
    'org_app_access',
    'agency_clients',
    'audit_logs',
    'mfa_enforcement'
  )
ORDER BY tablename;

-- Verify RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### RLS Test Cases

```sql
-- Test 1: Users can only see their own roles
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid';
SELECT * FROM user_roles;  -- Should only return current user's role

-- Test 2: Super admins can see all roles
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = 'super-admin-uuid';
SELECT * FROM user_roles;  -- Should return all roles

-- Test 3: Organization isolation
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid';
SELECT * FROM org_app_access;  -- Should only return user's org apps
```

#### RLS Deployment Checklist

- [ ] RLS enabled on all production tables
- [ ] Policies tested for each role (SUPER_ADMIN, ORG_ADMIN, etc.)
- [ ] Super admin escape hatch working (`sec.is_super_admin()`)
- [ ] Agency cross-tenant access working
- [ ] No data leakage between organizations
- [ ] RLS performance acceptable (<100ms overhead)

---

### Encryption

**Infrastructure:** Supabase AES-256 encryption at rest
**Transit:** TLS 1.3 for all connections

#### Encryption Verification

```bash
# Verify TLS configuration
curl -vI https://your-prod-project.supabase.co 2>&1 | grep -i 'tls\|ssl'

# Expected output: TLS 1.3, strong cipher suites
```

#### Encryption Checklist

- [ ] Database encrypted at rest (Supabase default)
- [ ] All API calls use HTTPS/TLS 1.3
- [ ] JWT tokens signed with HS256
- [ ] Sensitive environment variables encrypted
- [ ] No plaintext credentials in logs
- [ ] Backup encryption enabled

---

### CORS Configuration

```bash
# .env.production
# CORS Configuration (Supabase Dashboard → API Settings)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Edge Function CORS
CORS_ALLOW_ORIGIN=https://yourdomain.com
CORS_ALLOW_METHODS=GET,POST,OPTIONS
CORS_ALLOW_HEADERS=authorization,x-client-info,apikey,content-type
```

---

### Rate Limiting

**Default Supabase Limits:**
- Auth: 30 requests/hour per IP
- Database: 500 requests/second per project
- Edge Functions: 500 requests/second

**Custom Rate Limiting (if needed):**
```sql
-- Create rate limit tracking table
CREATE TABLE api_rate_limits (
  user_id UUID,
  endpoint TEXT,
  request_count INTEGER,
  window_start TIMESTAMPTZ,
  PRIMARY KEY (user_id, endpoint, window_start)
);
```

---

## Security Checklist

### Pre-Deployment Security
- [ ] All environment variables properly configured
- [ ] RLS policies tested and verified
- [ ] API keys rotated for production
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured
- [ ] Audit logging enabled

### Post-Deployment Verification
- [ ] Authentication flow tested
- [ ] Multi-tenant isolation verified
- [ ] API endpoints responding correctly
- [ ] Database connections stable
- [ ] SSL certificates valid
- [ ] Monitoring and alerting active

## Performance Optimization

### Frontend Optimizations
```bash
# Bundle size analysis
npm run build:analyze

# Performance testing
npm run test:performance
```

### Database Optimizations
```sql
-- Create necessary indexes
CREATE INDEX idx_aso_metrics_tenant_date 
ON aso_metrics(tenant_id, date);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM aso_metrics 
WHERE tenant_id = $1 AND date >= $2;
```

## Monitoring & Maintenance

### Health Checks
Set up monitoring for:
- **Application Uptime**: HTTP endpoint monitoring
- **Database Performance**: Query execution times
- **API Response Times**: Edge function performance
- **Error Rates**: Application and database errors

### Log Monitoring
```bash
# Monitor Edge Function logs
supabase functions logs app-store-scraper

# Monitor database logs
supabase logs db
```

### Backup Strategy
- **Database Backups**: Automated daily Supabase backups
- **Configuration Backups**: Version control for all config files
- **Media Assets**: Regular backup of uploaded files

## Rollback Procedures

### Application Rollback
1. **Identify Last Known Good Version**
2. **Revert to Previous Build**:
   ```bash
   # Using Lovable platform
   # Use the revert button in the interface
   
   # Manual rollback
   git revert <commit-hash>
   npm run build && deploy
   ```

### Database Rollback
```bash
# Restore from backup (if needed)
supabase db reset --db-url <backup-url>

# Or revert specific migration
supabase migration down <migration-name>
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### Authentication Issues
- Verify Supabase URL and keys
- Check CORS configuration
- Validate JWT token format

#### Database Connection Issues
- Verify connection string format
- Check network connectivity
- Validate RLS policies

#### Performance Issues
- Enable database query logging
- Monitor Edge function execution times
- Check bundle size and loading times

## Environment Management

### Development → Staging → Production
1. **Feature Development**: Local development environment
2. **Integration Testing**: Staging environment with production-like data
3. **Production Deployment**: Live environment with full monitoring

### Configuration Management
- Use environment-specific configuration files
- Implement feature flags for gradual rollouts
- Maintain separate Supabase projects per environment

## Support & Documentation

### Deployment Support
- Review Supabase documentation for platform-specific issues
- Check Lovable documentation for deployment features
- Monitor error logs and performance metrics

### Change Management
- Document all configuration changes
- Maintain deployment runbooks
- Test rollback procedures regularly