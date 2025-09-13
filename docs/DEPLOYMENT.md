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